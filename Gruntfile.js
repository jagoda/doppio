var path  = require("path");

function localCommand (command) {
	return path.join(__dirname, "node_modules", ".bin", command);
}

module.exports = function (grunt) {
	var sourceFiles = [ "*.js", "lib/**/*.js" ];
	var testFiles   = [ "test/**/*.js" ];
	var allFiles    = sourceFiles.concat(testFiles);

	grunt.initConfig({

		jscs : {
			files   : allFiles,
			options : {

				requireCurlyBraces : [
					"if", "else", "for", "while", "do", "try", "catch", "case",
					"default"
				],

				requireSpaceAfterKeywords : [
					"if", "else", "for", "while", "do", "switch", "return",
					"try", "catch"
				],

				requireParenthesesAroundIIFE : true,

				requireSpacesInFunctionExpression : {
					beforeOpeningRoundBrace : true,
					beforeOpeningCurlyBrace : true
				},

				disallowMultipleVarDecl           : true,
				disallowEmptyBlocks               : true,
				requireSpacesInsideObjectBrackets : "all",
				requireSpacesInsideArrayBrackets  : "all",
				disallowSpacesInsideParentheses   : true,
				disallowQuotedKeysInObjects       : "allButReserved",
				disallowDanglingUnderscores       : true,
				requireSpaceAfterObjectKeys       : true,
				requireCommaBeforeLineBreak       : true,
				requireAlignedObjectValues        : "skipWithLineBreak",

				requireOperatorBeforeLineBreak : [
					"?", "+", "-", "/", "*", "=", "==", "===", "!=", "!==", ">",
					">=", "<", "<="
				],

				disallowLeftStickedOperators : [
					"?", "+", "-", "/", "*", "=", "==", "===", "!=", "!==", ">",
					">=", "<", "<="
				],

				requireRightStickedOperators  : [ "!" ],

				disallowRightStickedOperators : [
					"?", "+", "/", "*", ":", "=", "==", "===", "!=", "!==", ">",
					">=", "<", "<="
				],

				requireLeftStickedOperators : [ "," ],

				disallowSpaceAfterPrefixUnaryOperators : [
					"++", "--", "+", "-", "~", "!"
				],

				disallowSpaceBeforePostfixUnaryOperators : [ "++", "--" ],

				requireSpaceBeforeBinaryOperators : [
					"+", "-", "/", "*", "=", "==", "===", "!=", "!=="
				],

				requireSpaceAfterBinaryOperators : [
					"+", "-", "/", "*", "=", "==", "===", "!=", "!=="
				],

				disallowImplicitTypeConversion : [
					"numeric", "boolean", "binary", "string"
				],

				disallowKeywords : [ "with" ],

				disallowMultipleLineStrings : true,
				disallowMultipleLineBreaks  : true,
				validateLineBreaks          : "LF",
				validateQuoteMarks          : "\"",
				validateIndentation         : "\t",
				disallowMixedSpacesAndTabs  : true,
				disallowTrailingWhitespace  : true,

				requireKeywordsOnNewLine : [ "else", "catch", "finally" ],

				maximumLineLength              : 120,
				requireCapitalizedConstructors : true,
				safeContextKeyword             : "self",
				requireDotNotation             : true,

				excludeFiles : [ "node_modules/**" ]

			}
		},

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
				maxlen        : 120,

				node : true,

				ignores : [ "node_modules/**/*.js" ]
			},

			src : sourceFiles,

			test : {
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
					test : testFiles
				}
			}
		}

	});

	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jscs-checker");

	grunt.registerTask("default", [ "lint", "style", "test", "coverage" ]);

	grunt.registerTask(
		"coverage",
		"Create a test coverage report.",
		function () {
			var done = this.async();

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
					cmd  : localCommand("istanbul"),
					opts : {
						stdio : "inherit"
					}
				},
				function (error) {
					if (error) {
						grunt.log.error("Some code is not covered.");
						return grunt.fail.fatal(error);
					}
					else {
						grunt.log.ok("All code has test coverage.");
						return done();
					}
				}
			);
		}
	);

	grunt.registerTask("lint", "Check for common code problems.", [ "jshint" ]);

	grunt.registerTask("style", "Check for style conformity.", [ "jscs" ]);

	grunt.registerTask("test", "Run the test suite.", function () {
		var done        = this.async();
		var environment = Object.create(process.env);
		var pattern     = environment.TEST_PATTERN || grunt.option("pattern");

		var parameters = [
			"cover", localCommand("_mocha"), "--", "--recursive",
			"--reporter", "spec"
		];

		if (pattern) {
			parameters.push("--grep", pattern);
		}
		parameters.push(path.join(__dirname, "test"));

		environment.NODE_ENV = "test";
		grunt.log.writeln("Invoking the mocha test suite...");
		grunt.util.spawn(
			{
				args : parameters,
				cmd  : localCommand("istanbul"),
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
