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
        wait = 500,
        testServer;
    
    afterEach(function (done) {
        try {
            testServer.removeAllListeners();
            testServer.stop().once("stopped", done);
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
                    testServer.start(12345, next);
                },
                function (next) {
                    expect(testServer.url()).to.equal("http://localhost:12345");
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
                    
                    expect(url).to.equal("http://localhost:12345");
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
                    
                    expect(url).to.match(/^http:\/\/localhost/);
                    expect(url).to.not.equal("http://localhost:12345");
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
                    
                    expect(url).not.to.equal("http://localhost:8080");
                    expect(url).to.match(/^http:\/\/localhost:/);
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
                    
                    expect(url).to.equal("http://localhost:12345");
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
                    
                    expect(url).to.equal("http://localhost:54321");
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
                    testServer.start(12345, next);
                },
                function (next) {
                    expect(testServer.url()).to.equal("http://foo:12345");
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
    
});
