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

### server.start([port], [callback])

 + **port** - _Optional_. The port that the server should listen on. If this
    is not provided, the default port is used (this is typically an arbitrary
    open port).
 + **callback** _Optional_. If provided, the callback will be called once the
    server is ready to accept requests. If an error occurs, it will be passed
    as the first argument to the callback.

Starts listening on a port. It is an error to try to start a server that is
already listening.

### server.stop([callback])

 + **callback** _Optional_. If provided, the callback will be called once the
    server has stopped listening for requests. If an error occurs, it will be
    passed as the first argument to the callback.

Stops listening for requests.

### server.url()

Returns the fully qualified URL of the application. An error will be thrown if
`server.url()` is called while the server is not listening.

[1]: http://nodejs.org/api/http.html#http_http_createserver_requestlistener "Node.JS HTTP Server"
[2]: http://expressjs.com/api.html#app.listen "Express app.listen()"
[3]: http://nodejs.org/api/https.html "Node.JS HTTPS Server"
