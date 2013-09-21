var async  = require("async"),
    expect = require("chai").expect,
    fs     = require("fs"),
    http   = require("http"),
    https  = require("https"),
    path   = require("path"),
    // The server should be the top-level moudle.
    server = require(".."),
    url    = require("url");

describe("A server", function () {
    
    function forwardError (next) {
        return function (error) {
            return next(null, error);
        };
    }
    
    function get (requestUrl, callback) {
        var buffer  = [],
            options = url.parse(requestUrl),
            client, request;
        
        options.rejectUnauthorized = false;
        client  = options.protocol === "https:" ? https : http;
        request = client.get(
                options,
                function (response) {
                    expect(response.statusCode).to.equal(200);
                    response.setEncoding("utf-8");
                    response.on("data", function (data) {
                        buffer.push(data);
                        return;
                    });
                    response.on("end", function () {
                        expect(buffer.join("")).to.equal("okay");
                        return callback();
                    });
                }
            );
            
        request.once("error", function (error) {
            return callback(error);
        });
    }
    
    function testHandler (request, response) {
        response.writeHead(200, { "Content-Type": "text/plain" });
        response.end("okay");
    }
    
    var testCertificate = fs.readFileSync(
            path.join(__dirname, "data", "test.crt")
        ),
        testKey = fs.readFileSync(
            path.join(__dirname, "data", "test.key")
        ),
        urlPattern = /http:\/\/localhost:\d{1,5}\//,
        wait       = 500,
        testServer;
    
    beforeEach(function () {
        testServer = null;
    });
    
    afterEach(function (done) {
        try {
            testServer.removeAllListeners();
            testServer.stop()
                .once("stopped", done)
                .once("error", function () {
                    // Ignore errors calling the 'stop' method.
                    return done();
                });
        } catch (error) {
            // Ignore errors calling the 'stop' method.
            return done();
        }
    });
    
    it("knows it's own base URL", function (done) {
        testServer = server();
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    expect(testServer.url()).to.match(urlPattern);
                    return next();
                }
            ],
            done
        );
    });
    
    it("can resolve a URL relative to the server base", function (done) {
        var pattern = /http:\/\/localhost:\d{1,5}\/some\/path/;
        
        testServer = server();
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    expect(testServer.url("/some/path")).to.match(pattern);
                    expect(testServer.url("some/path")).to.match(pattern);
                    expect(testServer.url("../some/path")).to.match(pattern);
                    return next();
                }
            ],
            done
        );
    });
    
    it("can be started and stopped", function (done) {
        function assertServerIsStopped (callback) {
            get("http://localhost:12345", function (error) {
                // Check for error but hide it from async.
                expect(error).to.be.ok;
                return callback();
            });
        }
        
        testServer = server(testHandler);
        
        async.waterfall(
            [
                assertServerIsStopped,
                function (next) {
                    testServer.start(12345, next);
                },
                function (next) {
                    get(testServer.url(), next);
                },
                function (next) {
                    testServer.stop(next);
                },
                assertServerIsStopped
            ],
            done
        );
    });
    
    it("can start and stop in the background", function (done) {
        testServer = server(testHandler);
        
        async.waterfall(
            [
                // Bind to arbitrary port in the background.
                function (next) {
                    testServer.start().once("ready", next);
                },
                function (next) {
                    get(testServer.url(), next);
                },
                function (next) {
                    testServer.stop().once("stopped", next);
                },
                // Bind to specific port in the background.
                function (next) {
                    testServer.start(12345).once("ready", next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).to.equal("http://localhost:12345/");
                    get(url, next);
                }
            ],
            done
        );
    });
    
    it("can bind to an arbitrary port", function (done) {
        testServer = server(testHandler);
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).to.match(urlPattern);
                    expect(url).to.not.equal("http://localhost:12345/");
                    get(url, next);
                }
            ],
            done
        );
    });
    
    it("can override the default port to pick an open port", function (done) {
        testServer = server({ port: 8080 }, testHandler);
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(0, next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).not.to.equal("http://localhost:8080/");
                    expect(url).to.match(urlPattern);
                    get(url, next);
                }
            ],
            done
        );
    });
    
    it("can be configured with a default port", function (done) {
        testServer = server({ port: 12345 }, testHandler);
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).to.equal("http://localhost:12345/");
                    get(url, next);
                },
                function (next) {
                    testServer.stop(next);
                },
                function (next) {
                    testServer.start(54321, next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).to.equal("http://localhost:54321/");
                    get(url, next);
                }
            ],
            done
        );
    });
    
    it("can use a customized hostname", function (done) {
        testServer = server({ hostname: "foo" }, testHandler);
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    expect(testServer.url()).to.match(
                        /http:\/\/foo:\d{1,5}\//
                    );
                    return next();
                }
            ],
            done
        );
    });
    
    it("can use the 'https' scheme", function (done) {
        testServer = server(
            {
                cert   : testCertificate,
                key    : testKey,
                scheme : "https"
            },
            testHandler
        );
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    var url = testServer.url();
                    
                    expect(url).to.match(/^https:\/\//);
                    get(url, next);
                }
            ],
            done
        );
    });
    
    it("must use either the 'http' or 'https' scheme", function () {
        expect(server({ scheme: "http" })).to.be.ok;
        expect(server({
            cert   : testCertificate,
            key    : testKey,
            scheme : "https"
        })).to.be.ok;
        expect(function () {
            server({ scheme: "ftp" });
        }).to.throw("scheme must be 'http' or 'https'");
    });
    
    it("cannot compute its base URL if it is not listening", function (done) {
        testServer = server();
        
        function checkError () {
            expect(function () {
                testServer.url();
            }).to.throw("server is not listening");
        }
        
        checkError();
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    expect(testServer.url()).to.be.ok;
                    testServer.stop(next);
                },
                function (next) {
                    checkError();
                    return next();
                }
            ],
            done
        );
    });
    
    it("starts by default if not in a test environment", function (done) {
        var nodeEnv = process.env.NODE_ENV,
            url     = "http://localhost:12345";
        
        async.waterfall(
            [
                function (next) {
                    process.env.NODE_ENV = "test";
                    testServer           = server({ port: 12345 }, testHandler);
                    setTimeout(next, wait);
                },
                function (next) {
                    get(url, forwardError(next));
                },
                function (error, next) {
                    expect(error).to.be.ok;
                    process.env.NODE_ENV = "production";
                    testServer           = server({ port: 12345 }, testHandler);
                    testServer.once("ready", next);
                },
                function (next) {
                    get(url, next);
                }
            ],
            function (error) {
                // Need to always reset the environment.
                process.env.NODE_ENV = nodeEnv;
                done(error);
            }
        );
    });
    
    it("can be configured to not start automatically", function (done) {
        var nodeEnv = process.env.NODE_ENV,
            url     = "http://localhost:12345";
        
        async.waterfall(
            [
                function (next) {
                    process.env.NODE_ENV = "production";
                    testServer           = server(
                        {
                            autostart : false,
                            port      : 12345
                        },
                        testHandler
                    );
                    setTimeout(next, wait);
                },
                function (next) {
                    get(url, forwardError(next));
                },
                function (error, next) {
                    expect(error).to.be.ok;
                    return next();
                }
            ],
            function (error) {
                // Need to always reset the environment.
                process.env.NODE_ENV = nodeEnv;
                done(error);
            }
        );
    });
    
    it("cannot be started if already listening", function (done) {
        testServer = server(testHandler);
        
        async.waterfall(
            [
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    testServer.start(forwardError(next));
                },
                function (error, next) {
                    expect(error).to.be.ok;
                    expect(error.message).to.contain("already listening");
                    get(testServer.url(), next);
                }
            ],
            done
        );
    });
    
    it("cannot be stopped if not listening", function (done) {
        function checkError (error, next) {
            expect(error).to.be.ok;
            expect(error.message).to.contain("not listening");
            return next();
        }
        
        testServer = server();
        async.waterfall(
            [
                function (next) {
                    testServer.stop(forwardError(next));
                },
                checkError,
                function (next) {
                    testServer.start(next);
                },
                function (next) {
                    testServer.stop(next);
                },
                function (next) {
                    testServer.stop(forwardError(next));
                },
                checkError
            ],
            done
        );
    });
    
    it("emits an 'error' event if API problems occur", function (done) {
        testServer = server();
        
        testServer.stop().on("error", function (error) {
            expect(error).to.be.an.instanceOf(Error);
            return done();
        });
    });
    
    it("emits an 'error' event if server errors occur", function (done) {
        var port = 12345;
        
        var server1 = server(),
            server2 = server();
        
        async.waterfall(
            [
                function (next) {
                    server1.start(port).on("ready", next);
                },
                function (next) {
                    // Error occurs because two servers try to bind to the same
                    // port.
                    server2.once("error", forwardError(next));
                    server2.start(port);
                    // Should stop the first server no matter what. Second
                    // server should never be listening since the port is
                    // already in use.
                    server1.stop();
                },
                function (error, next) {
                    expect(error).to.be.an.instanceOf(Error);
                    expect(error.message).to.contain("EADDRINUSE");
                    return next();
                }
            ],
            done
        );
    });
    
    describe("exposes a Node HTTP API that", function () {
        
        it("is a proper Node Server API instance", function () {
            testServer = server();
            expect(testServer.server()).to.be.an.instanceOf(http.Server);
        });
        
        it("cannot change the underlying server behavior", function (done) {
            testServer = server();
            testServer.server().listen = function () {
                throw new Error("bomb");
            };
            testServer.start(done);
        });
        
        it("is compatible with Socket.IO", function (done) {
            testServer = server();
            
            async.waterfall(
                [
                    function (next) {
                        testServer.start(next);
                    },
                    function (next) {
                        var ioClient, ioServer;
                        
                        ioServer = require("socket.io")
                            .listen(testServer.server(), { "log level": 0 });
                        ioClient = require("socket.io-client")
                            .connect(testServer.url());
                        
                        ioClient.on("connect", function () {
                            ioClient.on("ping", function () {
                                ioClient.emit("pong");
                                ioClient.disconnect();
                            });
                        });
                        
                        ioServer.sockets.on("connection", function (socket) {
                            socket.emit("ping");
                            socket.on("pong", next);
                        });
                    }
                ],
                done
            );
        });
        
    });
    
    describe("plugin", function () {
        
        var server    = require(".."),
            serverUrl = "https://foo:12345/";
        
        afterEach(function () {
            server.unloadPlugins();
        });
        
        it("can set the default options", function (done) {
            var nodeEnv = process.env.NODE_ENV;
            
            server.loadPlugin("../test/data/test-plugin");
            async.waterfall(
                [
                    function (next) {
                        process.env.NODE_ENV = "production";
                        testServer = server();
                        // Wait to see if server will autostart.
                        setTimeout(next, wait);
                    },
                    function (next) {
                        // If server autostarted this will errback.
                        testServer.start(next);
                    },
                    function (next) {
                        expect(testServer.url()).to.equal(serverUrl);
                        testServer.stop(next);
                    },
                    // Test a second time in order to have more confidence that
                    // we didn't just get lucky with the port.
                    function (next) {
                        testServer.start(next);
                    },
                    function (next) {
                        expect(testServer.url()).to.equal(serverUrl);
                        return next();
                    }
                ],
                function (error) {
                    // Need to always reset the node environment.
                    process.env.NODE_ENV = nodeEnv;
                    return done(error);
                }
            );
        });
        
        it("can override user-supplied configuration options", function (done) {
            server.loadPlugin("../test/data/test-plugin");
            async.waterfall(
                [
                    function (next) {
                        testServer = server({ port: 54321 });
                        testServer.start(next);
                    },
                    function (next) {
                        expect(testServer.url()).to.equal(serverUrl);
                        return next();
                    }
                ],
                done
            );
        });
        
        it("can be chained with other plugins", function (done) {
            server.loadPlugin("../test/data/test-plugin");
            server.loadPlugin("../test/data/increment-port-plugin");
            async.waterfall(
                [
                    function (next) {
                        testServer = server();
                        testServer.start(next);
                    },
                    function (next) {
                        expect(testServer.url()).to.equal("https://foo:12346/");
                        return next();
                    }
                ],
                done
            );
        });
        
        it("can be loaded simultaneously with other plugins", function (done) {
            server.loadPlugin(
                "../test/data/test-plugin",
                "../test/data/increment-port-plugin"
            );
            async.waterfall(
                [
                    function (next) {
                        testServer = server();
                        testServer.start(next);
                    },
                    function (next) {
                        expect(testServer.url()).to.equal("https://foo:12346/");
                        return next();
                    }
                ],
                done
            );
        });
        
    });
    
});
