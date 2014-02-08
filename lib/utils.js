var utils = module.exports;

utils.makeInstance = function (constructor, context) {
	return context === global ? Object.create(constructor.prototype) : context;
};
