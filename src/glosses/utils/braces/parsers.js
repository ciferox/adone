const {
    util: {
        braces,
        Snapdragon
    }
} = adone;

const {
    Node
} = adone.private(Snapdragon);
const {
    util: _util
} = adone.private(braces);

/**
 * Returns true if the character is an extglob character.
 */
const isExtglobChar = (ch) => ch === "!" || ch === "@" || ch === "*" || ch === "?" || ch === "+";

/**
 * Combine text nodes, and calculate empty sets (`{,,}`)
 *
 * @param {Function} pos Function to calculate node position
 * @param {object} node AST node
 * @return {object}
 */
const concatNodes = function (pos, node, parent, options) {
    node.orig = node.val;
    const prev = this.prev();
    const last = _util.last(prev.nodes);
    let isEscaped = false;

    if (node.val.length > 1) {
        const a = node.val.charAt(0);
        const b = node.val.slice(-1);

        isEscaped = (a === '"' && b === '"')
            || (a === "'" && b === "'")
            || (a === "`" && b === "`");
    }

    if (isEscaped && options.unescape !== false) {
        node.val = node.val.slice(1, node.val.length - 1);
        node.escaped = true;
    }

    if (node.match) {
        let match = node.match[1];
        if (!match || !match.includes("}")) {
            match = node.match[0];
        }

        // replace each set with a single ","
        const val = match.replace(/\{/g, ",").replace(/\}/g, "");
        node.multiplier *= val.length;
        node.val = "";
    }

    const simpleText = last.type === "text"
        && last.multiplier === 1
        && node.multiplier === 1
        && node.val;

    if (simpleText) {
        last.val += node.val;
        return;
    }

    prev.push(node);
};


/**
 * Braces parsers
 */
export default function (braces, options) {
    braces.parser
        .set("bos", function () {
            if (!this.parsed) {
                this.ast = this.nodes[0] = new Node(this.ast);
            }
        })

        /**
         * Character parsers
         */
        .set("escape", function () {
            const pos = this.position();
            const m = this.match(/^(?:\\(.)|\$\{)/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const last = _util.last(prev.nodes);

            const node = pos(new Node({
                type: "text",
                multiplier: 1,
                val: m[0]
            }));

            if (node.val === "\\\\") {
                return node;
            }

            if (node.val === "${") {
                const str = this.input;
                let idx = -1;
                let ch;

                while ((ch = str[++idx])) {
                    this.consume(1);
                    node.val += ch;
                    if (ch === "\\") {
                        node.val += str[++idx];
                        continue;
                    }
                    if (ch === "}") {
                        break;
                    }
                }
            }

            if (this.options.unescape !== false) {
                node.val = node.val.replace(/\\([{}])/g, "$1");
            }

            if (last.val === '"' && this.input.charAt(0) === '"') {
                last.val = node.val;
                this.consume(1);
                return;
            }

            return concatNodes.call(this, pos, node, prev, options);
        })

        /**
         * Brackets: "[...]" (basic, this is overridden by
         * other parsers in more advanced implementations)
         */
        .set("bracket", function () {
            const isInside = this.isInside("brace");
            const pos = this.position();
            const m = this.match(/^(?:\[([!^]?)([^\]]{2,}|\]-)(\]|[^*+?]+)|\[)/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const val = m[0];
            const negated = m[1] ? "^" : "";
            let inner = m[2] || "";
            let close = m[3] || "";

            if (isInside && prev.type === "brace") {
                prev.text = prev.text || "";
                prev.text += val;
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

            return pos(new Node({
                type: "bracket",
                val,
                escaped: close !== "]",
                negated,
                inner,
                close
            }));
        })

        /**
         * Empty braces (we capture these early to
         * speed up processing in the compiler)
         */
        .set("multiplier", function () {
            const isInside = this.isInside("brace");
            const pos = this.position();
            const m = this.match(/^\{(,+(?:(\{,+\})*),*|,*(?:(\{,+\})*),+)\}/);
            if (!m) {
                return;
            }

            this.multiplier = true;
            const prev = this.prev();
            const val = m[0];

            if (isInside && prev.type === "brace") {
                prev.text = prev.text || "";
                prev.text += val;
            }

            const node = pos(new Node({
                type: "text",
                multiplier: 1,
                match: m,
                val
            }));

            return concatNodes.call(this, pos, node, prev, options);
        })

        /**
         * Open
         */
        .set("brace.open", function () {
            const pos = this.position();
            const m = this.match(/^\{(?!(?:[^\\}]?|,+)\})/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const last = _util.last(prev.nodes);

            // if the last parsed character was an extglob character
            // we need to _not optimize_ the brace pattern because
            // it might be mistaken for an extglob by a downstream parser
            if (last && last.val && isExtglobChar(last.val.slice(-1))) {
                last.optimize = false;
            }

            const open = pos(new Node({
                type: "brace.open",
                val: m[0]
            }));

            const node = pos(new Node({
                type: "brace",
                nodes: []
            }));

            node.push(open);
            prev.push(node);
            this.push("brace", node);
        })

        /**
         * Close
         */
        .set("brace.close", function () {
            const pos = this.position();
            const m = this.match(/^\}/);
            if (!m || !m[0]) {
                return;
            }

            const brace = this.pop("brace");
            const node = pos(new Node({
                type: "brace.close",
                val: m[0]
            }));

            if (!this.isType(brace, "brace")) {
                if (this.options.strict) {
                    throw new Error('missing opening "{"');
                }
                node.type = "text";
                node.multiplier = 0;
                node.escaped = true;
                return node;
            }

            const prev = this.prev();
            const last = _util.last(prev.nodes);
            if (last.text) {
                const lastNode = _util.last(last.nodes);
                if (lastNode.val === ")" && /[!@*?+]\(/.test(last.text)) {
                    const open = last.nodes[0];
                    const text = last.nodes[1];
                    if (open.type === "brace.open" && text && text.type === "text") {
                        text.optimize = false;
                    }
                }
            }

            if (brace.nodes.length > 2) {
                const first = brace.nodes[1];
                if (first.type === "text" && first.val === ",") {
                    brace.nodes.splice(1, 1);
                    brace.nodes.push(first);
                }
            }

            brace.push(node);
        })

        /**
         * Capture boundary characters
         */
        .set("boundary", function () {
            const pos = this.position();
            const m = this.match(/^[$^](?!\{)/);
            if (!m) {
                return;
            }
            return pos(new Node({
                type: "text",
                val: m[0]
            }));
        })

        /**
         * One or zero, non-comma characters wrapped in braces
         */
        .set("nobrace", function () {
            const isInside = this.isInside("brace");
            const pos = this.position();
            const m = this.match(/^\{[^,]?\}/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const val = m[0];

            if (isInside && prev.type === "brace") {
                prev.text = prev.text || "";
                prev.text += val;
            }

            return pos(new Node({
                type: "text",
                multiplier: 0,
                val
            }));
        })

        /**
         * Text
         */
        .set("text", function () {
            const isInside = this.isInside("brace");
            const pos = this.position();
            const m = this.match(/^((?!\\)[^${}[\]])+/);
            if (!m) {
                return;
            }

            const prev = this.prev();
            const val = m[0];

            if (isInside && prev.type === "brace") {
                prev.text = prev.text || "";
                prev.text += val;
            }

            const node = pos(new Node({
                type: "text",
                multiplier: 1,
                val
            }));

            return concatNodes.call(this, pos, node, prev, options);
        });
}
