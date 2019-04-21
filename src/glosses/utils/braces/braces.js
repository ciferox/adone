const {
    is,
    util: { Snapdragon }
} = adone;
const {
    Node
} = adone.getPrivate(adone.util.Snapdragon);
const {
    util,
    compiler,
    parser
} = adone.getPrivate(adone.util.braces);

export default class Braces {
    constructor(options) {
        this.options = { ...options };
    }

    init(options) {
        const opts = util.createOptions({}, this.options, options);
        this.snapdragon = this.options.snapdragon || new Snapdragon(opts);
        this.compiler = this.snapdragon.compiler;
        this.parser = this.snapdragon.parser;

        compiler(this.snapdragon, opts);
        parser(this.snapdragon, opts);

        /**
         * Call Snapdragon `.parse` method. When AST is returned, we check to
         * see if any unclosed braces are left on the stack and, if so, we iterate
         * over the stack and correct the AST so that compilers are called in the correct
         * order and unbalance braces are properly escaped.
         */
        const orig = this.snapdragon.parse;
        this.snapdragon.parse = function (pattern, options) {
            const parsed = orig.call(this, pattern, options);
            this.parser.ast.input = pattern;

            const addParent = (node, parent) => {
                Object.defineProperty(node, "parent", {
                    value: parent,
                    configurable: true,
                    enumerable: false,
                    writable: true
                });
                parent.nodes.push(node);
            };

            const stack = this.parser.stack;
            const hasUnbalanced = stack.length > 0;

            while (stack.length) {
                addParent(new Node({ type: "brace.close", val: "" }), stack.pop());
            }
            if (hasUnbalanced) {
                parsed.push(this.parser.eos());
            }

            // add non-enumerable parser reference
            Object.defineProperty(parsed, "parser", {
                value: this.parser,
                configurable: true,
                enumerable: false,
                writable: true
            });
            return parsed;
        };
    }

    /**
     * Lazily initialize braces
     */
    lazyInit(options) {
        if (!this.isInitialized) {
            this.isInitialized = true;
            this.init(options);
        }
    }

    /**
     * Decorate `.parse` method
     */
    parse(ast, options) {
        if (is.object(ast) && ast.nodes) {
            return ast;
        }
        this.lazyInit(options);
        return this.snapdragon.parse(ast, options);
    }

    /**
     * Decorate `.compile` method
     */
    compile(ast, options) {
        if (is.string(ast)) {
            ast = this.parse(ast, options);
        } else {
            this.lazyInit(options);
        }
        const res = this.snapdragon.compile(ast, options);
        return res;
    }

    expand(pattern) {
        const ast = this.parse(pattern, { expand: true });
        return this.compile(ast, { expand: true });
    }

    optimize(pattern) {
        const ast = this.parse(pattern, { optimize: true });
        return this.compile(ast, { optimize: true });
    }
}
