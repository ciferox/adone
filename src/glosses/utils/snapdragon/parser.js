const {
    is,
    event,
    util: {
        Snapdragon
    }
} = adone;

const {
    Node,
    util,
    Position,
    error
} = adone.private(Snapdragon);

// .parser() issue
// eslint-disable-next-line no-unused-vars
const balanceSets = (parser, node) => {
    if (node && parser.options.strict === true) {
        throw parser.error(`imbalanced "${node.type}": "${parser.orig}"`);
    }
    if (node && node.nodes && node.nodes.length) {
        const first = node.nodes[0];
        first.val = `\\${first.val}`;
    }
};

const wrap = (type, fn) => function plugin(...args) {
    return this.type === type ? fn.apply(this, args) : plugin;
};

/**
 * Create a new `Parser` with the given `input` and `options`.
 *
 * @param {string} `input`
 * @param {object} `options`
 */
export default class Parser extends event.Emitter {
    constructor(options) {
        super();
        this.options = { source: "string", ...options };
        this.isParser = true;
        this.Node = Node;
        this.init(this.options);
    }

    init(options) {
        this.orig = "";
        this.input = "";
        this.parsed = "";

        this.currentType = "root";
        this.setCount = 0;
        this.count = 0;
        this.column = 1;
        this.line = 1;

        this.regex = new Map();
        this.errors = this.errors || [];
        this.parsers = this.parsers || {};
        this.types = this.types || [];
        this.sets = this.sets || {};
        this.fns = this.fns || [];
        this.tokens = [];
        this.stack = [];

        this.typeStack = [];
        this.setStack = [];

        const pos = this.position();
        this.bos = pos(this.node({
            type: "bos",
            val: ""
        }));

        this.ast = pos(this.node({
            type: options.astType || "root",
            errors: this.errors
        }));
        this.ast.push(this.bos);
        this.nodes = [this.ast];
    }

    use(type, ...args) {
        let [fn] = args;
        let idx = 1;

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
   * Define a non-enumberable property on the `Parser` instance. This is useful
   * in plugins, for exposing methods inside handlers.
   *
   * @param {string} `key` propery name
   * @param {any} `val` property value
   * @returns {object} Returns the Parser instance for chaining.
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
    * Create a new [Node](#node) with the given `val` and `type`.
    *
    * @param {object} `val`
    * @param {string} `type`
    * @returns {object} returns the [Node](#node) instance.
    */
    node(val, type) {
        return new this.Node(val, type);
    }

    /**
    * Mark position and patch `node.position`.
    *
    * @return {Function} Returns a function that takes a `node`
    */
    position() {
        const start = { line: this.line, column: this.column };
        const parsed = this.parsed;
        const self = this;

        return function (node) {
            if (!node.isNode) {
                node = new Node(node);
            }
            node.define("position", new Position(start, self));
            node.define("parsed", parsed);
            node.define("inside", self.stack.length > 0);
            node.define("rest", self.input);
            return node;
        };
    }

    /**
    * Add parser `type` with the given visitor `fn`.
    *
    * @param {string} `type`
    * @param {Function} `fn`
    */
    set(type, fn) {
        if (!this.types.includes(type)) {
            this.types.push(type);
        }
        this.parsers[type] = fn.bind(this);
        return this;
    }

    /**
    * Get parser `type`.
    *
    * @param {string} `type`
    */
    get(type) {
        return this.parsers[type];
    }

    /**
    * Push a node onto the stack for the given `type`.
    *
    * @param {string} `type`
    * @returns {object} `token`
    */
    push(type, token) {
        this.sets[type] = this.sets[type] || [];
        this.count++;
        this.stack.push(token);
        this.setStack.push(token);
        this.typeStack.push(type);
        return this.sets[type].push(token);
    }

    /**
    * Pop a token off of the stack of the given `type`.
    *
    * @param {string} `type`
    * @returns {object} Returns a token
    */
    pop(type) {
        if (this.sets[type]) {
            this.count--;
            this.stack.pop();
            this.setStack.pop();
            this.typeStack.pop();
            return this.sets[type].pop();
        }
    }

    /**
    * Return true if inside a "set" of the given `type`. Sets are created
    * manually by adding a type to `parser.sets`. A node is "inside" a set
    * when an `*.open` node for the given `type` was previously pushed onto the set.
    * The type is removed from the set by popping it off when the `*.close`
    * node for the given type is reached.
    *
    * @param {string} `type`
    * @returns {boolean}
    */
    isInside(type) {
        if (is.undefined(type)) {
            return this.count > 0;
        }
        if (!is.array(this.sets[type])) {
            return false;
        }
        return this.sets[type].length > 0;
    }

    isDirectlyInside(type) {
        if (is.undefined(type)) {
            return this.count > 0 ? util.last(this.typeStack) : null;
        }
        return util.last(this.typeStack) === type;
    }

    /**
    * Return true if `node` is the given `type`.
    *
    * @param {object} `node`
    * @param {string} `type`
    * @returns {boolean}
    */
    isType(node, type) {
        return node && node.type === type;
    }

    /**
    * Get the previous AST node from the `parser.stack` (when inside a nested
    * context) or `parser.nodes`.
    *
    * @returns {object}
    */
    prev(n) {
        return this.stack.length > 0
            ? util.last(this.stack, n)
            : util.last(this.nodes, n);
    }

    /**
    * Update line and column based on `str`.
    */
    consume(len) {
        this.input = this.input.substr(len);
    }

    /**
    * Returns the string up to the given `substring`,
    * if it exists, and advances the cursor position past the substring.
    */
    advanceTo(str, i) {
        const idx = this.input.indexOf(str, i);
        if (idx !== -1) {
            const val = this.input.slice(0, idx);
            this.consume(idx + str.length);
            return val;
        }
    }

    /**
    * Update column based on `str`.
    */
    updatePosition(str, len) {
        const lines = str.match(/\n/g);
        if (lines) {
            this.line += lines.length;
        }
        const i = str.lastIndexOf("\n");
        this.column = ~i ? len - i : this.column + len;
        this.parsed += str;
        this.consume(len);
    }

    /**
    * Match `regex`, return captures, and update the cursor position by `match[0]` length.
    *
    * @param {RegExp} `regex`
    * @returns {object}
    */
    match(regex) {
        const m = regex.exec(this.input);
        if (m) {
            this.updatePosition(m[0], m[0].length);
            return m;
        }
    }

    /**
    * Push `node` to `parent.nodes` and assign `node.parent`
    */
    pushNode(node, parent) {
        if (node && parent) {
            if (parent === node) {
                parent = this.ast;
            }
            Object.defineProperty(node, "parent", {
                value: parent,
                enumerable: false,
                configurable: true,
                writable: false
            });

            if (parent.nodes) {
                parent.nodes.push(node);
            }
            if (this.sets.hasOwnProperty(parent.type)) {
                this.currentType = parent.type;
            }
        }
    }

    /**
    * Capture end-of-string
    */
    eos() {
        if (this.input) {
            return;
        }
        const pos = this.position();
        let prev = this.prev();

        while (prev.type !== "root" && !prev.visited) {
            if (this.options.strict === true) {
                throw new SyntaxError(`invalid syntax:${prev}`);
            }

            if (!util.hasOpenAndClose(prev)) {
                Object.defineProperty(prev.parent, "escaped", {
                    value: true,
                    configurable: true,
                    enumerable: false,
                    writable: true
                });
                Object.defineProperty(prev, "escaped", {
                    value: true,
                    configurable: true,
                    enumerable: false,
                    writable: true
                });
            }

            this.visit(prev, (node) => {
                if (!util.hasOpenAndClose(node.parent)) {
                    Object.defineProperty(node.parent, "escaped", {
                        value: true,
                        configurable: true,
                        enumerable: false,
                        writable: true
                    });
                    if (!util.hasOpenAndClose(node)) {
                        Object.defineProperty(node, "escaped", {
                            value: true,
                            configurable: true,
                            enumerable: false,
                            writable: true
                        });
                    }
                }
            });

            prev = prev.parent;
        }

        let node = pos(this.node(this.append || "", "eos"));
        if (is.function(this.options.eos)) {
            node = this.options.eos.call(this, node);
        }

        if (this.parsers.eos) {
            this.parsers.eos.call(this, node);
        }

        Object.defineProperty(node, "parent", {
            value: this.ast,
            enumerable: false,
            writable: true,
            configurable: true
        });
        return node;
    }


    /**
     * Run parsers to advance the cursor position
     */
    getNext() {
        const parsed = this.parsed;
        const len = this.types.length;
        let idx = -1;

        while (++idx < len) {
            const type = this.types[idx];
            const tok = this.parsers[type].call(this);
            if (tok === true) {
                break;
            }

            if (tok) {
                tok.type = tok.type || type;
                Object.defineProperties(tok, {
                    rest: {
                        value: this.input,
                        enumerable: false,
                        configurable: true,
                        writable: true
                    },
                    parsed: {
                        value: parsed,
                        enumerable: false,
                        configurable: true,
                        writable: true
                    }
                });
                this.last = tok;
                this.tokens.push(tok);
                this.emit("node", tok);
                return tok;
            }
        }
    }

    /**
    * Run parsers to get the next AST node
    */
    advance() {
        const input = this.input;
        this.pushNode(this.getNext(), this.prev());

        // if we're here and input wasn't modified, throw an error
        if (this.input && input === this.input) {
            const chokedOn = this.input.slice(0, 10);
            const err = this.error(`no parser for: "${chokedOn}`, this.last);
            if (this.hasListeners("error")) {
                this.emit("error", err);
            } else {
                throw err;
            }
        }
    }

    /**
    * Parse the given string an return an AST object.
    *
    * @param {string} `input`
    * @returns {object} Returns an AST with `ast.nodes`
    */
    parse(input) {
        if (!is.string(input)) {
            throw new TypeError("expected a string");
        }

        this.init(this.options);
        this.orig = input;
        this.input = input;

        // run parsers
        while (this.input) {
            this.advance();
        }

        // balance unmatched sets, if not disabled

        // ? or call balanceSets: balanceSets(this, this.stack.pop());
        if (this.stack.length && this.options.strict === true) {
            const node = this.stack[0];
            throw this.error(`imbalanced "${node.type}": "${this.orig}"`, node);
        }

        // create end-of-string node
        const eos = this.eos();
        const ast = this.prev();
        if (ast.type === "root") {
            this.pushNode(eos, ast);
        }
        return this.ast;
    }

    /**
    * Visit `node` with the given `fn`
    */
    visit(node, fn) {
        if (!is.object(node) || node.isNode !== true) {
            throw new Error("expected node to be an instance of Node");
        }
        if (node.visited) {
            return;
        }
        node.define("visited", true);
        node = fn(node) || node;
        if (node.nodes) {
            this.mapVisit(node.nodes, fn, node);
        }
        return node;
    }

    /**
    * Map visit over array of `nodes`.
    */
    mapVisit(nodes, fn/*, parent */) {
        for (let i = 0; i < nodes.length; i++) {
            this.visit(nodes[i], fn);
        }
    }
}
