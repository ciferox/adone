const {
    glob: { match: { extglob } },
    util
} = adone;

/**
 * Customize Snapdragon parser and renderer
 */
export default class Extglob {
    constructor(options) {
        this.options = { source: "extglob", ...options };
        this.snapdragon = this.options.snapdragon || new util.Snapdragon(this.options);
        this.snapdragon.patterns = this.snapdragon.patterns || {};
        this.compiler = this.snapdragon.compiler;
        this.parser = this.snapdragon.parser;

        extglob.compilers(this.snapdragon);
        extglob.parsers(this.snapdragon);

        const orig = util.Snapdragon.prototype.parse;
        this.snapdragon.parse = function (str, options) {
            const parsed = orig.call(this, str, options);
            parsed.input = str;

            // escape unmatched brace/bracket/parens
            const last = this.parser.stack.pop();
            if (last && this.options.strict !== true) {
                const node = last.nodes[0];
                node.val = `\\${node.val}`;
                const sibling = node.parent.nodes[1];
                if (sibling.type === "star") {
                    sibling.loose = true;
                }
            }

            // add non-enumerable parser reference
            Object.defineProperty(parsed, "parser", {
                value: this.parser,
                enumerable: false,
                writable: true,
                configurable: true
            });
            return parsed;
        };

        this.parse = function (ast, options) {
            return this.snapdragon.parse(ast, options);
        };

        this.compile = function (ast, options) {
            return this.snapdragon.compile(ast, options);
        };
    }
}
