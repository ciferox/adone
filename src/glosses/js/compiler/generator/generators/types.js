const {
    is,
    js: { compiler: { types: t } },
    util: { jsesc }
} = adone;

export const Identifier = function (node) {
    this.exactSource(node.loc, () => {
        this.word(node.name);
    });
};

export const RestElement = function (node) {
    this.token("...");
    this.print(node.argument, node);
};

export { RestElement as SpreadElement };

export const ObjectExpression = function (node) {
    const props = node.properties;

    this.token("{");
    this.printInnerComments(node);

    if (props.length) {
        this.space();
        this.printList(props, node, { indent: true, statement: true });
        this.space();
    }

    this.token("}");
};

export { ObjectExpression as ObjectPattern };

export const ObjectMethod = function (node) {
    this.printJoin(node.decorators, node);
    this._methodHead(node);
    this.space();
    this.print(node.body, node);
};

export const ObjectProperty = function (node) {
    this.printJoin(node.decorators, node);

    if (node.computed) {
        this.token("[");
        this.print(node.key, node);
        this.token("]");
    } else {
        // print `({ foo: foo = 5 } = {})` as `({ foo = 5 } = {});`
        if (
            t.isAssignmentPattern(node.value) &&
            t.isIdentifier(node.key) &&
            node.key.name === node.value.left.name
        ) {
            this.print(node.value, node);
            return;
        }

        this.print(node.key, node);

        // shorthand!
        if (
            node.shorthand &&
            (t.isIdentifier(node.key) &&
                t.isIdentifier(node.value) &&
                node.key.name === node.value.name)
        ) {
            return;
        }
    }

    this.token(":");
    this.space();
    this.print(node.value, node);
};

export const ArrayExpression = function (node) {
    const elems = node.elements;
    const len = elems.length;

    this.token("[");
    this.printInnerComments(node);

    for (let i = 0; i < elems.length; i++) {
        const elem = elems[i];
        if (elem) {


            if (i > 0) {
                this

                    .space();
            }
            this.print(elem,

                node);
            if (i < len - 1) {
                this.token(",");
            }
        } else {


            // If the array expression ends with a hole, that hole
            // will be ignored by the interpreter, but if it ends with
            // two (or more) holes, we need to write out two(or more)
            // commas so that the resulting code is interpreted with
            // both (all) of the holes.
            this.token(",");
        }
    }

    this.token("]");
};

export { ArrayExpression as ArrayPattern };

export const RegExpLiteral = function (node) {
    this.word(`/${node.pattern}/${node.flags}`);
};

export const BooleanLiteral = function (node) {
    this.word(node.value ? "true" : "false");
};

export const NullLiteral = function () {
    this.word("null");
};

export const NumericLiteral = function (node) {
    const raw = this.getPossibleRaw(node);
    const value = `${node.value}`;
    if (is.nil(raw)) {
        this.number(value); // normalize
    } else if (this.format.minified) {
        this.number(raw.length < value.length ? raw : value);
    } else {
        this.number(raw);
    }
};

export const StringLiteral = function (node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && !is.nil(raw)) {
        this.token(raw);
        return;
    }

    // ensure the output is ASCII-safe
    const opts = this.format.jsescOption;
    if (this.format.jsonCompatibleStrings) {
        opts.json = true;
    }
    const val = jsesc(node.value, opts);

    return this.token(val);
};

export const BigIntLiteral = function (node) {
    const raw = this.getPossibleRaw(node);
    if (!this.format.minified && !is.nil(raw)) {
        this.token(raw);
        return;
    }
    this.token(node.value);
};
