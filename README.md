doppio
======

Doppio is a small "server container" for Node.JS web applications that makes
managing the server process more convenient and testable.

## Basic Usage

    npm install doppio

Doppio works by wrapping your application with an [http server][1]. This is
basically what the [Express documentation][2] recommends for configuring an
application with HTTPS. Doppio just makes this process easier to manage and
test. In the simplest case you can wrap your app and the server will start
automatically:

    var doppio = require("doppio");
    
    var server = doppio({ port: 8080 }, app);

## Usage Details

### doppio([options], [handler])

 + **options** - _Optional_. Options to configure the server instance.
 + **handler** - _Optional_. The request handler for the server. This typically
    something like an Express `app`.

Creates a new server instance. By default, the server starts listening for
requests automatically. The following configuration options are available:

 + **autostart** - _Defaults to true_. If true, the server will start
    automatically unless NODE_ENV is 'test'.
 + **cert** - The contents of the public certificate to use for HTTPS. See the
    [Node HTTPS documentation][3] for more information.
 + **key** - The contents of the private key to use for HTTPS. See the
    [Node HTTPS documentation][3] for more information.
 + **hostname** - _Defaults to 'localhost'_. Sets the hostname that the server
    will be running at. This is used by `server.url()`.
 + **port** - _Defaults to 0_. The default port to use if a port is not provided
    to `server.start()`. If 0 is provided, an arbitrary open port will be
    assigned.
 + **scheme** - _Defaults to 'http'_. Must be either 'http' or 'https'. When
    running with 'https', a certifacate and key must also be specified.

### doppio.loadPlugin([id...])

 + **id** - _Optional_. One ore more module IDs of the plugins to load (Node.JS
    modules).

Loads plugins to process server configuration options. When multiple plugins
are loaded, they will be processed in the order specified. See the "Plugins"
section for more details.

### doppio.unloadPlugins()

Unloads all plugins restoring Doppio to the default behavior.

### server.start([port], [callback])

 + **port** - _Optional_. The port that the server should listen on. If this
    is not provided, the default port is used (this is typically an arbitrary
    open port).
 + **callback** _Optional_. If provided, the callback will be automatically
    subscribed to the `listening` and `error` events.

Starts listening on a port. It is an error to try to start a server that is
already listening. Returns a chainable reference to the server.

### server.stop([callback])

 + **callback** _Optional_. If provided, the callback will be automatically
    subscribed to the `stopped` and `error` events.

Stops listening for requests. Returns a chainable reference to the server.

### server.url([path])

 + **path** _Optional_. Resolve the given path against the server base URL and
    return the fully qualified URL.

Returns the fully qualified URL of the application. An error will be thrown if
`server.url()` is called while the server is not listening.

### Event: 'error'

    function (error) { }

Emitted when an error occurs with the server.

### Event: 'listening'

    function () { }

Emitted when the server is ready to process requests.

### Event: 'stopped'

    function () { }

Emitted when the server closes and finishes handling all requests.

## Plugins

Doppio plugins can be used to change how server options are handled. This can be
useful for things like adding runtime specific logic. A Doppio plugin is just a
Node module that exports a function that takes an options hash as its only
argument and returns a new options hash (see the `doppio()` section for more
info on the available options). Each time a new server instance is created, the
plugins are invoked in the order they were loaded in. Each plugin is passed the
options returned from the previous plugin as its argument. For example, the
default option logic is equivalent to the following plugin code:

    module.exports = function (options) {
        options           = options || {};
        options.autostart = "autostart" in options ? options.autostart : true;
        options.port      = "port" in options ? options.port : 0;
        options.scheme    = options.scheme || "http";
        return options;
    };

[1]: http://nodejs.org/api/http.html#http_http_createserver_requestlistener "Node.JS HTTP Server"
[2]: http://expressjs.com/api.html#app.listen "Express app.listen()"
[3]: http://nodejs.org/api/https.html "Node.JS HTTPS Server"
