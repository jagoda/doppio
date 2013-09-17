module.exports = function (options) {
    if (options && typeof options.port === "number") {
        options.port = options.port + 1;
    }
    return options;
};
