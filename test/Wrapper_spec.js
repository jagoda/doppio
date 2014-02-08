var EventEmitter = require("events").EventEmitter;
var expect       = require("chai").expect;
var Wrapper      = require("../lib/Wrapper");

// There seems to be a bug in mocha that causes a failed assertion here to not get
// reported correctly.
function eventTest (test, done) {
	return function () {
		try {
			test.apply(null, arguments);
			done();
		}
		catch (error) {
			done(error);
		}
	};
}

describe("A method wrapper", function () {

	var object = {

		fail : function () {
			var parameters = Array.prototype.slice.call(arguments);
			var callback   = parameters.pop();

			parameters.unshift(new Error("failed"));
			callback.apply(null, parameters);
		},

		method : function () {
			var parameters = Array.prototype.slice.call(arguments);
			var callback   = parameters.pop();

			parameters.unshift(null);
			callback.apply(null, parameters);
		}

	};

	it("creates a wrapped method", function () {
		var wrapper = new Wrapper(object, "method");

		expect(wrapper.method(), "wrapped method").to.be.an.instanceOf(Function);
	});

	describe("result", function () {

		it("is a promise", function () {
			var wrapper = new Wrapper(object, "method");
			var result  = wrapper.method()();

			expect(result, "wrapper result").to.have.property("then");
			expect(result.then, "promise API").to.be.an.instanceOf(Function);
		});

		it("is fulfilled by the method", function (done) {
			var wrapper = new Wrapper(object, "method");
			wrapper.method()().nodeify(done);
		});

		it("is fulfilled with the results of the method", function (done) {
			var wrapper = new Wrapper(object, "method");

			wrapper.parameters(1, 2, 3);
			wrapper.method()()
			// When a Node callback gets more than 2 arguments, Q packs the parameters into an array.
			// See https://github.com/kriskowal/q/blob/master/node.js#L10-L20
			.then(function (results) {
				expect(results, "wrapper results").to.deep.equal([ 1, 2, 3 ]);
			})
			.nodeify(done);
		});

		it("is rejected if the method fails", function (done) {
			var wrapper = new Wrapper(object, "fail");

			wrapper.method()()
			.then(function () {
				throw new Error("Method should not succeed.");
			})
			.fail(function (error) {
				expect(error, "error argument").to.be.an.instanceOf(Error)
					.and.to.have.property("message", "failed");
			})
			.nodeify(done);
		});

	});

	describe("callback", function () {

		it("is invoked when the method completes", function (done) {
			var wrapper = new Wrapper(object, "method");

			wrapper.method()(done);
		});

		it("is invoked with the method results", function (done) {
			function callback (error) {
				var parameters = Array.prototype.slice.call(arguments, 1);

				expect(error, "error argument").not.to.exist;
				expect(parameters, "result arguments").to.deep.equal([ 1, 2, 3 ]);
				done();
			}

			var wrapper = new Wrapper(object, "method");

			wrapper.parameters(1, 2, 3).method()(callback);
		});

		it("forwards method failures", function (done) {
			function callback (error) {
				expect(error, "error argument").to.be.an.instanceOf(Error)
					.and.to.have.property("message", "failed");
				done();
			}

			var wrapper = new Wrapper(object, "fail");

			wrapper.method()(callback);
		});

	});

	describe("target", function () {

		var target;

		beforeEach(function () {
			target = new EventEmitter();
		});

		it("emits an event when the method completes", function (done) {
			var wrapper = new Wrapper(object, "method", target);

			target.on("fired", done);
			wrapper.event("fired").method()();
		});

		it("includes the method results on the event", function (done) {
			var wrapper = new Wrapper(object, "method", target);

			target.on("fired", eventTest(
				function () {
					var parameters = Array.prototype.slice.call(arguments);

					expect(parameters, "event parameters").to.deep.equal([ 1, 2, 3 ]);
				},
				done
			));

			wrapper
				.event("fired")
				.parameters(1, 2, 3)
				.method()();
		});

		it("emits an error if the method fails", function (done) {
			var wrapper = new Wrapper(object, "fail", target);

			target.on("fired", function () {
				done(new Error("Event should not have fired."));
			});
			target.on("error", eventTest(
				function (error) {
					expect(error, "error argument").to.be.an.instanceOf(Error)
						.and.to.have.property("message", "failed");
				},
				done
			));

			wrapper.event("fired").method()();
		});

	});

	it("cannot specify an event to emit without a target", function () {
		var wrapper = new Wrapper(object, "method");

		expect(function () {
			wrapper.event("fired");
		}).to.throw("Wrappers without a target cannot trigger events.");
	});

});
