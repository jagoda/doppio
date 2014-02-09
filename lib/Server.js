var EventEmitter = require("events").EventEmitter;
var http         = require("http");
var q            = require("q");
var utils        = require("./utils");

function Server () {
	var httpServer = http.createServer();
	var server     = utils.makeInstance(Server, this);

	EventEmitter.call(server);

	server.start = function (port, callback) {
		var started;

		if (typeof port === "function") {
			callback = port;
			port     = 0;
		}

		if (httpServer.address()) {
			started = q.fcall(function () {
				throw new Error("Server is already listening.");
			});
		}
		else if (port < 0 || port > 65535) {
			started = q.fcall(function () {
				throw new Error(port + " is not a valid port number.");
			});
		}
		else {
			started = q.ninvoke(httpServer, "listen", port);
		}

		started = started.then(
			function () {
				var port = httpServer.address().port;

				server.emit("ready", port);
				return port;
			},
			function (error) {
				server.emit("error", error);
				throw error;
			}
		);

		if (callback) {
			started.nodeify(callback);
		}

		return started;
	};

	server.stop = function (callback) {
		var stopped;

		if (httpServer.address()) {
			stopped = q.ninvoke(httpServer, "close");
		}
		else {
			stopped = q.fcall(function () {
				throw new Error("Server is not listening.");
			});
		}

		stopped.then(
			function () {
				server.emit("stopped");
			},
			function (error) {
				server.emit("error", error);
			}
		);

		if (callback) {
			stopped.nodeify(callback);
		}

		return stopped;
	};

	return server;
}

Server.prototype = Object.create(EventEmitter.prototype);

module.exports = Server;
