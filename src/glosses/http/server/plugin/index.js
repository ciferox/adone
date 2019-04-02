const {
    is,
    semver 
} = adone;

const extractPluginName = require("./stack_parser");

function plugin(fn, options = {}) {
    if (!is.undefined(fn.default)) { // Support for 'export default' behaviour in transpiled ECMAScript module
        fn = fn.default;
    }

    if (!is.function(fn)) {
        throw new TypeError(`fastify-plugin expects a function, instead got a '${typeof fn}'`);
    }

    fn[Symbol.for("skip-override")] = true;

    if (is.string(options)) {
        checkVersion(options);
        options = {};
    }

    if (typeof options !== "object" || is.array(options) || is.null(options)) {
        throw new TypeError("The options object should be an object");
    }

    if (!options.name) {
        options.name = checkName(fn);
    }

    fn[Symbol.for("fastify.display-name")] = options.name;

    if (options.fastify) {
        checkVersion(options.fastify);
    }

    fn[Symbol.for("plugin-meta")] = options;

    return fn;
}

function checkName(fn) {
    if (fn.name.length > 0) {
        return fn.name; 
    }

    try {
        throw new Error("anonymous function");
    } catch (e) {
        return extractPluginName(e.stack);
    }
}

function checkVersion(version) {
    if (!is.string(version)) {
        throw new TypeError(`fastify-plugin expects a version string, instead got '${typeof version}'`);
    }

    let fastifyVersion;
    try {
        fastifyVersion = require("fastify/package.json").version.replace(/-rc\.\d+/, "");
    } catch (_) {
        console.info("fastify not found, proceeding anyway");
    }

    if (fastifyVersion && !semver.satisfies(fastifyVersion, version)) {
        throw new Error(`fastify-plugin - expected '${version}' fastify version, '${fastifyVersion}' is installed`);
    }
}

module.exports = plugin;
