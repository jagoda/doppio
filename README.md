doppio
======

[![Build Status](https://travis-ci.org/jagoda/doppio.png?branch=1.0)](https://travis-ci.org/jagoda/doppio)

Version 1.0 is under active development. For previous (stable) versions, see the
[master branch](https://github.com/jagoda/doppio/tree/master).

## Usage

	npm install doppio

	var doppio = require("doppio");
	var server = doppio(app);

## API Reference

### doppio([options])

 + **options** - _Optional_. Configuration options that modify the server
   behavior.

Available options are:
 + **autostart** - Indicates that the server should start automatically if the
   `NODE_ENV` environment variable is not set to "test". Defaults to `true`.
 + **port** - Specifies the port that the server should bind to if one is not
   specified during the call to `start`. A value of 0 will cause the server to
   bind to any available port. Defaults to 0.

Creates a new server instance.

### Server Instances

#### server.start([port], [callback])

 + **port** - _Optional_. Specifies the port that the server should bind to.
   A value of 0 will cause the server to bind to any available port. Defaults to
   0 or the value provided in the server config.
 + **callback** - _Optional_. If provided, the `callback` will be invoked with
   `(null, port)` or `(error)` if the server failed to start.

Causes the server to bind to a port and begin listening for requests. Returns a
promise that is fulfilled when the server is ready to accept requests.

#### server.stop([callback])

 + **callback** - _Optional_. If provided, the `callback` will be invoked with
   `(null)` or `(error)` if there was an error stopping the server.

Causes the server to stop listening for new requests. Returns a promise that is
fulfilled once the server has stopped accepting requsts.

#### Event 'ready'

	function (port) { }

Emitted once the server is ready to accept requests.

#### Event 'stopped'

	function () { }

Emitted once the server has stopped and completed all remaining requests.

#### Event 'error'

	function (error) { }

Emitted if an error occurs while attempting to start or stop the server.

[express]: http://expressjs.com/ "Express"
