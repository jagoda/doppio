var http = require("http");
var q    = require("q");

function invokeMethod (object, method) {
	var parameters = Array.prototype.slice.call(arguments, 2);
	// Callback is always the last argument.
	var callback   = parameters.pop();
	var promise    = q.npost(object, method, parameters);

	if (callback) {
		promise.nodeify(callback);
	}

	return promise;
}

function Server () {
	var httpServer = http.createServer();
	var server     = Object.create(Server.prototype);

	server.start = function (callback) {
		return invokeMethod(httpServer, "listen", 0, callback);
	};

	server.stop = function (callback) {
		return invokeMethod(httpServer, "close", callback);
	};

	return server;
}

module.exports = Server;
