const {
    exception,
    is,
    util: { Snapdragon }
} = adone;

const {
    util
} = adone.private(Snapdragon);

let ownNames;

/**
 * Get own property names from Node prototype, but only the
 * first time `Node` is instantiated
 */
const lazyKeys = () => {
    if (!ownNames) {
        ownNames = Object.getOwnPropertyNames(Node.prototype); // eslint-disable-line no-use-before-define
    }
};

/**
 * Create a new AST `Node` with the given `val` and `type`.
 *
 * @param {String|Object} `val` Pass a matched substring, or an object to merge onto the node.
 * @param {string} `type` The node type to use when `val` is a string.
 * @returns {object} node instance
 */
export default class Node {
    constructor(val, type, parent) {
        if (!is.string(type)) {
            parent = type;
            type = null;
        }

        Object.defineProperties(this, {
            parent: {
                value: parent,
                configurable: true,
                enumerable: false
            },
            isNode: {
                value: true,
                configurable: true,
                enumerable: false
            },
            expect: {
                value: null,
                configurable: true,
                enumerable: false
            }
        });

        if (is.object(val)) {
            lazyKeys();
            const keys = Object.keys(val);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (!ownNames.includes(key)) {
                    this[key] = val[key];
                }
            }
        } else {
            this.type = type;
            this.val = val;
        }
    }

    /**
     * Define a non-enumberable property on the node instance.
     * Useful for adding properties that shouldn't be extended
     * or visible during debugging.
     *
     * @param {string} `name`
     * @param {any} `val`
     * @returns {object} returns the node instance
     */
    define(name, value) {
        Object.defineProperty(this, name, {
            value,
            enumerable: false,
            configurable: true,
            writable: true
        });
        return this;
    }

    /**
     * Returns true if `node.val` is an empty string, or `node.nodes` does
     * not contain any non-empty text nodes.
     *
     * @param {Function} `fn` (optional) Filter function that is called on `node` and/or child nodes. `isEmpty` will return false immediately when the filter function returns false on any nodes.
     * @returns {boolean}
     */
    isEmpty(fn) {
        return util.isEmpty(this, fn);
    }

    /**
     * Given node `foo` and node `bar`, push node `bar` onto `foo.nodes`, and
     * set `foo` as `bar.parent`.
     *
     * @param {object} `node`
     * @return {Number} Returns the length of `node.nodes`
     */
    push(node) {
        if (!Node.isNode(node)) {
            throw new exception.InvalidArgument("expected node to be an instance of Node");
        }

        Object.defineProperty(node, "parent", {
            value: this,
            configurable: true,
            enumerable: false,
            writable: true
        });

        this.nodes = this.nodes || [];
        return this.nodes.push(node);
    }

    /**
     * Given node `foo` and node `bar`, unshift node `bar` onto `foo.nodes`, and
     * set `foo` as `bar.parent`.
     *
     * @param {object} `node`
     * @return {Number} Returns the length of `node.nodes`
     */
    unshift(node) {
        if (!Node.isNode(node)) {
            throw new exception.InvalidArgument("expected node to be an instance of Node");
        }

        Object.defineProperty(node, "parent", {
            value: this,
            configurable: true,
            enumerable: false,
            writable: true
        });

        this.nodes = this.nodes || [];
        return this.nodes.unshift(node);
    }

    /**
     * Pop a node from `node.nodes`.
     *
     * @return {Number} Returns the popped `node`
     */
    pop() {
        return this.nodes && this.nodes.pop();
    }

    /**
     * Shift a node from `node.nodes`.
     *
     * @returns {object} Returns the shifted `node`
     */
    shift() {
        return this.nodes && this.nodes.shift();
    }

    /**
     * Remove `node` from `node.nodes`.
     *
     * @param {object} `node`
     * @returns {object} Returns the removed node.
     */
    remove(node) {
        if (!Node.isNode(node)) {
            throw new exception.InvalidArgument("expected node to be an instance of Node");
        }

        this.nodes = this.nodes || [];
        const idx = node.index;
        if (idx !== -1) {
            node.index = -1;
            return this.nodes.splice(idx, 1);
        }
        return null;
    }

    /**
     * Get the first child node from `node.nodes` that matches the given `type`.
     * If `type` is a number, the child node at that index is returned.
     *
     * @param {string} `type`
     * @returns {object} Returns a child node or undefined.
     */
    find(type) {
        return util.findNode(this.nodes, type);
    }

    /**
     * Return true if the node is the given `type`.
     *
     * @param {string} `type`
     * @returns {boolean}
     */
    isType(type) {
        return util.isType(this, type);
    }

    /**
     * Return true if the `node.nodes` has the given `type`.
     *
     * @param {string} `type`
     * @returns {boolean}
     */
    hasType(type) {
        return util.hasType(this, type);
    }


    /**
     * Get the siblings array, or `null` if it doesn't exist.
     *
     * @return {Array}
     */
    get siblings() {
        return this.parent ? this.parent.nodes : null;
    }

    set siblings(value) {
        throw new Error("node.siblings is a getter and cannot be defined");
    }

    /**
     * Get the node's current index from `node.parent.nodes`.
     * This should always be correct, even when the parent adds nodes.
     *
     * @return {Number}
     */
    set index(index) {
        Object.defineProperty(this, "idx", {
            value: index,
            configurable: true,
            enumerable: false,
            writable: true
        });
    }

    get index() {
        if (!is.array(this.siblings)) {
            return -1;
        }
        const tok = this.idx !== -1 ? this.siblings[this.idx] : null;
        if (tok !== this) {
            Object.defineProperty(this, "idx", {
                value: this.siblings.indexOf(this),
                configurable: true,
                enumerable: false,
                writable: true
            });
        }
        return this.idx;
    }

    set prev(value) {
        throw new Error("node.prev is a getter and cannot be defined");
    }

    /**
     * Get the previous node from the siblings array or `null`.
     *
     * @returns {object}
     */
    get prev() {
        if (is.array(this.siblings)) {
            return this.siblings[this.index - 1] || this.parent.prev;
        }
        return null;
    }

    set next(value) {
        throw new Error("node.next is a getter and cannot be defined");
    }

    /**
     * Get the siblings array, or `null` if it doesn't exist.
     *
     * @returns {object}
     */
    get next() {
        if (is.array(this.siblings)) {
            return this.siblings[this.index + 1] || this.parent.next;
        }
        return null;
    }

    /**
     * Get the first node from `node.nodes`.
     *
     * @returns {object} The first node, or undefiend
     */
    get first() {
        return this.nodes ? this.nodes[0] : null;
    }

    /**
     * Get the last node from `node.nodes`.
     *
     * @returns {object} The last node, or undefiend
     */
    get last() {
        return this.nodes ? util.last(this.nodes) : null;
    }

    /**
     * Get the last node from `node.nodes`.
     *
     * @returns {object} The last node, or undefiend
     */
    get scope() {
        if (this.isScope !== true) {
            return this.parent ? this.parent.scope : this;
        }
        return this;
    }


    /**
     * Returns true if the given value is a node.
     *
     * @param {object} `node`
     * @returns {boolean}
     */
    static isNode(node) {
        return util.isNode(node);
    }
}
