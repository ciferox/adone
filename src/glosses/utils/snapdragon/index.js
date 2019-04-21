const {
    is
} = adone;

/**
 * Create a new instance of `Snapdragon` with the given `options`.
 *
 * @param {object} `options`
 */
export default class Snapdragon {
    constructor(options) {
        this.define("cache", {});
        this.options = { source: "string", ...options };
        this.isSnapdragon = true;
        this.plugins = {
            fns: [],
            preprocess: [],
            visitors: {},
            before: {},
            after: {}
        };
    }


    /**
     * Register a plugin `fn`.
     *
     */
    use(fn) {
        fn.call(this, this);
        return this;
    }

    /**
     * Define a non-enumerable property or method on the Snapdragon instance.
     * Useful in plugins for adding convenience methods that can be used in
     * nodes.
     *
     * @param {string} `name` Name of the property or method being defined
     * @param {any} `val` Property value
     * @returns {object} Returns the instance for chaining.
     */
    define(key, value) {
        Object.defineProperty(this, key, {
            value,
            configurable: true,
            enumerable: false,
            writable: true
        });
        return this;
    }

    /**
     * Parse the given `str` and return an AST.
     *
     * @param {string} `str`
     * @param {object} `options` Set `options.sourcemap` to true to enable source maps.
     * @returns {object} Returns an AST.
     */
    parse(str, options) {
        const opts = { ...this.options, ...options };
        const ast = this.parser.parse(str, opts);
        // add non-enumerable parser reference to AST
        Object.defineProperty(ast, "parser", {
            value: this.parser,
            enumerable: false,
            configurable: true,
            writable: true
        });
        return ast;
    }

    /**
     * Compile an `ast` returned from `snapdragon.parse()`
     *
     * @param {object} `ast`
     * @param {object} `options`
     * @returns {object} Returns an object with an `output` property with the rendered string.
     */
    compile(ast, options) {
        const opts = { ...this.options, ...options };
        return this.compiler.compile(ast, opts);
    }

    /**
     * Renders the given string or AST by calling `snapdragon.parse()` (if it's a string)
     * then `snapdragon.compile()`, and returns the output string.
     *
     * @param {object} `ast`
     * @param {object} `options`
     * @returns {object} Returns an object with an `output` property with the rendered string.
     */
    render(ast, options) {
        if (is.string(ast)) {
            ast = this.parse(ast, options);
        }
        return this.compile(ast, options).output;
    }

    get compiler() {
        if (!this.cache.compiler) {
            this.cache.compiler = new __.Compiler(this.options);
        }
        return this.cache.compiler;
    }

    set compiler(compiler) {
        this.cache.compiler = compiler;
    }

    get parser() {
        if (!this.cache.parser) {
            this.cache.parser = new __.Parser(this.options);
        }
        return this.cache.parser;
    }

    set parser(parser) {
        this.cache.parser = parser;
    }

    get compilers() {
        return this.compiler.compilers;
    }

    get parsers() {
        return this.parser.parsers;
    }

    get regex() {
        return this.parser.regex;
    }
}


adone.lazify({
    captureSet: "./capture_set",
    capture: "./capture"
}, Snapdragon, require);

adone.lazifyp({
    Position: "./position",
    Compiler: "./compiler",
    Parser: "./parser",
    Node: "./node",
    util: "./util",
    error: "./error",
    sourcemaps: "./sourcemaps"
}, Snapdragon, require);

const __ = adone.getPrivate(Snapdragon);
