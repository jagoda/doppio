var expect = require("chai").expect;
var Server = require("../lib/Server");

describe("A server", function () {

	describe("using the default configuration", function () {

		var server;

		function expectSuccess (callback) {
			return function (error) {
				expect(error, "error argument").not.to.exist;
				callback();
			};
		}

		beforeEach(function () {
			server = new Server();
		});

		afterEach(function (done) {
			server
				.stop()
				.fail(function () { /* Ignore errors. */ })
				.nodeify(done);
		});

		it("can be started", function (done) {
			server.start().nodeify(done);
		});

		it("can be stopped", function (done) {
			var stop = server.stop.bind(server);

			server.start().then(stop).nodeify(done);
		});

		it("can callback when the server starts", function (done) {
			server.start(expectSuccess(done));
		});

		it("can callback when the server stops", function (done) {
			var stop = server.stop.bind(server, expectSuccess(done));

			server.start().then(stop);
		});

		it("emits the 'ready' event once it has started", function (done) {
			server.once("ready", done);
			server.start();
		});

		it("emits the 'stopped' event after it has stopped", function (done) {
			var stop = server.stop.bind(server);

			server.once("stopped", done);
			server.start().then(stop);
		});

	});

	it("cannot be started if already listening");

	it("cannot be stopped if not listening");

	it("can start and stop in the background");

	it("can return the bound port");

	it("fails to return the port if it is not listening");

	it("binds to an arbitrary port by default");

	it("can be configured with a default port");

	it("understands a string value for the port configuration");

	it("cannot be configured with an invalid port");

	it("can be explicitly started on a specified port");

	it("understands a string value when explicitly starting on a port");

	it("can be explicitly started on an arbitrary port");

	it("cannot be started on an invalid port");

	it("can render a base URL given a hostname");

	it("fails to render a base URL if no hostname is specified");

	it("can resolve a URL relative to the server base");

	it("starts by default if not in a test environment");

	it("can be configured to not start automatically");

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
