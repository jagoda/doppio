var expect = require("chai").expect;
var q      = require("q");
var Server = require("../lib/Server");
var sinon  = require("sinon");

describe("A server", function () {

	var ANY_PORT = 0;
	var MAX_PORT = 65535;
	var MIN_PORT = 0;

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
		.then(function (port) {
			availablePort = port;
			return server.stop();
		})
		.then(function () {
			return availablePort;
		});
	}

	function validateErrorMessage (message) {
		return function (error) {
			expect(error, "error argument")
				.to.be.an.instanceOf(Error)
				.and.to.have.a.property("message", message);
		};
	}

	function validatePort (port, tag) {
		tag = tag || "assigned port";
		expect(port, tag)
			.to.be.a("number")
			.and.to.be.greaterThan(MIN_PORT);
	}

	describe("using the default configuration", function () {

		var server;

		beforeEach(function () {
			server = new Server();
		});

		afterEach(ensureStopped(function () { return server; }));

		it("can be started", function (done) {
			server.start()
			.then(validatePort)
			.nodeify(done);
		});

		it("fails to start if already listening", function (done) {
			server.start()
			.then(function () {
				return server.start();
			})
			.then(
				function () {
					throw new Error("Start should not succeed if already listeing.");
				},
				validateErrorMessage("Server is already listening.")
			)
			.nodeify(done);
		});

		it("can be stopped", function (done) {
			server.start()
			.then(function () {
				return server.stop();
			})
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
			function callback (error, port) {
				expect(error, "error argument").not.to.exist;
				validatePort(port, "port argument");
				done();
			}

			server.start(callback).done();
		});

		it("calls back with an error if the server fails to start", function (done) {
			function callback (error) {
				expect(error, "error argument").to.be.an.instanceOf(Error);
				done();
			}

			server.start()
			.then(function () {
				return server.start(callback);
			});
		});

		it("can callback when the server stops", function (done) {
			function callback (error) {
				expect(error, "error argument").not.to.exist;
				done();
			}

			server.start()
			.then(function () {
				return server.stop(callback);
			})
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
			server.on("ready", eventHandlerTest(validatePort, done));
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
			.then(function () {
				return server.stop();
			})
			.done();
		});

		it("emits the 'error' event if the server fails to stop", function (done) {
			var errorHandler = sinon.spy();

			server.on("error", errorHandler);

			server.start()
			.then(function () {
				return server.stop();
			})
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

			function start () {
				return server.start();
			}

			function stop (port) {
				ports.push(port);
				return server.stop();
			}

			// Run several iterations in order to minimize the probability that
			// we get the same port value by coincidence.
			for (i = 0; i < 10; i += 1) {
				promise = promise.then(start).then(stop);
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
			.then(function (port) {
				expect(port, "assigned port").to.equal(availablePort);
			})
			.nodeify(done);
		});

		it("can be explicitly started on a specified port with a callback", function (done) {
			var availablePort;

			function callback (error, port) {
				expect(error, "error argument").not.to.exist;
				expect(port, "assigned port").to.equal(availablePort);
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
			.then(function (port) {
				expect(port, "assigned port").to.equal(availablePort);
			})
			.nodeify(done);
		});

		it("cannot be started on an invalid port", function (done) {
			var illegalPort = MIN_PORT - 1;

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

	});

	it("can be configured with a default port", function (done) {
		var availablePort;
		var server;

		getAvailablePort().then(function (port) {
			availablePort = port;
			server        = new Server({ port : availablePort });
			return server.start();
		})
		.then(function (port) {
			expect(port, "assigned port").to.equal(availablePort);
		})
		.fin(function () {
			server.stop();
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
		.then(function (port) {
			expect(port, "assigned port").to.equal(availablePort);
		})
		.fin(function () {
			server.stop();
		})
		.nodeify(done);
	});

	it("cannot be configured with an invalid port", function () {
		var server;

		expect(function () {
			server = new Server({ port : MIN_PORT - 1 });
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
		.then(function (port) {
			expect(port, "assigned port")
				.to.be.greaterThan(MIN_PORT)
				.and.not.to.equal(availablePort);
		})
		.fin(function () {
			server.stop();
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
			server.on("ready", eventHandlerTest(validatePort, done));
		});

		it("can be configured to not start automatically", function (done) {
			server = new Server({ autostart : false });

			// Give the server a chance to autostart first. Afterwards when
			// `start()` is explicitly called, it should fail if the server
			// autostarted.
			q.ninvoke(process, "nextTick")
			.then(function () {
				return server.start();
			})
			.nodeify(done);
		});

	});

	it("can be configured for HTTPS communication");

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
