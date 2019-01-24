

// dns-nodejs gets replaced by dns-browser when webpacked/browserified
const dns = require("../runtime/dns-nodejs");
const promisify = require("promisify-es6");

module.exports = () => {
    return promisify((domain, opts, callback) => {
        if (!is.string(domain)) {
            return callback(new Error("Invalid arguments, domain must be a string"));
        }

        if (is.function(opts)) {
            callback = opts;
            opts = {};
        }

        opts = opts || {};

        dns(domain, opts, callback);
    });
};
