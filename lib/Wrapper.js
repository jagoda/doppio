var q     = require("q");
var utils = require("./utils");

function MethodWrapper (object, name, target) {
	var parameters = [];
	var wrapper    = utils.makeInstance(MethodWrapper, this);

	var event;

	wrapper.event = function (name) {
		if (!target) {
			throw new Error("Wrappers without a target cannot trigger events.");
		}
		event = name;
		return this;
	};

	wrapper.parameters = function () {
		parameters = Array.prototype.slice.call(arguments);
		return this;
	};

	wrapper.method = function () {
		return function (callback) {
			var promise = q.npost(object, name, parameters);

			if (callback) {
				promise.then(
					function (results) {
						results = results || [];
						results.unshift(null);
						callback.apply(null, results);
					},
					callback
				).done();
			}
			if (event) {
				promise.then(
					function (results) {
						results = results || [];
						results.unshift(event);
						target.emit.apply(target, results);
					},
					function (error) {
						target.emit("error", error);
					}
				);
			}

			return promise;
		};
	};

	return wrapper;
}

module.exports = MethodWrapper;
