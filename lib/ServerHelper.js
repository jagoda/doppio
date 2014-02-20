var url   = require("url");
var utils = require("./utils");

function ServerHelper (hostname, server) {
	var helper = utils.makeInstance(ServerHelper, this);

	if (arguments.length === 1) {
		server   = hostname;
		hostname = "localhost";
	}

	helper.url = function () {
		if (!server.port) {
			throw new Error("The server is not started.");
		}

		return url.format({
			protocol : "http",
			hostname : hostname,
			port     : server.port,
			path     : "/"
		});
	};

	return helper;
}

module.exports = ServerHelper;
