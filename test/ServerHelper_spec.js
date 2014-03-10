var expect       = require("chai").expect;
var fs           = require("q-io/fs");
var path         = require("path");
var q            = require("q");
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

	describe("bound to a secure server", function () {

		var server;
		var helper;

		before(function (done) {
			var certificate = path.join(__dirname, "test.crt");
			var key         = path.join(__dirname, "test.key");

			q.all([ fs.read(certificate), fs.read(key) ])
			.spread(function (certificate, key) {
				server = new Server({ certificate : certificate, key : key });
				helper = new ServerHelper(server);
				return server.start();
			})
			.nodeify(done);
		});

		after(function (done) {
			server.stop().nodeify(done);
		});

		it("generates a secure URL", function () {
			expect(helper.url(), "server url").to.match(/https:\/\/localhost:\d{1,5}\/?$/);
		});

	});

});
