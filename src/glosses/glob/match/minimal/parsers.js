const {
    is,
    util
} = adone;

/**
 * Characters to use in negation regex (we want to "not" match
 * characters that are matched by other parsers)
 */
let cached;
const NOT_REGEX = '[!*+?$^"\'.\\\\/\\[]+';

/**
 * Advance to the next non-escaped character
 */
const advanceTo = (input, endChar) => {
    let ch = input.charAt(0);
    const tok = { len: 1, val: "", esc: "" };
    let idx = 0;

    const advance = () => {
        if (ch !== "\\") {
            tok.esc += `\\${ch}`;
            tok.val += ch;
        }

        ch = input.charAt(++idx);
        tok.len++;

        if (ch === "\\") {
            advance();
            advance();
        }
    };

    while (ch && ch !== endChar) { // eslint-disable-line no-unmodified-loop-condition
        advance();
    }
    return tok;
};

/**
 * Create text regex
 */
const createTextRegex = (pattern) => {
    if (cached) {
        return cached;
    }
    const opts = { contains: true, strictClose: false };
    const not = util.regexNot.create(pattern, opts);
    cached = util.toRegex(`^(?:[*]\\(|${not})`, opts);
    return cached;
};

const not = createTextRegex(NOT_REGEX);

/**
 * Nanomatch parsers
 */
export default function parsers(minimal, options) {
    const parser = minimal.parser;
    const opts = parser.options;

    parser.state = {
        slashes: 0,
        paths: []
    };

    parser.ast.state = parser.state;
    parser
        .use(util.Snapdragon.capture())
        /**
         * Beginning-of-string
         */
        .capture("bos", function () {
            if (this.parsed) {
                return;
            }
            const pos = this.position();
            const m = this.match(/^\.[\\/]/);
            if (!m) {
                return;
            }

            this.ast.strictOpen = Boolean(this.options.strictOpen);
            this.ast.addPrefix = true;

            return pos({
                type: "bos",
                val: ""
            });
        })

        /**
         * Escape: "\\."
         */
        .capture("escape", function () {
            if (this.isInside("bracket")) {
                return;
            }
            const pos = this.position();
            const m = this.match(/^(?:\\(.)|([$^]))/);
            if (!m) {
                return;
            }

            return pos({
                type: "escape",
                val: m[2] || m[1]
            });
        })

        /**
         * Quoted strings
         */
        .capture("quoted", function () {
            const pos = this.position();
            const m = this.match(/^["']/);
            if (!m) {
                return;
            }

            const quote = m[0];
            if (!this.input.includes(quote)) {
                return pos({
                    type: "escape",
                    val: quote
                });
            }

            const tok = advanceTo(this.input, quote);
            this.consume(tok.len);

            return pos({
                type: "quoted",
                val: tok.esc
            });
        })

        /**
         * Negations: "!"
         */
        .capture("not", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(this.notRegex || /^!+/);
            if (!m) {
                return;
            }
            let val = m[0];

            const isNegated = is.odd(val.length);
            if (parsed === "" && !isNegated) {
                val = "";
            }

            // if nothing has been parsed, we know `!` is at the start,
            // so we need to wrap the result in a negation regex
            if (parsed === "" && isNegated && this.options.nonegate !== true) {
                this.bos.val = "(?!^(?:";
                this.append = ")$).*";
                val = "";
            }
            return pos({
                type: "not",
                val
            });
        })

        /**
         * Dot: "."
         */
        .capture("dot", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^\.+/);
            if (!m) {
                return;
            }

            const val = m[0];
            this.ast.dot = val === "." && (parsed === "" || parsed.slice(-1) === "/");

            return pos({
                type: "dot",
                dotfiles: this.ast.dot,
                val
            });
        })

        /**
         * Plus: "+"
         */
        .capture("plus", /^\+(?!\()/)

        /**
         * Question mark: "?"
         */
        .capture("qmark", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^\?+(?!\()/);
            if (!m) {
                return;
            }

            this.state.metachar = true;
            this.state.qmark = true;

            return pos({
                type: "qmark",
                parsed,
                val: m[0]
            });
        })

        /**
         * Globstar: "**"
         */
        .capture("globstar", function () {
            const parsed = this.parsed;
            const pos = this.position();
            const m = this.match(/^\*{2}(?![*(])(?=[,/)]|$)/);
            if (!m) {
                return;
            }

            const type = opts.noglobstar !== true ? "globstar" : "star";
            const node = pos({ type, parsed });

            if (this.input.slice(0, 4) === "/**/") {
                this.input = this.input.slice(3);
            }

            if (type === "globstar") {
                this.state.globstar = true;
                node.val = "**";

            } else {
                this.state.star = true;
                node.val = "*";
            }

            this.state.metachar = true;
            return node;
        })

        /**
         * Star: "*"
         */
        .capture("star", function () {
            const pos = this.position();
            const starRe = /^(?:\*(?![*(])|[*]{3,}(?!\()|[*]{2}(?![(/]|$)|\*(?=\*\())/;
            const m = this.match(starRe);
            if (!m) {
                return;
            }

            this.state.metachar = true;
            this.state.star = true;
            return pos({
                type: "star",
                val: m[0]
            });
        })

        /**
         * Slash: "/"
         */
        .capture("slash", function () {
            const pos = this.position();
            const m = this.match(/^\//);
            if (!m) {
                return;
            }

            this.state.slashes++;
            return pos({
                type: "slash",
                val: m[0]
            });
        })

        /**
         * Backslash: "\\"
         */
        .capture("backslash", function () {
            const pos = this.position();
            const m = this.match(/^\\(?![*+?(){}[\]'"])/);
            if (!m) {
                return;
            }

            let val = m[0];

            if (this.isInside("bracket")) {
                val = "\\";
            } else if (val.length > 1) {
                val = "\\\\";
            }

            return pos({
                type: "backslash",
                val
            });
        })

        /**
         * Square: "[.]"
         */
        .capture("square", function () {
            if (this.isInside("bracket")) {
                return;
            }
            const pos = this.position();
            const m = this.match(/^\[([^!^\\])\]/);
            if (!m) {
                return;
            }

            return pos({
                type: "square",
                val: m[1]
            });
        })

        /**
         * Brackets: "[...]" (basic, this can be overridden by other parsers)
         */
        .capture("bracket", function () {
            const pos = this.position();
            const m = this.match(/^(?:\[([!^]?)([^\]]+|\]-)(\]|[^*+?]+)|\[)/);
            if (!m) {
                return;
            }

            let val = m[0];
            const negated = m[1] ? "^" : "";
            let inner = (m[2] || "").replace(/\\\\+/, "\\\\");
            let close = m[3] || "";

            if (m[2] && inner.length < m[2].length) {
                val = val.replace(/\\\\+/, "\\\\");
            }

            const esc = this.input.slice(0, 2);
            if (inner === "" && esc === "\\]") {
                inner += esc;
                this.consume(2);

                const str = this.input;
                let idx = -1;
                let ch;

                while ((ch = str[++idx])) {
                    this.consume(1);
                    if (ch === "]") {
                        close = ch;
                        break;
                    }
                    inner += ch;
                }
            }

            return pos({
                type: "bracket",
                val,
                escaped: close !== "]",
                negated,
                inner,
                close
            });
        })

        /**
         * Text
         */
        .capture("text", function () {
            if (this.isInside("bracket")) {
                return;
            }
            const pos = this.position();
            const m = this.match(not);
            if (!m || !m[0]) {
                return;
            }

            return pos({
                type: "text",
                val: m[0]
            });
        });

    /**
     * Allow custom parsers to be passed on options
     */
    if (options && is.function(options.parsers)) {
        options.parsers(minimal.parser);
    }
}

parsers.not = NOT_REGEX;
