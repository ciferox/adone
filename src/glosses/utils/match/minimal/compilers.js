const {
    is
} = adone;

export default function (minimal, options) {
    const star = "[^/]*?";

    const ast = minimal.ast = minimal.parser.ast;
    ast.state = minimal.parser.state;
    minimal.compiler.state = ast.state;

    minimal.compiler

        /**
         * Negation / escaping
         */
        .set("not", function (node) {
            const prev = node.prev;
            if (this.options.nonegate === true || prev.type !== "bos") {
                return this.emit(`\\${node.val}`, node);
            }
            return this.emit(node.val, node);
        })
        .set("escape", function (node) {
            if (this.options.unescape && /^[\w_.-]/.test(node.val)) {
                return this.emit(node.val, node);
            }
            return this.emit(`\\${node.val}`, node);
        })
        .set("quoted", function (node) {
            return this.emit(node.val, node);
        })

        /**
         * Regex
         */
        .set("dollar", function (node) {
            if (node.parent.type === "bracket") {
                return this.emit(node.val, node);
            }
            return this.emit(`\\${node.val}`, node);
        })

        /**
         * Dot: "."
         */
        .set("dot", function (node) {
            if (node.dotfiles === true) {
                this.dotfiles = true;
            }
            return this.emit(`\\${node.val}`, node);
        })

        /**
         * Slashes: "/" and "\"
         */
        .set("backslash", function (node) {
            return this.emit(node.val, node);
        })
        .set("slash", function (node) {
            let val = `\\${node.val}`;
            let parent = node.parent;
            const prev = node.prev;

            // set "node.hasSlash" to true on all ancestor parens nodes
            while (parent.type === "paren" && !parent.hasSlash) {
                parent.hasSlash = true;
                parent = parent.parent;
            }

            if (prev.addQmark) {
                val += "?";
            }

            // word boundary
            if (node.rest.slice(0, 2) === "\\b") {
                return this.emit(val, node);
            }

            // globstars
            if (node.parsed === "**" || node.parsed === "./**") {
                this.output = `(?:${this.output}`;
                return this.emit(`${val})?`, node);
            }

            // negation
            if (node.parsed === "!**" && this.options.nonegate !== true) {
                return this.emit(`${val}?\\b`, node);
            }
            return this.emit(val, node);
        })

        /**
         * Square brackets
         */
        .set("bracket", function (node) {
            const close = node.close;
            const open = !node.escaped ? "[" : "\\[";
            let negated = node.negated;
            let inner = node.inner;
            let val = node.val;

            if (node.escaped === true) {
                inner = inner.replace(/\\?(\W)/g, "\\$1");
                negated = "";
            }

            if (inner === "]-") {
                inner = "\\]\\-";
            }

            if (negated && !inner.includes(".")) {
                inner += ".";
            }
            if (negated && !inner.includes("/")) {
                inner += "/";
            }

            val = open + negated + inner + close;
            return this.emit(val, node);
        })

        /**
         * Square: "[.]" (only matches a single character in brackets)
         */
        .set("square", function (node) {
            const val = !/^\w/.test(node.val) ? `\\${node.val}` : node.val;
            return this.emit(val, node);
        })

        /**
         * Question mark: "?"
         */
        .set("qmark", function (node) {
            const prev = node.prev;
            let val = "[^.\\\\/]";
            if (this.options.dot || (prev.type !== "bos" && prev.type !== "slash")) {
                val = "[^\\\\/]";
            }

            if (node.parsed.slice(-1) === "(") {
                const ch = node.rest.charAt(0);
                if (ch === "!" || ch === "=" || ch === ":") {
                    return this.emit(node.val, node);
                }
            }

            if (node.val.length > 1) {
                val += `{${node.val.length}}`;
            }
            return this.emit(val, node);
        })

        /**
         * Plus
         */
        .set("plus", function (node) {
            const prev = node.parsed.slice(-1);
            if (prev === "]" || prev === ")") {
                return this.emit(node.val, node);
            }
            if (!this.output || (/[?*+]/.test(prev) && node.parent.type !== "bracket")) {
                return this.emit("\\+", node);
            }
            const ch = this.output.slice(-1);
            if (/\w/.test(ch) && !node.inside) {
                return this.emit("+\\+?", node);
            }
            return this.emit("+", node);
        })

        /**
         * globstar: '**'
         */
        .set("globstar", function (node) {
            if (!this.output) {
                this.ast.state.leadingGlobstar = true;
                // this.output = '(?=.)' + this.output;
            }
            let next;
            let prev;
            if (!node.parent.isType("root")) {
                next = node.parent.next;
                prev = node.parent.prev;
            } else {
                next = node.next;
                prev = node.prev;
            }
            const prev2 = prev.prev;
            const next2 = next.next;
            const type = prev.type;

            let val = node.val;

            if (prev.type === "slash" && next.type === "slash") {
                if (prev2.type === "text") {
                    this.output += "?";

                    if (next2.type !== "text") {
                        this.output += "\\b";
                    }
                }
            }

            let parsed = node.parsed;
            if (parsed.charAt(0) === "!") {
                parsed = parsed.slice(1);
            }

            if (parsed && type !== "slash" && type !== "bos") {
                val = star;
            } else {
                val = this.options.dot !== true
                    ? "(?:(?!(?:\\/|^)\\.).)*?"
                    : "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/))(?!\\.{2}).)*?";
            }

            if ((type === "slash" || type === "bos") && this.options.dot !== true) {
                val = `(?!\\.)${val}`;
            }

            if (prev.type === "slash" && next.type === "slash" && prev2.type !== "text") {
                if (next2.type === "text" || next2.type === "star") {
                    node.addQmark = true;
                }
            }

            if (this.options.capture) {
                val = `(${val})`;
            }

            return this.emit(val, node);
        })

        /**
         * Star: "*"
         */
        .set("star", function (node) {
            const prev = node.prev;
            const prior = prev.prev;
            const next = node.next;
            const type = prev.type;

            const isStart = (n) => {
                return n.type === "bos" || n.type === "slash";
            };

            if (this.output === "" && this.options.contains !== true) {
                this.output = "(?!\\/)";
            }

            if (type === "bracket" && this.options.bash === false) {
                const str = next && next.type === "bracket" ? star : "*?";
                if (!prev.nodes || prev.nodes[1].type !== "posix") {
                    return this.emit(str, node);
                }
            }

            let prefix = !this.dotfiles && type !== "text" && type !== "escape"
                ? (this.options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)")
                : "";

            if (isStart(prev) || (isStart(prior) && type === "not")) {
                if (prefix !== "(?!\\.)") {
                    prefix += "(?!(\\.{2}|\\.\\/))(?=.)";
                } else {
                    prefix += "(?=.)";
                }
            } else if (prefix === "(?!\\.)") {
                prefix = "";
            }

            if (prev.type === "not" && prior.type === "bos" && this.options.dot === true) {
                this.output = `(?!\\.)${this.output}`;
            }

            let output = prefix + star;
            if (this.options.capture) {
                output = `(${output})`;
            }

            return this.emit(output, node);
        })

        /**
         * Text
         */
        .set("text", function (node) {
            return this.emit(node.val, node);
        })

        /**
         * End-of-string
         */
        .set("eos", function (node) {
            const prev = node.prev;
            let val = node.val;

            if (this.ast.state.leadingGlobstar === true) {
                this.output = `(?:\\.(?:\\/|\\\\))?(?=.)${this.output}`;
            }

            if (this.state.metachar && prev.type !== "qmark" && prev.type !== "slash") {
                val += (this.options.contains ? "(?:\\/|\\\\)?" : "(?:(?:\\/|\\\\)|$)");
            }

            return this.emit(val, node);
        });

    /**
     * Allow custom compilers to be passed on options
     */
    if (options && is.function(options.compilers)) {
        options.compilers(minimal.compiler);
    }
}
