var EventEmitter = require("events").EventEmitter;
var http         = require("http");
var utils        = require("./utils");
var Wrapper      = require("./Wrapper");

function Server () {
	var httpServer = http.createServer();
	var server     = utils.makeInstance(Server, this);

	EventEmitter.call(server);

	server.start = new Wrapper(httpServer, "listen", server)
		.event("ready")
		.parameters(0)
		.method();

	server.stop = new Wrapper(httpServer, "close", server)
		.event("stopped")
		.method();

	return server;
}

Server.prototype = Object.create(EventEmitter.prototype);

module.exports = Server;
