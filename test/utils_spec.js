var expect = require("chai").expect;
var utils  = require("../lib/utils");

describe("Utils", function () {

	describe("instance maker", function () {

		function Constructor () {
			var object = utils.makeInstance(Constructor, this);

			object. field = "test";

			return object;
		}

		function factory () {
			var object =  utils.makeInstance(factory, this);

			object.field = "test";

			return object;
		}

		it("creates a new instance if used in a factory", function () {
			expect(factory(), "instance object")
				.to.be.an.instanceOf(factory)
				.and.to.have.property("field", "test");
		});

		it("uses the current instance if used in a constructor", function () {
			expect(new Constructor(), "instance object")
				.to.be.an.instanceOf(Constructor)
				.and.to.have.property("field", "test");
		});

		it("can be used to create inheritance hierarchies", function () {
			var instance = Object.create(Constructor.prototype);

			Constructor.call(instance);
			expect(instance, "instance object")
				.to.be.an.instanceOf(Constructor)
				.and.to.have.property("field", "test");
		});

	});

});
