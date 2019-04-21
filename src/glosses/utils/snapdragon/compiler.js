const {
    is,
    util: { Snapdragon },
    event
} = adone;

const __ = adone.getPrivate(Snapdragon);

const {
    util,
    error
} = __;

const wrap = (type, fn) => function plugin(...args) {
    return this.type === type ? fn.apply(this, args) : plugin;
};

/**
 * Create a new `Compiler` with the given `options`.
 *
 * @param {object} `options`
 * @param {object} `state` Optionally pass a "state" object to use inside visitor functions.
 */
export default class Compiler {
    constructor(options, state) {
        this.options = { source: "string", ...options };
        this.emitter = new event.Emitter();
        this.on = this.emitter.on.bind(this.emitter);
        this.isCompiler = true;
        this.state = state || {};
        this.state.inside = this.state.inside || {};
        this.compilers = {};
        this.output = "";
        this.indent = "";
        this.set("eos", function (node) {
            return this.emit(node.val, node);
        });
        this.set("bos", function (node) {
            return this.emit(node.val, node);
        });
    }

    use(type, ...args) {
        let [fn] = args;
        let idx = 0;

        if (is.string(type) || is.array(type)) {
            fn = wrap(type, fn);
            idx++;
        } else {
            fn = type;
        }

        if (!is.function(fn)) {
            throw new TypeError("expected a function");
        }

        const fns = this.fns;

        args = args.slice(idx);
        args.unshift(this);

        const val = fn.apply(this, args);
        if (is.function(val) && !fns.includes(val)) {
            fns.push(val);
        }
        return this;
    }

    /**
     * Throw a formatted error message with details including the cursor position.
     *
     * @param {string} `msg` Message to use in the Error.
     * @param {object} `node`
     * @return {undefined}
     */
    error(msg, node) {
        return error.call(this, msg, node);
    }

    /**
     * Concat the given string to `compiler.output`.
     *
     * @param {string} `string`
     * @param {object} `node` Optionally pass the node to use for position if source maps are enabled.
     * @return {String} returns the string
     */
    emit(val/*, node*/) {
        this.output += val;
        return val;
    }

    /**
     * Emit an empty string to effectively "skip" the string for the given `node`,
     * but still emit the position and node type.
     *
     * @param {object} node
     */
    noop(node) {
        this.emit("", node);
    }

    /**
     * Define a non-enumberable property on the `Compiler` instance. This is useful
     * in plugins, for exposing methods inside handlers.
     *
     * @param {string} `key` propery name
     * @param {any} `val` property value
     * @returns {object} Returns the Compiler instance for chaining.
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
     * Add a compiler `fn` for the given `type`. Compilers are called
     * when the `.compile` method encounters a node of the given type to
     * generate the output string.
     *
     * @param {string} `type`
     * @param {Function} `fn`
     */
    set(type, fn) {
        this.compilers[type] = fn;
        return this;
    }

    /**
     * Get the compiler of the given `type`.
     *
     * @param {string} `type`
     */
    get(type) {
        return this.compilers[type];
    }

    /**
     * Visit `node` using the registered compiler function associated with the
     * `node.type`.
     *
     * @param {object} `node`
     * @returns {object} returns the node
     */
    visit(node) {
        if (util.isOpen(node)) {
            util.addType(this.state, node);
        }

        this.emitter.emit("node", node);

        const fn = this.compilers[node.type] || this.compilers.unknown;
        if (!is.function(fn)) {
            throw this.error(`compiler "${node.type}" is not registered`, node);
        }

        const val = fn.call(this, node) || node;
        if (util.isNode(val)) {
            node = val;
        }

        if (util.isClose(node)) {
            util.removeType(this.state, node);
        }
        return node;
    }

    /**
     * Iterate over `node.nodes`, calling [visit](#visit) on each node.
     *
     * @param {object} `node`
     * @returns {object} returns the node
     */
    mapVisit(parent) {
        const nodes = parent.nodes || parent.children;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node.parent) {
                node.parent = parent;
            }
            nodes[i] = this.visit(node) || node;
        }
    }

    /**
     * Compile the given `AST` and return a string. Iterates over `ast.nodes`
     * with [mapVisit](#mapVisit).
     *
     * @param {object} `ast`
     * @param {object} `options` Compiler options
     * @returns {object} returns the node
     */
    compile(ast, options) {
        const opts = { ...this.options, ...options };
        this.ast = ast;
        this.output = "";

        // source map support
        if (opts.sourcemap) {
            const { sourcemaps } = __;
            sourcemaps(this);
            this.mapVisit(this.ast);
            this.applySourceMaps();
            this.map = opts.sourcemap === "generator" ? this.map : this.map.toJSON();
        } else {
            this.mapVisit(this.ast);
        }

        return this;
    }
}
