var expect       = require("chai").expect;
var http         = require("http");
var q            = require("q");
var request      = require("request");
var Server       = require("../lib/Server");
var ServerHelper = require("../lib/ServerHelper");
var sinon        = require("sinon");

describe("A server", function () {

	var ANY_PORT = 0;
	var MAX_PORT = 65535;
	var MIN_PORT = 1;

	function checkResponse (response, body) {
		expect(response.statusCode, "status code").to.equal(200);
		expect(body, "body").to.equal("hello");
	}

	function ensureStopped (server) {
		return function (done) {
			server().stop()
			.fail(function () { /* Ignore errors. */ })
			.nodeify(done);
		};
	}

	// Mocha seems to have a bug that causes unhandled exceptions in an event
	// handler to not be handled as test errors.
	function eventHandlerTest (test, done) {
		return function () {
			try {
				test.apply(null, arguments);
				done();
			}
			catch (error) {
				done(error);
			}
		};
	}

	function getAvailablePort () {
		var availablePort = ANY_PORT;
		var server = new Server();

		return server.start()
		.then(function () {
			availablePort = server.port;
			return server.stop();
		})
		.then(function () {
			return availablePort;
		});
	}

	function requestHandler (request, response) {
		response.writeHead(200);
		response.end("hello", "utf8");
	}

	function validateErrorMessage (message) {
		return function (error) {
			expect(error, "error argument")
			.to.be.an.instanceOf(Error)
			.and.to.have.a.property("message", message);
		};
	}

	function validListeningPort (tag) {
		tag = tag || "assigned port";

		expect(this.port, tag)
		.to.be.a("number")
		.and.to.be.at.least(MIN_PORT)
		.and.to.be.at.most(MAX_PORT);
	}

	function validStoppedPort (tag) {
		tag = tag || "stopped port";

		expect(this.port, tag).to.be.null;
	}

	describe("using the default configuration", function () {

		var server;

		beforeEach(function () {
			server = new Server();
		});

		afterEach(ensureStopped(function () { return server; }));

		it("has a read-only `port` property", function (done) {
			expect(server, "initial port").to.have.property("port", null);

			// Port value should be read-only.
			server.port = 42;
			expect(server.port, "read only port").to.be.null;

			server.start()
			.then(validListeningPort.bind(server))
			.then(server.stop.bind(server))
			.then(validStoppedPort.bind(server, "final port"))
			.nodeify(done);
		});

		it("has a read-only `protocol` property");

		it("can be started", function (done) {
			server.start()
			.then(validListeningPort.bind(server))
			.nodeify(done);
		});

		it("fails to start if already listening", function (done) {
			server.start()
			.then(server.start.bind(server))
			.then(
				function () {
					throw new Error("Start should not succeed if already listening.");
				},
				validateErrorMessage("Server is already listening.")
			)
			.nodeify(done);
		});

		it("can be stopped", function (done) {
			server.start()
			.then(server.stop.bind(server))
			.then(validStoppedPort.bind(server))
			.nodeify(done);
		});

		it("fails to stop if not listening", function (done) {
			server.stop()
			.then(
				function () {
					throw new Error("Stop should not succeed if not listening.");
				},
				validateErrorMessage("Server is not listening.")
			)
			.nodeify(done);
		});

		it("can callback when the server starts", function (done) {
			function callback (error) {
				expect(error, "error argument").not.to.exist;
				validListeningPort.call(server, "port argument");
				done();
			}

			server.start(callback).done();
		});

		it("calls back with an error if the server fails to start", function (done) {
			function callback (error) {
				expect(error, "error argument").to.be.an.instanceOf(Error);
				done();
			}

			server.start().then(server.start.bind(server, callback));
		});

		it("can callback when the server stops", function (done) {
			function callback (error) {
				expect(error, "error argument").not.to.exist;
				done();
			}

			server.start()
			.then(server.stop.bind(server, callback))
			.done();
		});

		it("calls back with an error if the server fails to stop", function (done) {
			function callback (error) {
				expect(error, "error argument").to.be.an.instanceOf(Error);
				done();
			}

			server.stop(callback);
		});

		it("emits the 'ready' event once it has started", function (done) {
			server.on("ready", eventHandlerTest(validListeningPort.bind(server), done));
			server.start().done();
		});

		it("emits the 'error' event if the server fails to start", function (done) {
			var errorHandler = sinon.spy();

			server.on("error", errorHandler);

			server.start()
			.then(function () {
				expect(errorHandler.called, "initially called").to.be.false;
				return server.start();
			})
			.fail(function (error) {
				if (error.message.indexOf("already listening") === -1) {
					throw error;
				}
				else {
					expect(errorHandler.calledOnce, "finally called").to.be.true;
					expect(errorHandler.args[0], "event arguments").to.have.length(1);
					expect(errorHandler.args[0][0], "error argument").to.be.an.instanceOf(Error);
				}
			})
			.nodeify(done);
		});

		it("emits the 'stopped' event after it has stopped", function (done) {
			server.on("stopped", done);

			server.start()
			.then(server.stop.bind(server))
			.done();
		});

		it("emits the 'error' event if the server fails to stop", function (done) {
			var errorHandler = sinon.spy();

			server.on("error", errorHandler);

			server.start()
			.then(server.stop.bind(server))
			.then(function () {
				expect(errorHandler.called, "initially called").to.be.false;
				return server.stop();
			})
			.fail(function (error) {
				if (error.message.indexOf("not listening") === -1) {
					throw error;
				}
				else {
					expect(errorHandler.calledOnce, "finally called").to.be.true;
					expect(errorHandler.args[0], "event arguments").to.have.length(1);
					expect(errorHandler.args[0][0], "error argument").to.be.an.instanceOf(Error);
				}
			})
			.nodeify(done);
		});

		it("binds to an arbitrary port", function (done) {
			var ports   = [];
			var promise = q();
			var i;

			function stop () {
				ports.push(server.port);
				return server.stop();
			}

			// Run several iterations in order to minimize the probability that
			// we get the same port value by coincidence.
			for (i = 0; i < 10; i += 1) {
				promise = promise.then(server.start.bind(server)).then(stop);
			}

			promise.then(function () {
				var arbitrary = false;

				ports.reduce(function (previous, current) {
					if (previous !== current) {
						arbitrary = true;
					}
					return current;
				});

				expect(arbitrary, "different ports").to.be.true;
			})
			.nodeify(done);
		});

		it("can be explicitly started on a specified port", function (done) {
			var availablePort;

			getAvailablePort().then(function (port) {
				availablePort = port;
				return server.start(availablePort);
			})
			.then(function () {
				expect(server.port, "assigned port").to.equal(availablePort);
			})
			.nodeify(done);
		});

		it("can be explicitly started on a specified port with a callback", function (done) {
			var availablePort;

			function callback (error) {
				expect(error, "error argument").not.to.exist;
				expect(server.port, "assigned port").to.equal(availablePort);
				done();
			}

			getAvailablePort().then(function (port) {
				availablePort = port;
				return server.start(availablePort, callback);
			});
		});

		it("accepts a string value for an explicit port specification", function (done) {
			var availablePort;

			getAvailablePort().then(function (port) {
				availablePort = port;
				return server.start(String(availablePort));
			})
			.then(function () {
				expect(server.port, "assigned port").to.equal(availablePort);
			})
			.nodeify(done);
		});

		it("cannot be started on an invalid port", function (done) {
			var illegalPort = MIN_PORT - 2;

			function expectFailure (errorCase) {
				return function () {
					throw new Error(errorCase + ": Start should not succeed with an invalid port number.");
				};
			}

			function validateError (error) {
				expect(error, "error type").to.be.an.instanceOf(Error);
				expect(error.message, "error message").to.contain("not a valid port");
			}

			server.start(illegalPort)
			.then(expectFailure("negative"), validateError)
			.then(function () {
				illegalPort = MAX_PORT + 1;
				return server.start(illegalPort);
			})
			.then(expectFailure("max"), validateError)
			.nodeify(done);
		});

		it("emits the `request` event when a request is received", function (done) {
			server.on("request", function (request, response) {
				expect(request).to.be.an.instanceOf(http.IncomingMessage);
				expect(response).to.be.an.instanceOf(http.ServerResponse);
				response.end("OK");
			});

			server.start()
			.then(function () {
				return q.nfcall(request, new ServerHelper(server).url());
			})
			.nodeify(done);
		});

	});

	it("can be configured with a default port", function (done) {
		var availablePort;
		var server;

		getAvailablePort().then(function (port) {
			availablePort = port;
			server        = new Server({ port : availablePort });
			return server.start();
		})
		.then(function () {
			expect(server.port, "assigned port").to.equal(availablePort);
		})
		.fin(function () {
			return server.stop();
		})
		.nodeify(done);
	});

	it("understands a string value for the port configuration", function (done) {
		var availablePort;
		var server;

		getAvailablePort().then(function (port) {
			availablePort = port;
			server        = new Server({ port : String(availablePort) });
			return server.start();
		})
		.then(function () {
			expect(server.port, "assigned port").to.equal(availablePort);
		})
		.fin(function () {
			return server.stop();
		})
		.nodeify(done);
	});

	it("cannot be configured with an invalid port", function () {
		var server;

		expect(function () {
			server = new Server({ port : MIN_PORT - 2 });
		}, "negative").to.throw(/not a valid port/);

		expect(function () {
			server = new Server({ port : MAX_PORT + 1 });
		}, "max").to.throw(/not a valid port/);
	});

	it("can be explicitly started on an arbitrary port", function (done) {
		var availablePort;
		var server;

		getAvailablePort().then(function (port) {
			availablePort = port;
			server        = new Server({ port : availablePort });
			return server.start(ANY_PORT);
		})
		.then(function () {
			expect(server.port, "assigned port")
			.to.be.greaterThan(MIN_PORT)
			.and.not.to.equal(availablePort);
		})
		.fin(function () {
			return server.stop();
		})
		.nodeify(done);
	});

	describe("in a non-test environment", function () {

		var NODE_ENV;
		var server;

		before(function () {
			NODE_ENV = process.env.NODE_ENV;
			delete process.env.NODE_ENV;
		});

		after(function () {
			process.env.NODE_ENV = NODE_ENV;
		});

		afterEach(ensureStopped(function () { return server; }));

		it("starts by default", function (done) {
			server = new Server();

			server.on("error", done);
			server.on("ready", eventHandlerTest(validListeningPort.bind(server), done));
		});

		it("can be configured to not start automatically", function (done) {
			server = new Server({ autostart : false });

			// Give the server a chance to autostart first. Afterwards when
			// `start()` is explicitly called, it should fail if the server
			// autostarted.
			q.ninvoke(process, "nextTick")
			.then(server.start.bind(server))
			.nodeify(done);
		});

	});

	describe("with a handler", function () {

		var helper;
		var server;

		before(function () {
			server = new Server(requestHandler);
			helper = new ServerHelper(server);
		});

		it("responds to requests when started", function (done) {
			server.start()
			.then(function () {
				return q.nfcall(request, helper.url());
			})
			.spread(checkResponse)
			.fin(server.stop.bind(server))
			.nodeify(done);
		});

		it("does not respond when stopped", function (done) {
			var url;

			server.start()
			.then(function () {
				url = helper.url();
				return server.stop();
			})
			.then(function () {
				return q.nfcall(request, url);
			})
			.then(
				function () {
					throw new Error("Server should not respond when stopped.");
				},
				function (error) {
					expect(error, "argument type").to.be.an.instanceof(Error);
					expect(error.message, "error message").to.match(/connect/);
				}
			)
			.nodeify(done);
		});

		it("does not emit the `request` event when a request is received", function (done) {
			var spy = sinon.spy();

			server.on("request", spy);

			server.start()
			.then(function () {
				return q.nfcall(request, helper.url());
			})
			.then(function () {
				expect(spy.called).to.be.false;
			})
			.fin(server.stop.bind(server))
			.nodeify(done);
		});

	});

	describe("with a handler and options", function () {

		var helper;
		var server;

		before(function (done) {
			server = new Server({ autostart : false }, requestHandler);
			helper = new ServerHelper(server);

			server.start().nodeify(done);
		});

		after(function (done) {
			server.stop().nodeify(done);
		});

		it("responds to requests", function (done) {
			q.nfcall(request, helper.url())
			.spread(checkResponse)
			.nodeify(done);
		});

	});

	describe("configured with a certificate and key", function () {

		it("uses the 'https' protocol");

		it("encrypts responses");

	});

	it("cannot be created with a bad HTTPS configuration");

	describe("facade", function () {

		it("is a proper Node HTTP Server instance");

		it("cannot change the underlying server behavior");

		it("is compatible with Socket.IO");

	});

	describe("plugin", function () {

		it("can modify the default configuration options");

		it("can override user-supplied configuration options");

		it("can be chained with other plugins");

		it("does not modify the caller options");

	});

	it("can load plugins");

});
