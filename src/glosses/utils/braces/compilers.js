const {
    is,
    util
} = adone;

const {
    util: _util
} = adone.getPrivate(adone.util.braces);

/**
 * Multiply the segments in the current brace level
 */
const multiply = (queue, n) => {
    return util.flatten(util.repeat(util.arrify(queue), n));
};

/**
 * Return true if `node` is escaped
 */
const isEscaped = (node) => {
    return node.escaped === true;
};

/**
 * Returns true if the given `node` is the given `type`
 * @return {Boolean}
 */
const isType = (node, type) => {
    return !is.undefined(node) && node.type === type;
};


/**
 * Returns true if regex parens should be used for sets. If the parent `type`
 * is not `brace`, then we're on a root node, which means we should never
 * expand segments and open/close braces should be `{}` (since this indicates
 * a brace is missing from the set)
 */
const isOptimized = (node, options) => {
    if (node.parent.isOptimized) {
        return true;
    }
    return isType(node.parent, "brace")
        && !isEscaped(node.parent)
        && options.expand !== true;
};

/**
 * Returns true if the value in `node` should be wrapped in a literal brace.
 * @return {Boolean}
 */
const isLiteralBrace = (node, options) => {
    return isEscaped(node.parent) || options.optimize !== false;
};

/**
 * Returns true if the given `node` does not have an inner value.
 * @return {Boolean}
 */
const noInner = (node) => {
    if (node.parent.queue.length === 1) {
        return true;
    }
    const nodes = node.parent.nodes;
    return nodes.length === 3
        && isType(nodes[0], "brace.open")
        && !isType(nodes[1], "text")
        && isType(nodes[2], "brace.close");
};

/**
 * Returns true if the given `node` has a non-empty queue.
 * @return {Boolean}
 */
const hasQueue = (node) => {
    return is.array(node.queue) && node.queue.length;
};


export default function (braces, options) {
    braces.compiler

        /**
         * bos
         */
        .set("bos", function () {
            if (this.output) {
                return;
            }
            this.ast.queue = isEscaped(this.ast) ? [this.ast.val] : [];
            this.ast.count = 1;
        })

        /**
         * Square brackets
         */
        .set("bracket", (node) => {
            const close = node.close;
            const open = !node.escaped ? "[" : "\\[";
            const negated = node.negated;
            let inner = node.inner;

            inner = inner.replace(/\\(?=[\\\w]|$)/g, "\\\\");
            if (inner === "]-") {
                inner = "\\]\\-";
            }

            if (negated && !inner.includes(".")) {
                inner += ".";
            }
            if (negated && !inner.includes("/")) {
                inner += "/";
            }

            const val = open + negated + inner + close;
            const queue = node.parent.queue;
            const last = util.arrify(queue.pop());

            queue.push(_util.join(last, val));
        })

        /**
         * Brace
         */
        .set("brace", function (node) {
            node.queue = isEscaped(node) ? [node.val] : [];
            node.count = 1;
            return this.mapVisit(node);
        })

        /**
         * Open
         */
        .set("brace.open", (node) => {
            node.parent.open = node.val;
        })

        /**
         * Inner
         */
        .set("text", (node) => {
            const queue = node.parent.queue;
            let escaped = node.escaped;
            let segs = [node.val];

            if (node.optimize === false) {
                options = { ...options, optimize: false };
            }

            if (node.multiplier > 1) {
                node.parent.count *= node.multiplier;
            }

            if (options.quantifiers === true && _util.isQuantifier(node.val)) {
                escaped = true;

            } else if (node.val.length > 1) {
                if (isType(node.parent, "brace") && !isEscaped(node)) {
                    const expanded = _util.expand(node.val, options);
                    segs = expanded.segs;

                    if (expanded.isOptimized) {
                        node.parent.isOptimized = true;
                    }

                    // if nothing was expanded, we probably have a literal brace
                    if (!segs.length) {
                        let val = (expanded.val || node.val);
                        if (options.unescape !== false) {
                            // unescape unexpanded brace sequence/set separators
                            val = val.replace(/\\([,.])/g, "$1");
                            // strip quotes
                            val = val.replace(/["'`]/g, "");
                        }

                        segs = [val];
                        escaped = true;
                    }
                }

            } else if (node.val === ",") {
                if (options.expand) {
                    node.parent.queue.push([""]);
                    segs = [""];
                } else {
                    segs = ["|"];
                }
            } else {
                escaped = true;
            }

            if (escaped && isType(node.parent, "brace")) {
                if (node.parent.nodes.length <= 4 && node.parent.count === 1) {
                    node.parent.escaped = true;
                } else if (node.parent.length <= 3) {
                    node.parent.escaped = true;
                }
            }

            if (!hasQueue(node.parent)) {
                node.parent.queue = segs;
                return;
            }

            let last = util.arrify(queue.pop());
            if (node.parent.count > 1 && options.expand) {
                last = multiply(last, node.parent.count);
                node.parent.count = 1;
            }
            queue.push(_util.join(util.flatten(last), segs.shift()));
            queue.push(...segs);
        })

        /**
         * Close
         */
        .set("brace.close", (node) => {
            let queue = node.parent.queue;
            const prev = node.parent.parent;
            const last = prev.queue.pop();
            let open = node.parent.open;
            let close = node.val;

            if (open && close && isOptimized(node, options)) {
                open = "(";
                close = ")";
            }

            // if a close brace exists, and the previous segment is one character
            // don't wrap the result in braces or parens
            let ele = _util.last(queue);
            if (node.parent.count > 1 && options.expand) {
                ele = multiply(queue.pop(), node.parent.count);
                node.parent.count = 1;
                queue.push(ele);
            }

            if (close && is.string(ele) && ele.length === 1) {
                open = "";
                close = "";
            }

            if ((isLiteralBrace(node, options) || noInner(node)) && !node.parent.hasEmpty) {
                queue.push(_util.join(open, queue.pop() || ""));
                queue = util.flatten(_util.join(queue, close));
            }

            if (is.undefined(last)) {
                prev.queue = [queue];
            } else {
                prev.queue.push(util.flatten(_util.join(last, queue)));
            }
        })

        /**
         * eos
         */
        .set("eos", function (node) {
            if (this.input) {
                return;
            }

            if (options.optimize !== false) {
                this.output = _util.last(util.flatten(this.ast.queue));
            } else if (is.array(_util.last(this.ast.queue))) {
                this.output = util.flatten(this.ast.queue.pop());
            } else {
                this.output = util.flatten(this.ast.queue);
            }

            if (node.parent.count > 1 && options.expand) {
                this.output = multiply(this.output, node.parent.count);
            }

            this.output = util.arrify(this.output);
            this.ast.queue = [];
        });
}
