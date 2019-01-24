if (typeof __in_napa === "undefined") {
    const checkNodeVersion = function () {
        const semver = require("semver");
        const currentNodeVersion = semver.coerce(process.version);
        if (semver.gt(currentNodeVersion, "v8.4.0")) {    
            require("v8").setFlagsFromString("--noincremental-marking");
        } else if (semver.lt(currentNodeVersion, "v4.5.0")) {
            const errorMessage = "Napa.js is not supported on Node version lower than v4.5";
            require("npmlog").error("napajs binding", errorMessage);
            throw new Error(errorMessage);
        }
    };

    checkNodeVersion();
    module.exports = adone.nativeAddon(adone.std.path.join(__dirname, "native", "napa-binding.node"));
} else {
    module.exports = process.binding("napa-binding");
}
