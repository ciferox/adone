const {
    is,
    util: {
        Snapdragon
    }
} = adone;

const {
    Node
} = adone.private(Snapdragon);


/**
 * Create a node of the given `type` using the specified regex or function.
 *
 * @param {string} `type`
 * @param {RegExp|Function} `regex` Pass the regex to use for capturing the `open` and `close` nodes.
 * @returns {object} Returns the parser instance for chaining
 */
const captureSet = (options) => (parser) => {
    parser.define("captureOpen", function (type, regex, fn) {
        this.sets[type] = this.sets[type] || [];

        // noop, we really only need the `.open` and `.close` visitors
        this.set(type, () => { });

        // create the `open` visitor for "type"
        this.set(`${type}.open`, function () {
            const pos = this.position();
            const match = this.match(regex);
            if (!match || !match[0]) {
                return;
            }

            this.setCount++;

            // get the last node, either from `this.stack` or `this.ast.nodes`,
            // so we can push our "parent" node onto the `nodes` array of
            // that node. We don't want to just push it onto the ast, because
            // we need to easily be able to pop it off of a stack when we
            // get the "close" node
            const prev = this.prev();

            // create the "parent" node (ex: "brace")
            const parent = pos(new Node({
                type,
                nodes: []
            }));

            // create the "open" node (ex: "brace.open")
            const open = pos(new Node({
                type: `${type}.open`,
                val: match[0]
            }));

            // push "open" node onto `parent.nodes`, and create
            // a reference to parent on `open.parent`
            parent.push(open);

            // add a non-enumerable reference to the "match" arguments
            open.define("match", match);
            parent.define("match", match);

            if (is.function(fn)) {
                fn.call(this, open, parent);
            }

            this.push(type, parent);
            prev.push(parent);
        });

        return this;
    });

    parser.define("captureClose", function (type, regex) {
        if (is.undefined(this.sets[type])) {
            throw new Error(`an \`.open\` type is not registered for ${type}`);
        }

        const opts = { ...this.options, ...options };

        // create the `close` visitor for "type"
        this.set(`${type}.close`, function () {
            const pos = this.position();
            const match = this.match(regex);
            if (!match || !match[0]) {
                return;
            }

            const parent = this.pop(type);
            const close = pos(new Node({
                type: `${type}.close`,
                val: match[0]
            }));

            if (!this.isType(parent, type)) {
                if (opts.strict) {
                    throw new Error(`missing opening "${type}"`);
                }

                this.setCount--;
                close.define("escaped", true);
                return close;
            }

            if (close.suffix === "\\") {
                parent.define("escaped", true);
                close.define("escaped", true);
            }

            parent.push(close);
        });

        return this;
    });

    /**
     * Create a parser with open and close for parens,
     * brackets or braces
     */
    parser.define("captureSet", function (type, openRegex, closeRegex, fn) {
        this.captureOpen(type, openRegex, fn);
        this.captureClose(type, closeRegex, fn);
        return this;
    });
};

/**
 * Register the plugin with `snapdragon.use()` or `snapdragon.parser.use()`.
 */
export default function (options) {
    return function (snapdragon) {
        if (snapdragon.isSnapdragon) {
            snapdragon.parser.use(captureSet(options));
            snapdragon.define("captureSet", function (...args) {
                return this.parser.captureSet(...args);
            });

        } else if (snapdragon.isParser) {
            snapdragon.use(captureSet(options));

        } else {
            throw new Error("expected an instance of snapdragon or snapdragon.parser");
        }
    };
}

