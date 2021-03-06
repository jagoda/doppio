var EventEmitter = require("events").EventEmitter,
    http         = require("http"),
    https        = require("https"),
    url          = require("url");

var plugins;

function defaultPlugin (options) {
    options.autostart = "autostart" in options ? options.autostart : true;
    options.hostname  = options.hostname || "localhost";
    options.path      = options.path || "/";
    options.port      = "port" in options ? options.port : 0;
    options.scheme    = options.scheme || "http";
    return options;
}

var createServer = function (options, handler) {
    
    var api = new EventEmitter(),
        ports, schemes, server;
    
    function emitError (error) {
        process.nextTick(function () {
            api.emit("error", error);
        });
    }
    
    function getPorts (descriptor) {
        var parsedDescriptor = Number(descriptor);
        
        if (! Number.isNaN(parsedDescriptor)) {
            descriptor = {
                private : parsedDescriptor,
                public  : parsedDescriptor
            };
        }
        
        return descriptor;
    }
    
    function createServer (options) {
        var validSchemes = [ "http", "https" ],
            server;
        
        schemes = getSchemes(options.scheme);
        if (
            validSchemes.indexOf(schemes.private) < 0 ||
            validSchemes.indexOf(schemes.public) < 0
        ) {
            throw new Error("Server scheme must be 'http' or 'https'.");
        }
        
        if (schemes.private === "https") {
            server = https.createServer(
                {
                    key  : options.key,
                    cert : options.cert
                },
                handler
            );
        }
        else {
            server = http.createServer(handler);
        }
        
        return server;
    }
    
    function getSchemes (descriptor) {
        if (
            (typeof descriptor === "string") ||
            (descriptor instanceof String)
        ) {
            descriptor = {
                private : String(descriptor),
                public  : String(descriptor)
            };
        }
        
        return descriptor;
    }
    
    function oneTimeCallback (callback, events) {
        function handler () {
            events.forEach(function (event) {
                api.removeListener(event, handler);
            });
            return callback.apply(this, arguments);
        }
        
        events.forEach(function (event) {
            api.once(event, handler);
        });
    }
    
    function started () {
        // Convert object to boolean.
        return !! server.address();
    }
    
    // Argument wrangling...
    if (typeof options === "function") {
        handler = options;
        options = null;
    }
    // Defensive copy to protect caller options object.
    options = Object.create(options || null);
    // Compute default argument values.
    plugins.concat(defaultPlugin).forEach(function (plugin) {
        options = plugin(options);
    });
    
    server = createServer(options);
    // Forward low-level errors.
    server.on("error", function (error) {
        api.emit("error", error);
    });
    
    api.server = function () {
        return Object.create(server);
    };
    
    api.start = function (port, callback) {
        if (typeof arguments[0] === "function") {
            callback = port;
            port     = options.port;
        }
        if (arguments.length === 0) {
            port = options.port;
        }
        
        if (typeof callback === "function") {
            oneTimeCallback(callback, [ "ready", "error" ]);
        }
        
        if (started()) {
            emitError(new Error(
                "Server cannot be started if already listening."
            ));
        }
        else {
            ports = getPorts(port);
            server.listen(ports.private, function () {
                api.emit("ready");
            });
        }
        
        return this;
    };
    
    api.stop = function (callback) {
        if (typeof callback === "function") {
            oneTimeCallback(callback, [ "stopped", "error" ]);
        }
        
        if (! started()) {
            emitError(new Error("Server cannot be stopped if not listening."));
        }
        else {
            server.close(function () {
                api.emit("stopped");
            });
        }
        
        return this;
    };
    
    api.url = function (path) {
        var serverUrl;
        
        if (! started()) {
            throw new Error(
                "Cannot compute server URL when the server is not listening."
            );
        }
        
        serverUrl = url.format({
            hostname : options.hostname,
            pathname : options.path,
            port     : ports.public || server.address().port,
            protocol : schemes.public
        });
        // Force the path to be relative and treat the configured base URL as
        // the root path (don't allow navigating above this).
        if (serverUrl[serverUrl.length - 1] !== "/") {
            serverUrl += "/";
        }
        path = url.resolve("/", path || "").substring(1);
        return url.resolve(serverUrl, path);
    };
    
    // Start by default if not in a test environment.
    if (options.autostart === true && process.env.NODE_ENV !== "test") {
        api.start();
    }
    
    return api;
    
};

createServer.loadPlugin = function () {
    var i;
    
    for (i = 0; i < arguments.length; i += 1) {
        plugins.push(module.parent.require(arguments[i]));
    }
};

createServer.unloadPlugins = function () {
    plugins = [];
};

createServer.unloadPlugins();
module.exports = createServer;
