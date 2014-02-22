var expect       = require("chai").expect;
var Server       = require("../lib/Server");
var ServerHelper = require("../lib/ServerHelper");
var url          = require("url");

describe("A server helper", function () {

	var HOSTNAME = "localhost";

	var server;

	before(function () {
		server = new Server();
	});

	describe("using the default options", function () {

		var helper;

		before(function (done) {
			helper = new ServerHelper(server);
			server.start().nodeify(done);
		});

		after(function (done) {
			server.stop().nodeify(done);
		});

		it("uses 'localhost' as the hostname", function () {
			var parts = url.parse(helper.url());

			expect(parts.hostname, "default hostname").to.equal("localhost");
		});

	});

	describe("configured with a hostname", function () {

		var helper;

		before(function () {
			helper = new ServerHelper(HOSTNAME, server);
		});

		describe("with the server started", function () {

			before(function (done) {
				server.start().nodeify(done);
			});

			after(function (done) {
				server.stop().nodeify(done);
			});

			it("generates a server URL", function () {
				expect(helper.url(), "server url").to.match(/^http:\/\/localhost:\d{1,5}\/?$/);
			});

		});

		describe("with the server stopped", function () {

			it("fails to generate a server URL", function () {
				expect(function () {
					helper.url();
				}).to.throw(/not started/);
			});

		});

	});

});
