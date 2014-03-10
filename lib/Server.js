var EventEmitter = require("events").EventEmitter;
var http         = require("http");
var https        = require("https");
var q            = require("q");
var utils        = require("./utils");

var ANY_PORT = 0;
var MAX_PORT = 65535;
var MIN_PORT = 1;

function getOption (name, defaultValue) {
	return name in this ? this[name] : defaultValue;
}

function invalidPort (port) {
	return port + " is not a valid port number.";
}

function Server (options, handler) {
	var server = utils.makeInstance(Server, this);
	var httpServer;

	function listening () {
		return httpServer && httpServer.address();
	}

	function protocol () {
		return options.certificate && options.key ? "https" : "http";
	}

	EventEmitter.call(server);
	if (typeof options === "function") {
		handler = options;
		options = {};
	}
	options = options || {};

	// Set default options if needed.
	options.autostart = getOption.call(options, "autostart", true);
	options.port      = getOption.call(options, "port", ANY_PORT);

	if (options.port !== ANY_PORT && options.port < MIN_PORT || options.port > MAX_PORT) {
		throw new Error(invalidPort(options.port));
	}

	if (protocol() === "http" && (options.certificate || options.key)) {
		throw new Error("Missing certificate or key.");
	}
	else if (protocol() === "https") {
		httpServer = https.createServer({ cert : options.certificate, key : options.key }, handler);
	}
	else {
		httpServer = http.createServer(handler);
	}

	Object.defineProperties(server, {

		port : {
			get : function () {
				return listening() ? httpServer.address().port : null;
			}
		},

		protocol : {
			get : function () {
				return listening() ? protocol() : null;
			}
		}

	});

	server.start = function (port, callback) {
		var started;

		if (arguments.length === 0 || typeof port === "function") {
			callback = port;
			port     = options.port;
		}

		if (listening()) {
			started = q.fcall(function () {
				throw new Error("Server is already listening.");
			});
		}
		else if (port !== ANY_PORT && port < MIN_PORT || port > MAX_PORT) {
			started = q.fcall(function () {
				throw new Error(invalidPort(port));
			});
		}
		else {
			if (!handler) {
				httpServer.on("request", server.emit.bind(server, "request"));
			}
			started = q.ninvoke(httpServer, "listen", port);
		}

		started = started.then(
			function () {
				server.emit("ready");
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

		if (listening()) {
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

	if (process.env.NODE_ENV !== "test" && options.autostart) {
		server.start();
	}

	return server;
}

Server.prototype = Object.create(EventEmitter.prototype);

module.exports = Server;
