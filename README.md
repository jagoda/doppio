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

### doppio()

Creates a new server instance.

### Server Instances

#### server.start([callback])

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
