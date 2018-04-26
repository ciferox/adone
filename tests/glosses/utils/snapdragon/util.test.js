const { is } = adone;
const { Snapdragon } = adone.util;
const { Parser, Compiler, util } = adone.private(Snapdragon);

/**
 * This is a shim used in the unit tests
 * to ensure that snapdragon-util works with
 * older and newer versions of snapdragon-node
 */

const isNode = (node) => {
    return is.object(node) && node.isNode === true;
};

const decorate = (node) => {

    /**
     * Define a non-enumberable property on the node instance.
     *
     * ```js
     * var node = new Node();
     * node.define('foo', 'something non-enumerable');
     * ```
     * @param {String} `name`
     * @param {any} `val`
     * @return {Object} returns the node instance
     * @api public
     */

    node.define = function (name, value) {
        Object.defineProperty(this, name, {
            value,
            configurable: true,
            enumerable: false,
            writable: true
        });
        return this;
    };

    /**
     * Given node `foo` and node `bar`, push node `bar` onto `foo.nodes`, and
     * set `foo` as `bar.parent`.
     *
     * ```js
     * var foo = new Node({type: 'foo'});
     * var bar = new Node({type: 'bar'});
     * foo.push(bar);
     * ```
     * @param {Object} `node`
     * @return {Number} Returns the length of `node.nodes`
     * @api public
     */

    node.push = function (node) {
        assert(isNode(node), "expected node to be an instance of Node");
        Object.defineProperty(node, "parent", {
            value: this,
            configurable: true,
            enumerable: false,
            writable: true
        });

        this.nodes = this.nodes || [];
        return this.nodes.push(node);
    };

    /**
     * Given node `foo` and node `bar`, unshift node `bar` onto `foo.nodes`, and
     * set `foo` as `bar.parent`.
     *
     * ```js
     * var foo = new Node({type: 'foo'});
     * var bar = new Node({type: 'bar'});
     * foo.unshift(bar);
     * ```
     * @param {Object} `node`
     * @return {Number} Returns the length of `node.nodes`
     * @api public
     */

    node.unshift = function (node) {
        assert(isNode(node), "expected node to be an instance of Node");
        Object.defineProperty(node, "parent", {
            value: this,
            configurable: true,
            enumerable: false,
            writable: true
        });


        this.nodes = this.nodes || [];
        return this.nodes.unshift(node);
    };

    /**
     * Pop a node from `node.nodes`.
     *
     * ```js
     * var node = new Node({type: 'foo'});
     * node.push(new Node({type: 'a'}));
     * node.push(new Node({type: 'b'}));
     * node.push(new Node({type: 'c'}));
     * node.push(new Node({type: 'd'}));
     * console.log(node.nodes.length);
     * //=> 4
     * node.pop();
     * console.log(node.nodes.length);
     * //=> 3
     * ```
     * @return {Number} Returns the popped `node`
     * @api public
     */

    node.pop = function () {
        return this.nodes && this.nodes.pop();
    };

    /**
     * Shift a node from `node.nodes`.
     *
     * ```js
     * var node = new Node({type: 'foo'});
     * node.push(new Node({type: 'a'}));
     * node.push(new Node({type: 'b'}));
     * node.push(new Node({type: 'c'}));
     * node.push(new Node({type: 'd'}));
     * console.log(node.nodes.length);
     * //=> 4
     * node.shift();
     * console.log(node.nodes.length);
     * //=> 3
     * ```
     * @return {Object} Returns the shifted `node`
     * @api public
     */

    node.shift = function () {
        return this.nodes && this.nodes.shift();
    };

    /**
     * Remove `node` from `node.nodes`.
     *
     * ```js
     * node.remove(childNode);
     * ```
     * @param {Object} `node`
     * @return {Object} Returns the removed node.
     * @api public
     */

    node.remove = function (node) {
        assert(isNode(node), "expected node to be an instance of Node");
        this.nodes = this.nodes || [];
        const idx = node.index;
        if (idx !== -1) {
            return this.nodes.splice(idx, 1);
        }
        return null;
    };
};

class Node {
    constructor(node) {
        this.define(this, "parent", null);
        this.isNode = true;
        this.type = node.type;
        this.value = node.value;
        if (node.nodes) {
            this.nodes = node.nodes;
        }
    }

    define(key, value) {
        Object.defineProperty(this, key, { value });
        return this;
    }

    get siblings() {
        return this.parent ? this.parent.nodes : null;
    }

    get last() {
        if (this.nodes && this.nodes.length) {
            return this.nodes[this.nodes.length - 1];
        }
    }
}

let parser;
let ast;

describe("util", "Snapdragon", "util", () => {
    beforeEach(() => {
        parser = new Parser({ Node })
            .set("text", function () {
                const match = this.match(/^[a-z]+/);
                if (match) {
                    return this.node(match[0]);
                }
            })
            .set("slash", function () {
                const match = this.match(/^\//);
                if (match) {
                    return this.node(match[0]);
                }
            })
            .set("star", function () {
                const match = this.match(/^\*/);
                if (match) {
                    return this.node(match[0]);
                }
            });

        ast = new Node(parser.parse("a/*/c"));
    });

    describe(".identity", () => {
        it("should return node.value as it was created by the parser", () => {
            const res = new Compiler()
                .set("star", util.identity)
                .set("slash", util.identity)
                .set("text", util.identity)
                .compile(ast);

            assert.equal(res.output, "a/*/c");
        });
    });

    describe(".noop", () => {
        it("should make a node an empty text node", () => {
            const res = new Compiler()
                .set("star", util.noop)
                .set("slash", util.identity)
                .set("text", util.identity)
                .compile(ast);

            assert.equal(res.output, "a//c");
        });
    });

    describe(".append", () => {
        it("should append the specified text", () => {
            const res = new Compiler()
                .set("star", util.append("@"))
                .set("slash", util.append("\\"))
                .set("text", util.identity)
                .compile(ast);

            assert.equal(res.output, "a\\@\\c");
        });

        it("should use compiler.append method when it exists", () => {
            const compiler = new Compiler();
            compiler.append = compiler.emit.bind(compiler);

            const res = compiler.set("star", util.append("@"))
                .set("slash", util.append("\\"))
                .set("text", util.identity)
                .compile(ast);

            assert.equal(res.output, "a\\@\\c");
        });
    });

    describe(".toNoop", () => {
        it("should throw an error when node is not a node", () => {
            assert.throws(() => {
                util.toNoop();
            });
        });

        it("should convert a node to a noop node", () => {
            util.toNoop(ast);
            assert(!ast.nodes);
        });

        it("should convert a node to a noop with the given nodes value", () => {
            util.toNoop(ast, []);
            assert.equal(ast.nodes.length, 0);
        });
    });

    describe(".visit", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.visit();
            });
        });

        it("should throw an error when node.nodes is not an array", () => {
            assert.throws(() => {
                util.visit(new Node({ type: "foo", value: "" }));
            });
        });

        it("should visit a node with the given function", () => {
            let type = null;
            util.visit(ast, (node) => {
                if (is.null(type)) {
                    type = node.type;
                }
            });
            assert.equal(type, "root");
        });
    });

    describe(".mapVisit", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.mapVisit();
            });
        });

        it("should throw an error when node.nodes is not an array", () => {
            assert.throws(() => {
                util.mapVisit(new Node({ type: "foo", value: "" }));
            });
        });

        it('should map "visit" over node.nodes', () => {
            let type = null;
            util.mapVisit(ast, (node) => {
                if (is.null(type) && node.parent && node.parent.type === "root") {
                    type = node.type;
                }
            });
            assert.equal(type, "bos");
        });
    });

    describe(".pushNode", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.pushNode();
            });
        });

        it("should add a node to the end of node.nodes", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });
            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");
        });

        it("should work when node.push is not a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            node.pushNode = null;
            node.push = null;

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");
        });
    });

    describe(".unshiftNode", () => {
        it("should throw an error when parent is not a node", () => {
            assert.throws(() => {
                util.unshiftNode();
            });
        });

        it("should add a node to the beginning of node.nodes", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });
            util.unshiftNode(node, a);
            util.unshiftNode(node, b);
            assert.equal(node.nodes[1].type, "a");
            assert.equal(node.nodes[0].type, "b");
        });

        it("should work when node.unshift is not a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            node.unshiftNode = null;
            node.unshift = null;

            util.unshiftNode(node, a);
            util.unshiftNode(node, b);
            assert.equal(node.nodes[1].type, "a");
            assert.equal(node.nodes[0].type, "b");
        });
    });

    describe(".popNode", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.popNode();
            });
        });

        it("should pop a node from node.nodes", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });
            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.popNode(node);
            util.popNode(node);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.pop is not a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            node.popNode = null;
            node.pop = null;

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.popNode(node);
            util.popNode(node);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.pop is a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            decorate(node);

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.popNode(node);
            util.popNode(node);
            assert.equal(node.nodes.length, 0);
        });
    });

    describe(".shiftNode", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.shiftNode();
            });
        });

        it("should shift a node from node.nodes", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });
            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.shiftNode(node);
            util.shiftNode(node);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.shift is not a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            node.shiftNode = null;
            node.shift = null;

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.shiftNode(node);
            util.shiftNode(node);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.shift is a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            decorate(node);

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.shiftNode(node);
            util.shiftNode(node);
            assert.equal(node.nodes.length, 0);
        });
    });

    describe(".removeNode", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.removeNode();
            });
        });

        it("should remove a node from node.nodes", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });
            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.removeNode(node, a);
            assert.equal(node.nodes.length, 1);

            util.removeNode(node, b);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.remove is not a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", value: "foo" });
            const b = new Node({ type: "b", value: "foo" });

            node.removeNode = null;
            node.remove = null;

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.removeNode(node, a);
            assert.equal(node.nodes.length, 1);

            util.removeNode(node, b);
            assert.equal(node.nodes.length, 0);
        });

        it("should work when node.remove is a function", () => {
            const node = new Node({ type: "brace" });
            const a = new Node({ type: "a", val: "foo" });
            const b = new Node({ type: "b", val: "foo" });

            decorate(node);

            util.pushNode(node, a);
            util.pushNode(node, b);
            assert.equal(node.nodes[0].type, "a");
            assert.equal(node.nodes[1].type, "b");

            util.removeNode(node, a);
            util.removeNode(node, b);
            assert.equal(node.nodes.length, 0);
        });

        it("should return when node.nodes does not exist", () => {
            assert.doesNotThrow(() => {
                const node = new Node({ type: "brace" });
                util.removeNode(node, node);
            });

            assert.doesNotThrow(() => {
                const node = new Node({ type: "brace" });
                node.removeNode = null;
                node.remove = null;
                util.removeNode(node, node);
            });
        });

        it("should return when the given node is not in node.nodes", () => {
            assert.doesNotThrow(() => {
                const node = new Node({ type: "brace" });
                const foo = new Node({ type: "foo" });
                const bar = new Node({ type: "bar" });
                util.pushNode(node, bar);
                util.removeNode(node, foo);
            });

            assert.doesNotThrow(() => {
                const node = new Node({ type: "brace" });
                const foo = new Node({ type: "foo" });
                const bar = new Node({ type: "bar" });
                node.removeNode = null;
                node.remove = null;
                util.pushNode(node, bar);
                util.removeNode(node, foo);
            });
        });
    });

    describe(".addOpen", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.addOpen();
            });
        });

        it("should add an open node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.addOpen(node, Node);
            assert.equal(node.nodes[0].type, "brace.open");
        });

        it("should work when node.unshift is a function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            decorate(node);
            util.addOpen(node, Node);
            assert.equal(node.nodes[0].type, "brace.open");
        });

        it("should work when node.unshift is not a function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            node.unshiftNode = null;
            node.unshift = null;
            util.addOpen(node, Node);
            assert.equal(node.nodes[0].type, "brace.open");
        });

        it("should take a filter function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.addOpen(node, Node, (node) => {
                return node.type !== "brace";
            });
            assert(!node.nodes);
        });

        it("should use the given value on the open node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.addOpen(node, Node, "{");
            assert.equal(node.nodes[0].value, "{");
        });
    });

    describe(".addClose", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.addClose();
            });
        });

        it("should add a close node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.pushNode(node, text);
            util.addClose(node, Node);

            assert.equal(node.nodes[0].type, "text");
            assert.equal(node.nodes[1].type, "brace.close");
        });

        it("should work when node.push is not a function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            node.pushNode = null;
            node.push = null;

            util.pushNode(node, text);
            util.addClose(node, Node);

            assert.equal(node.nodes[0].type, "text");
            assert.equal(node.nodes[1].type, "brace.close");
        });

        it("should work when node.push is a function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            decorate(node);

            util.pushNode(node, text);
            util.addClose(node, Node);

            assert.equal(node.nodes[0].type, "text");
            assert.equal(node.nodes[1].type, "brace.close");
        });

        it("should take a filter function", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.addClose(node, Node, (node) => {
                return node.type !== "brace";
            });
            assert(!node.nodes);
        });

        it("should use the given value on the close node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.addClose(node, Node, "}");
            assert.equal(node.nodes[0].value, "}");
        });
    });

    describe(".wrapNodes", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.wrapNodes();
            });
        });

        it("should add an open node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.wrapNodes(node, Node);

            assert.equal(node.nodes[0].type, "brace.open");
        });

        it("should add a close node", () => {
            const node = new Node({ type: "brace" });
            const text = new Node({ type: "text", value: "foo" });
            util.pushNode(node, text);
            util.wrapNodes(node, Node);

            assert.equal(node.nodes[0].type, "brace.open");
            assert.equal(node.nodes[1].type, "text");
            assert.equal(node.nodes[2].type, "brace.close");
        });
    });

    describe(".isEmpty", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.isEmpty();
            });
        });

        it("should return true node.value is an empty string", () => {
            assert(util.isEmpty(new Node({ type: "text", value: "" })));
        });

        it("should return true node.value is undefined", () => {
            assert(util.isEmpty(new Node({ type: "text" })));
        });

        it("should return true when node.nodes is empty", () => {
            const foo = new Node({ type: "foo" });
            const bar = new Node({ type: "text", value: "bar" });
            util.pushNode(foo, bar);
            assert(!util.isEmpty(foo));
            util.shiftNode(foo);
            assert(util.isEmpty(foo));
        });

        it("should return true when node.nodes is all non-text nodes", () => {
            const node = new Node({ type: "parent" });
            const foo = new Node({ type: "foo" });
            const bar = new Node({ type: "bar" });
            const baz = new Node({ type: "baz" });
            util.pushNode(node, foo);
            util.pushNode(node, bar);
            util.pushNode(node, baz);
            assert(util.isEmpty(foo));
        });

        it("should return call a custom function if only one node exists", () => {
            const foo = new Node({ type: "foo" });
            const text = new Node({ type: "text", value: "" });
            util.pushNode(foo, text);
            assert(util.isEmpty(foo, (node) => !node.value));
        });

        it("should return true when only open and close nodes exist", () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, close);
            assert(util.isEmpty(brace));
        });

        it('should call a custom function on "middle" nodes (1)', () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const text = new Node({ type: "text", value: "" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, text);
            util.pushNode(brace, text);
            util.pushNode(brace, text);
            util.pushNode(brace, close);
            assert(util.isEmpty(brace, (node) => {
                if (node.nodes && node.nodes.length === 0) {
                    return true;
                }
                return !util.value(node);
            }));
        });

        it('should call a custom function on "middle" nodes (2)', () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const text = new Node({ type: "text", value: "" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, text);
            util.pushNode(brace, text);
            util.pushNode(brace, text);
            util.pushNode(brace, close);
            assert(!util.isEmpty(brace, (node) => {
                return node.parent.nodes.length === 0;
            }));
        });

        it('should call a custom function on "middle" nodes (3)', () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const text = new Node({ type: "text", value: "foo" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, text);
            util.pushNode(brace, close);
            assert(!util.isEmpty(brace, (node) => {
                if (node.type !== "text") {
                    return false;
                }
                return node.value.trim() === "";
            }));
        });

        it('should call a custom function on "middle" nodes (4)', () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const empty = new Node({ type: "text", value: "" });
            const text = new Node({ type: "text", value: "foo" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, empty);
            util.pushNode(brace, empty);
            util.pushNode(brace, empty);
            util.pushNode(brace, empty);
            util.pushNode(brace, text);
            util.pushNode(brace, close);
            assert(!util.isEmpty(brace, (node) => {
                if (node.type !== "text") {
                    return false;
                }
                return node.value.trim() === "";
            }));
        });
    });

    describe(".isType", () => {
        it("should throw an error when matcher is invalid", () => {
            assert.throws(() => {
                util.isType(new Node({ type: "foo" }));
            });
        });

        it("should return false if the node is not the given type", () => {
            assert(!util.isType());
            assert(!util.isType({}, "root"));
        });

        it("should return true if the node is the given type", () => {
            assert(util.isType(ast, "root"));
            assert(util.isType(ast.last, "eos"));
        });
    });

    describe(".isInsideType", () => {
        it("should throw an error when parent is not a node", () => {
            assert.throws(() => {
                util.isInsideType();
            });
        });

        it("should throw an error when child not a node", () => {
            assert.throws(() => {
                util.isInsideType(new Node({ type: "foo" }));
            });
        });

        it("should return false when state.inside is not an object", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            assert(!util.isInsideType(state, "brace"));
        });

        it("should return false when state.inside[type] is not an object", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            assert(!util.isInsideType(state, "brace"));
        });

        it("should return true when state has the given type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(util.isInsideType(state, "brace"));
        });

        it("should return false when state does not have the given type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });

            util.addType(state, node);
            assert(util.isInsideType(state, "brace"));

            util.removeType(state, node);
            assert(!util.isInsideType(state, "brace"));
        });
    });

    describe(".isInside", () => {
        it("should throw an error when parent is not a node", () => {
            assert.throws(() => {
                util.isInside();
            });
        });

        it("should throw an error when child not a node", () => {
            assert.throws(() => {
                util.isInside(new Node({ type: "foo" }));
            });
        });

        it("should return false when state.inside is not an object", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            assert(!util.isInside(state, node, "brace"));
        });

        it("should return false when state.inside[type] is not an object", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            assert(!util.isInside(state, node, "brace"));
        });

        it("should return true when state has the given type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(util.isInside(state, node, "brace"));
        });

        it("should return true when state has one of the given types", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(util.isInside(state, node, ["foo", "brace"]));
        });

        it("should return false when state does not have one of the given types", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(!util.isInside(state, node, ["foo", "bar"]));
        });

        it("should return true when a regex matches a type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(util.isInside(state, node, /(foo|brace)/));
        });

        it("should return true when the type matches parent.type", () => {
            const state = {};
            const brace = new Node({ type: "brace" });
            const node = new Node({ type: "brace.open" });
            util.pushNode(brace, node);
            assert(util.isInside(state, node, "brace"));
        });

        it("should return true when regex matches parent.type", () => {
            const state = {};
            const brace = new Node({ type: "brace" });
            const node = new Node({ type: "brace.open" });
            util.pushNode(brace, node);
            assert(util.isInside(state, node, /(foo|brace)/));
        });

        it("should return false when a regex does not match a type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(!util.isInside(state, node, /(foo|bar)/));
        });

        it("should return false when type is invalie", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(!util.isInside(state, node, null));
        });

        it("should return false when state does not have the given type", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });

            util.addType(state, node);
            assert(util.isInside(state, node, "brace"));

            util.removeType(state, node);
            assert(!util.isInside(state, node, "brace"));
        });
    });

    describe(".hasType", () => {
        it("should return true if node.nodes has the given type", () => {
            assert(util.hasType(ast, "text"));
            assert(!util.hasType(ast, "foo"));
        });

        it("should return false when node.nodes does not exist", () => {
            assert(!util.hasType(new Node({ type: "foo" })));
        });
    });

    describe(".firstOfType", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.firstOfType();
            });
        });

        it("should get the first node of the given type", () => {
            const node = util.firstOfType(ast.nodes, "text");
            assert.equal(node.type, "text");
        });
    });

    describe(".last", () => {
        it("should get the last node", () => {
            assert.equal(util.last(ast.nodes).type, "eos");
        });
    });

    describe(".findNode", () => {
        it("should get the node with the given type", () => {
            const text = util.findNode(ast.nodes, "text");
            assert.equal(text.type, "text");
        });

        it("should get the node matching the given regex", () => {
            const text = util.findNode(ast.nodes, /text/);
            assert.equal(text.type, "text");
        });

        it("should get the first matching node", () => {
            let node = util.findNode(ast.nodes, [/text/, "bos"]);
            assert.equal(node.type, "bos");

            node = util.findNode(ast.nodes, [/text/]);
            assert.equal(node.type, "text");
        });

        it("should get the node at the given index", () => {
            const bos = util.findNode(ast.nodes, 0);
            assert.equal(bos.type, "bos");

            const text = util.findNode(ast.nodes, 1);
            assert.equal(text.type, "text");
        });

        it("should return null when node does not exist", () => {
            assert.equal(util.findNode(new Node({ type: "foo" })), null);
        });
    });

    describe(".removeNode", () => {
        it("should throw an error when parent is not a node", () => {
            assert.throws(() => {
                util.removeNode();
            });
        });

        it("should remove a node from parent.nodes", () => {
            const brace = new Node({ type: "brace" });
            const open = new Node({ type: "brace.open" });
            const foo = new Node({ type: "foo" });
            const bar = new Node({ type: "bar" });
            const baz = new Node({ type: "baz" });
            const qux = new Node({ type: "qux" });
            const close = new Node({ type: "brace.close" });
            util.pushNode(brace, open);
            util.pushNode(brace, foo);
            util.pushNode(brace, bar);
            util.pushNode(brace, baz);
            util.pushNode(brace, qux);
            util.pushNode(brace, close);

            assert.equal(brace.nodes.length, 6);
            assert.equal(brace.nodes[0].type, "brace.open");
            assert.equal(brace.nodes[1].type, "foo");
            assert.equal(brace.nodes[2].type, "bar");
            assert.equal(brace.nodes[3].type, "baz");
            assert.equal(brace.nodes[4].type, "qux");
            assert.equal(brace.nodes[5].type, "brace.close");

            // remove node
            util.removeNode(brace, bar);
            assert.equal(brace.nodes.length, 5);
            assert.equal(brace.nodes[0].type, "brace.open");
            assert.equal(brace.nodes[1].type, "foo");
            assert.equal(brace.nodes[2].type, "baz");
            assert.equal(brace.nodes[3].type, "qux");
            assert.equal(brace.nodes[4].type, "brace.close");
        });
    });

    describe(".isOpen", () => {
        it('should be true if node is an ".open" node', () => {
            const node = new Node({ type: "foo.open" });
            assert(util.isOpen(node));
        });

        it('should be false if node is not an ".open" node', () => {
            const node = new Node({ type: "foo" });
            assert(!util.isOpen(node));
        });
    });

    describe(".isClose", () => {
        it('should be true if node is a ".close" node', () => {
            const node = new Node({ type: "foo.close" });
            assert(util.isClose(node));
        });

        it('should be false if node is not a ".close" node', () => {
            const node = new Node({ type: "foo" });
            assert(!util.isClose(node));
        });
    });

    describe(".hasOpen", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.hasOpen();
            });
        });

        it('should be true if node has an ".open" node', () => {
            const parent = new Node({ type: "foo" });
            const node = new Node({ type: "foo.open" });
            util.pushNode(parent, node);
            assert(util.hasOpen(parent));
        });

        it('should be false if does not have an ".open" node', () => {
            const parent = new Node({ type: "foo" });
            assert(!util.hasOpen(parent));
        });
    });

    describe(".hasClose", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.hasClose();
            });
        });

        it('should be true if node has a ".close" node', () => {
            const parent = new Node({ type: "foo" });
            const open = new Node({ type: "foo.open" });
            const close = new Node({ type: "foo.close" });
            util.pushNode(parent, open);
            util.pushNode(parent, close);
            assert(util.hasClose(parent));
        });

        it('should be false if does not have a ".close" node', () => {
            const parent = new Node({ type: "foo" });
            assert(!util.hasClose(parent));
        });
    });

    describe(".hasOpenAndClose", () => {
        it("should throw an error when not a node", () => {
            assert.throws(() => {
                util.hasOpenAndClose();
            });
        });

        it('should be true if node has ".open" and ".close" nodes', () => {
            const parent = new Node({ type: "foo" });
            const open = new Node({ type: "foo.open" });
            const close = new Node({ type: "foo.close" });
            util.pushNode(parent, open);
            util.pushNode(parent, close);
            assert(util.hasOpenAndClose(parent));
        });

        it('should be false if does not have a ".close" node', () => {
            const parent = new Node({ type: "foo" });
            const open = new Node({ type: "foo.open" });
            util.pushNode(parent, open);
            assert(!util.hasOpenAndClose(parent));
        });

        it('should be false if does not have an ".open" node', () => {
            const parent = new Node({ type: "foo" });
            const close = new Node({ type: "foo.close" });
            util.pushNode(parent, close);
            assert(!util.hasOpenAndClose(parent));
        });
    });

    describe(".pushNode", () => {
        it("should throw an error when parent is not a node", () => {
            assert.throws(() => {
                util.pushNode();
            });
        });

        it("should add a node to `node.nodes`", () => {
            const node = new Node({ type: "foo" });
            util.pushNode(ast, node);
            assert.equal(ast.last.type, "foo");
        });

        it("should set the parent on the given node", () => {
            const node = new Node({ type: "foo" });
            util.pushNode(ast, node);
            assert.equal(node.parent.type, "root");
        });

        it("should set the parent.nodes as `.siblings` on the given node", () => {
            const node = new Node({ type: "foo" });
            assert.equal(node.siblings, null);
            util.pushNode(ast, node);
            assert.equal(node.siblings.length, 8);
        });
    });

    describe(".addType", () => {
        it("should throw an error when state is not given", () => {
            assert.throws(() => {
                util.addType();
            });
        });

        it("should throw an error when a node is not passed", () => {
            assert.throws(() => {
                util.addType({});
            });
        });

        it("should add the type to the state.inside array", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(state.inside);
            assert(state.inside.brace);
            assert.equal(state.inside.brace.length, 1);
        });

        it("should add the type based on parent.type", () => {
            const state = {};
            const parent = new Node({ type: "brace" });
            const node = new Node({ type: "brace.open" });
            util.pushNode(parent, node);
            util.addType(state, node);
            assert(state.inside);
            assert(state.inside.brace);
            assert.equal(state.inside.brace.length, 1);
        });
    });

    describe(".removeType", () => {
        it("should throw an error when state is not given", () => {
            assert.throws(() => {
                util.removeType();
            });
        });

        it("should throw an error when a node is not passed", () => {
            assert.throws(() => {
                util.removeType({});
            });
        });

        it("should add a state.inside object", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(state.inside);
        });

        it("should add a type array to the state.inside object", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(state.inside);
            assert(is.array(state.inside.brace));
        });

        it("should add the node to the state.inside type array", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(state.inside);
            assert(state.inside.brace);
            assert.equal(state.inside.brace.length, 1);
            util.removeType(state, node);
            assert.equal(state.inside.brace.length, 0);
        });

        it("should use a type array if it already exists", () => {
            const state = { inside: { brace: [new Node({ type: "brace.open" })] } };
            const node = new Node({ type: "brace" });
            util.addType(state, node);
            assert(state.inside);
            assert(state.inside.brace);
            assert.equal(state.inside.brace.length, 2);
            util.removeType(state, node);
            assert.equal(state.inside.brace.length, 1);
        });

        it("should remove the type based on parent.type", () => {
            const state = { inside: { brace: [new Node({ type: "brace.open" })] } };
            const parent = new Node({ type: "brace" });
            const node = new Node({ type: "brace.open" });
            util.pushNode(parent, node);
            util.addType(state, node);
            assert(state.inside);
            assert(state.inside.brace);
            assert.equal(state.inside.brace.length, 2);
            util.removeType(state, node);
            assert.equal(state.inside.brace.length, 1);
        });

        it("should throw an error when state.inside does not exist", () => {
            const state = {};
            const node = new Node({ type: "brace" });
            assert.throws(() => {
                util.removeType(state, node);
            });
        });

        it("should just return when state.inside type does not exist", () => {
            const state = { inside: {} };
            const node = new Node({ type: "brace" });
            util.removeType(state, node);
        });
    });
});
