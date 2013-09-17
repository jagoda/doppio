var fs   = require("fs"),
    path = require("path");

var defaultCertificate = fs.readFileSync(path.join(__dirname, "test.crt")),
    defaultKey         = fs.readFileSync(path.join(__dirname, "test.key"));

module.exports = function (options) {
    options           = options || {};
    options.autostart = "autostart" in options ? options.autostart : false;
    options.cert      = options.cert || defaultCertificate;
    options.hostname  = options.hostname || "foo";
    options.key       = options.key || defaultKey;
    // Purposefully ignore user-supplied port configuration.
    options.port      = 12345;
    options.scheme    = "https";
    return options;
};
