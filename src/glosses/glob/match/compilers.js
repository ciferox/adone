const {
    glob: {
        match: {
            minimal,
            extglob
        }
    }
} = adone;

const escapeExtglobs = (compiler) => {
    /**
     * Visit `node` with the given `fn`
     */
    const visit = (node, fn) => {
        return node.nodes ? mapVisit(node.nodes, fn) : fn(node); // eslint-disable-line
    };

    /**
     * Map visit over array of `nodes`.
     */
    const mapVisit = (nodes, fn) => {
        const len = nodes.length;
        let idx = -1;
        while (++idx < len) {
            visit(nodes[idx], fn);
        }
    };

    compiler.set("paren", function (node) {
        let val = "";
        visit(node, (tok) => {
            if (tok.val) {
                val += `\\${tok.val}`;
            }
        });
        return this.emit(val, node);
    });
};

export default function compilers(snapdragon) {
    const compilers = snapdragon.compiler.compilers;
    const opts = snapdragon.options;

    snapdragon.use(minimal.compilers);

    // get references to some specific minimal compilers before they
    // are overridden by the extglob and/or custom compilers
    const escape = compilers.escape;
    const qmark = compilers.qmark;
    const slash = compilers.slash;
    const star = compilers.star;
    const text = compilers.text;
    const plus = compilers.plus;
    const dot = compilers.dot;

    // register extglob compilers or escape exglobs if disabled
    if (opts.extglob === false || opts.noext === true) {
        snapdragon.compiler.use(escapeExtglobs);
    } else {
        snapdragon.use(extglob.compilers);
    }

    snapdragon.use(function () {
        this.options.star = this.options.star || (() => "[^/]*?");
    });

    snapdragon.compiler

        // reset referenced compiler
        .set("dot", dot)
        .set("escape", escape)
        .set("plus", plus)
        .set("slash", slash)
        .set("qmark", qmark)
        .set("star", star)
        .set("text", text);
}
