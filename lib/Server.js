var EventEmitter = require("events").EventEmitter;
var http         = require("http");
var q            = require("q");
var utils        = require("./utils");

function Server () {
	var httpServer = http.createServer();
	var server     = utils.makeInstance(Server, this);

	EventEmitter.call(server);

	server.start = function (callback) {
		var started = q.ninvoke(httpServer, "listen", 0);

		started = started.then(function () {
			var port = httpServer.address().port;

			server.emit("ready", port);
			return port;
		});

		if (callback) {
			started.then(function (port) {
				callback(null, port);
			});
		}

		return started;
	};

	server.stop = function (callback) {
		var stopped = q.ninvoke(httpServer, "close");

		stopped.then(function () {
			server.emit("stopped");
		});

		if (callback) {
			stopped.then(function () {
				callback(null);
			});
		}

		return stopped;
	};

	return server;
}

Server.prototype = Object.create(EventEmitter.prototype);

module.exports = Server;
