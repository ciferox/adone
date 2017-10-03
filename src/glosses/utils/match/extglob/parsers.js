const {
    util
} = adone;
const {
    match: { posixBrackets }
} = util;

/**
 * Characters to use in text regex (we want to "not" match
 * characters that are matched by other parsers)
 */
const TEXT_REGEX = "([!@*?+]?\\(|\\)|[*?.+\\\\]|\\[:?(?=.*\\])|:?\\])+";
const not = util.regexNot(TEXT_REGEX, { contains: true, strictClose: false });

/**
 * Extglob parsers
 */
export default function parsers(extglob) {
    extglob.state = extglob.state || {};

    /**
     * Use `expand-brackets` parsers
     */
    extglob.use(posixBrackets.parsers);
    extglob.parser.sets.paren = extglob.parser.sets.paren || [];
    extglob.parser

        /**
         * Extglob open: "*("
         */
        .capture("paren.open", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^([!@*?+])?\(/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const prefix = m[1];
            const val = m[0];

            const open = pos({
                type: "paren.open",
                parsed,
                val
            });

            const node = pos({
                type: "paren",
                prefix,
                nodes: [open]
            });

            // if nested negation extglobs, just cancel them out to simplify
            if (prefix === "!" && prev.type === "paren" && prev.prefix === "!") {
                prev.prefix = "@";
                node.prefix = "@";
            }

            Object.defineProperties(node, {
                rest: {
                    value: this.input,
                    configurable: true,
                    enumerable: false,
                    writable: true
                },
                parsed: {
                    value: parsed,
                    configurable: true,
                    enumerable: false,
                    writable: true
                },
                parent: {
                    value: prev,
                    configurable: true,
                    enumerable: false,
                    writable: true
                }
            });
            Object.defineProperty(open, "parent", {
                value: node,
                configurable: true,
                enumerable: false,
                writable: true
            });

            this.push("paren", node);
            prev.nodes.push(node);
        })

        /**
         * Extglob close: ")"
         */
        .capture("paren.close", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^\)/);
            if (!m) {
                return;
            }

            const parent = this.pop("paren");
            const node = pos({
                type: "paren.close",
                rest: this.input,
                parsed,
                val: m[0]
            });

            if (!this.isType(parent, "paren")) {
                if (this.options.strict) {
                    throw new Error('missing opening paren: "("');
                }
                node.escaped = true;
                return node;
            }

            node.prefix = parent.prefix;
            parent.nodes.push(node);

            Object.defineProperty(node, "parent", {
                value: parent,
                configurable: true,
                enumerable: false,
                writable: true
            });
        })

        /**
         * Escape: "\\."
         */
        .capture("escape", function () {
            const pos = this.position();
            const m = this.match(/^\\(.)/);
            if (!m) {
                return;
            }

            return pos({
                type: "escape",
                val: m[0],
                ch: m[1]
            });
        })

        /**
         * Question marks: "?"
         */
        .capture("qmark", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^\?+(?!\()/);
            if (!m) {
                return;
            }
            extglob.state.metachar = true;
            return pos({
                type: "qmark",
                rest: this.input,
                parsed,
                val: m[0]
            });
        })

        /**
         * Character parsers
         */
        .capture("star", /^\*(?!\()/)
        .capture("plus", /^\+(?!\()/)
        .capture("dot", /^\./)
        .capture("text", not);
}

parsers.TEXT_REGEX = TEXT_REGEX;
