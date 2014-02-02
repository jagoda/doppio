var http = require("http");
var q    = require("q");

function promiseOrCallback (promise, callback) {
	if (callback) {
		promise.nodeify(callback);
	}
	return promise;
}

function Server () {
	var httpServer = http.createServer();
	var server     = Object.create(Server.prototype);

	server.start = function (callback) {
		return promiseOrCallback(
			q.ninvoke(httpServer, "listen", 0),
			callback
		);
	};

	server.stop = function (callback) {
		return promiseOrCallback(
			q.ninvoke(httpServer, "close"),
			callback
		);
	};

	return server;
}

module.exports = Server;
