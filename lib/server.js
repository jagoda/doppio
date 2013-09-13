var http         = require("http"),
    https        = require("https"),
    url          = require("url");

module.exports = function (options, handler) {
    
    var api = Object.create(null),
        server;
    
    function started () {
        // Convert object to boolean.
        return !! server.address();
    }
    
    // Argument wrangling...
    if (typeof options === "function") {
        handler = options;
        options = {};
    }
    // Default argument values.
    options           = options || {};
    options.autostart = "autostart" in options ? options.autostart : true;
    options.port      = "port" in options ? options.port : 0;
    options.scheme    = options.scheme || "http";
    
    if (options.scheme === "https") {
        server = https.createServer(
            {
                key  : options.key,
                cert : options.cert
            },
            handler
        );
    }
    else if (options.scheme === "http") {
        server = http.createServer(handler);
    }
    else {
        throw new Error("Server scheme must be 'http' or 'https'.");
    }
    
    api.start = function (port, callback) {
        if (typeof arguments[0] === "function") {
            callback = port;
            port     = options.port;
        }
        if (arguments.length === 0) {
            port = options.port;
        }
        
        if (started()) {
            return callback(new Error(
                "Server cannot be started if already listening."
            ));
        }
        
        return server.listen(port, callback);
    };
    
    api.stop = function (callback) {
        if (! started()) {
            return callback(new Error(
                "Server cannot be stopped if not listening."
            ));
        }
        
        return server.close(callback);
    };
    
    api.url = function () {
        if (! started()) {
            throw new Error(
                "Cannot compute server URL when the server is not listening."
            );
        }
        
        return url.format({
            hostname : options.hostname || "localhost",
            port     : server.address().port,
            protocol : options.scheme
        });
    };
    
    // Start by default if not in a test environment.
    if (options.autostart === true && process.env.NODE_ENV !== "test") {
        api.start();
    }
    
    return api;
    
};
