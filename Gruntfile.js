var path  = require("path");

module.exports = function (grunt) {
    
    grunt.initConfig({
        jshint : {
            options : {
                bitwise       : true,
                camelcase     : true,
                curly         : true,
                eqeqeq        : true,
                es3           : false,
                forin         : false,
                immed         : true,
                indent        : 4,
                latedef       : true,
                newcap        : true,
                noarg         : true,
                noempty       : true,
                nonew         : true,
                plusplus      : true,
                quotmark      : "double",
                undef         : true,
                unused        : true,
                strict        : false,
                trailing      : true,
                maxparams     : 3,
                maxdepth      : 3,
                maxstatements : false,
                maxlen        : 80,
                
                node : true,
                
                ignores : [ "node_modules/**/*.js" ]
            },
            
            src : [ "*.js", "lib/**/*.js" ],
            
            testOverrides : {
                options : {
                    expr : true,
                    
                    globals : {
                        after      : false,
                        before     : false,
                        afterEach  : false,
                        beforeEach : false,
                        describe   : false,
                        it         : false
                    }
                },
                
                files : {
                    test : [ "test/**/*.js" ]
                }
            }
        }
    });
    
    grunt.loadNpmTasks("grunt-contrib-jshint");
    
    grunt.registerTask("default", [ "lint", "test", "coverage" ]);
    
    grunt.registerTask(
        "coverage",
        "Create a test coverage report.",
        function () {
            var done = this.async();
            
            var tasks = [
                    function (next) {
                        grunt.log.writeln("Generating coverage report...");
                        grunt.util.spawn(
                            {
                                args : [ "report", "html" ],
                                cmd  : "istanbul",
                                opts : { stdio: "inherit" }
                            },
                            next
                        );
                    },
                    function (next) {
                        grunt.log.writeln(
                            "Checking test coverage thresholds..."
                        );
                        grunt.util.spawn(
                            {
                                args : [
                                    "check-coverage", "--statements", "100",
                                    "--functions", "100", "--branches", "100",
                                    "--lines", "100"
                                ],
                                cmd  : "istanbul",
                                opts : { stdio: "inherit" }
                            },
                            next
                        );
                    }
                ];
                
            (function next (error) {
                var task = tasks.shift();
                
                if (!error && task) {
                    return task(next);
                }
                else if (error) {
                    grunt.log.error("Some code is not covered.");
                    return grunt.fail.fatal(error);
                }
                else {
                    grunt.log.ok("All code has test coverage.");
                    return done();
                }
            })();
        }
    );
    
    grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);
    
    grunt.registerTask("test", "Run the test suite.", function () {
        var done         = this.async(),
            environment  = Object.create(process.env);
        
        environment.NODE_ENV = "test";
        grunt.log.writeln("Invoking the mocha test suite...");
        grunt.util.spawn(
            {
                args : [
                    "cover", "_mocha", "--", "--recursive", "--reporter",
                    "spec", path.join(__dirname, "test")
                ],
                cmd  : "istanbul",
                opts : {
                    env   : environment,
                    stdio : "inherit"
                }
            },
            function (error) {
                if (error) {
                    grunt.log.error("Some tests failed.");
                    grunt.fail.fatal(error);
                }
                else {
                    grunt.log.ok("All tests passed.");
                }
                done();
            }
        );
    });
    
};
