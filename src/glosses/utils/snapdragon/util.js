const {
    is
} = adone;

/**
 * Shim to ensure the `.append` methods work with any version of snapdragon
 */
const _append = (compiler, val, node) => {
    if (!is.function(compiler.append)) {
        return compiler.emit(val, node);
    }
    return compiler.append(val, node);
};


/**
 * Simplified assertion. Throws an error is `value` is falsey.
 */
const assert = (value, message) => {
    if (!value) {
        throw new Error(message);
    }
};
const expect = (node, name, Node) => {
    const isNode = (Node && Node.isNode) ? Node.isNode : exports.isNode; // TODO: avoid exports
    assert(isNode(node), `expected ${name} to be an instance of Node`);
};

/**
 * Returns true if the given value is a node.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {boolean}
 */
export const isNode = function (node) {
    return is.object(node) && node.isNode === true;
};

/**
 * Emit an empty string for the given `node`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {undefined}
 */
export const noop = function (node) {
    _append(this, "", node);
};

/**
 * Returns `node.value` or `node.val`.
 *
 * ```js
 * const star = new Node({type: 'star', value: '*'});
 * const slash = new Node({type: 'slash', val: '/'});
 * console.log(utils.value(star)) //=> '*'
 * console.log(utils.value(slash)) //=> '/'
 * ```
 * @param {Object} `node` Instance of [snapdragon-node][]
 * @returns {String} returns
 * @api public
 */

export const value = function (node) {
    if (is.string(node.value)) {
        return node.value;
    }
    return node.val;
};

/**
 * Appdend `node.val` to `compiler.output`, exactly as it was created
 * by the parser.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {undefined}
 */
export const identity = function (node) {
    _append(this, value(node), node);
};

/**
 * Previously named `.emit`, this method appends the given `val`
 * to `compiler.output` for the given node. Useful when you know
 * what value should be appended advance, regardless of the actual
 * value of `node.val`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {Function} Returns a compiler middleware function.
 */
export const append = (value) => {
    return function (node) {
        _append(this, value, node);
    };
};

/**
 * Used in compiler middleware, this onverts an AST node into
 * an empty `text` node and deletes `node.nodes` if it exists.
 * The advantage of this method is that, as opposed to completely
 * removing the node, indices will not need to be re-calculated
 * in sibling nodes, and nothing is appended to the output.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Array} `nodes` Optionally pass a new `nodes` value, to replace the existing `node.nodes` array.
 */
export const toNoop = function (node, nodes) {
    if (nodes) {
        node.nodes = nodes;
    } else {
        delete node.nodes;
        node.type = "text";
        node.value = "";
    }
};

/**
 * Visit `node` with the given `fn`. The built-in `.visit` method in snapdragon
 * automatically calls registered compilers, this allows you to pass a visitor
 * function.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Function} `fn`
 * @returns {object} returns the node after recursively visiting all child nodes.
 */
export const visit = function (node, fn) {
    assert(is.function(fn), "expected a visitor function");
    expect(node, "node");
    fn(node);
    return node.nodes ? mapVisit(node, fn) : node; // eslint-disable-line no-use-before-define
};

/**
 * Map [visit](#visit) the given `fn` over `node.nodes`. This is called by
 * [visit](#visit), use this method if you do not want `fn` to be called on
 * the first node.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {object} `options`
 * @param {Function} `fn`
 * @returns {object} returns the node
 */
export const mapVisit = function (node, fn) {
    assert(is.function(fn), "expected a visitor function");
    expect(node, "node");
    assert(is.array(node.nodes), "expected node.nodes to be an array");

    for (let i = 0; i < node.nodes.length; i++) {
        visit(node.nodes[i], fn);
    }
    return node;
};

/**
 * Unshift `node` onto `parent.nodes`, and set `parent` as `node.parent.
 *
 * @param {object} `parent`
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {undefined}
 */
export const unshiftNode = function (parent, node) {
    assert(isNode(parent), "expected parent node to be an instance of Node");
    if (!node) {
        return;
    }

    if (is.function(parent.unshift)) {
        return parent.unshift(node);
    }

    node.define("parent", parent);
    parent.nodes = parent.nodes || [];
    parent.nodes.unshift(node);
};

/**
 * Push the given `node` onto `parent.nodes`, and set `parent` as `node.parent.
 *
 * @param {object} `parent`
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {object} Returns the child node
 */
export const pushNode = function (parent, node) {
    assert(isNode(parent), "expected parent node to be an instance of Node");
    if (!node) {
        return;
    }

    if (is.function(parent.push)) {
        return parent.push(node);
    }


    node.define("parent", parent);
    parent.nodes = parent.nodes || [];
    parent.nodes.push(node);
    return node;
};

/**
 * Unshift an `*.open` node onto `node.nodes`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Function} `Node` (required) Node constructor function from [snapdragon-node][].
 * @param {Function} `filter` Optionaly specify a filter function to exclude the node.
 * @returns {object} Returns the created opening node.
 */
export const addOpen = function (node, Node, value, filter) {
    expect(node, "node");
    assert(is.function(Node), "expected Node to be a constructor function");

    if (is.function(value)) {
        filter = value;
        value = "";
    }

    if (is.function(filter) && !filter(node)) {
        return;
    }
    const open = new Node({ type: `${node.type}.open`, value });
    const unshift = node.unshift || node.unshiftNode;
    if (is.function(unshift)) {
        unshift.call(node, open);
    } else {
        unshiftNode(node, open);
    }
    return open;
};

/**
 * Push a `*.close` node onto `node.nodes`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Function} `Node` (required) Node constructor function from [snapdragon-node][].
 * @param {Function} `filter` Optionaly specify a filter function to exclude the node.
 * @returns {object} Returns the created closing node.
 */
export const addClose = function (node, Node, value, filter) {
    assert(is.function(Node), "expected Node to be a constructor function");
    expect(node, "node", Node);

    if (is.function(value)) {
        filter = value;
        value = "";
    }

    if (is.function(filter) && !filter(node)) {
        return;
    }
    const close = new Node({ type: `${node.type}.close`, value });
    const push = node.push || node.pushNode;
    if (is.function(push)) {
        push.call(node, close);
    } else {
        pushNode(node, close);
    }
    return close;
};

/**
 * Wraps the given `node` with `*.open` and `*.close` nodes.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Function} `Node` (required) Node constructor function from [snapdragon-node][].
 * @param {Function} `filter` Optionaly specify a filter function to exclude the node.
 * @returns {object} Returns the node
 */
export const wrapNodes = function (node, Node, filter) {
    assert(isNode(node), "expected node to be an instance of Node");
    assert(is.function(Node), "expected Node to be a constructor function");

    addOpen(node, Node, filter);
    addClose(node, Node, filter);
    return node;
};

/**
 * Pop the last `node` off of `parent.nodes`. The advantage of
 * using this method is that it checks for `node.nodes` and works
 * with any version of `snapdragon-node`.
 *
 * @param {object} `parent`
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {Number|Undefined} Returns the length of `node.nodes` or undefined.
 */
export const popNode = function (node) {
    assert(isNode(node), "expected node to be an instance of Node");
    if (is.function(node.pop)) {
        return node.pop();
    }
    return node.nodes && node.nodes.pop();
};

/**
 * Shift the first `node` off of `parent.nodes`. The advantage of
 * using this method is that it checks for `node.nodes` and works
 * with any version of `snapdragon-node`.
 *
 * @param {object} `parent`
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {Number|Undefined} Returns the length of `node.nodes` or undefined.
 */
export const shiftNode = function (node) {
    assert(isNode(node), "expected node to be an instance of Node");
    if (is.function(node.shift)) {
        return node.shift();
    }
    return node.nodes && node.nodes.shift();
};

/**
 * Remove the specified `node` from `parent.nodes`.
 *
 * @param {object} `parent`
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {Object|undefined} Returns the removed node, if successful, or undefined if it does not exist on `parent.nodes`.
 */
export const removeNode = function (parent, node) {
    assert(isNode(parent), "expected parent to be an instance of Node");
    if (!parent.nodes) {
        return;
    }
    if (!node) {
        return;
    }

    if (is.function(parent.remove)) {
        return parent.remove(node);
    }

    const idx = parent.nodes.indexOf(node);
    if (idx !== -1) {
        return parent.nodes.splice(idx, 1);
    }
};

/**
 * Returns true if `node.type` matches the given `type`. Throws a
 * `TypeError` if `node` is not an instance of `Node`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {string} `type`
 * @returns {boolean}
 */
export const isType = function (node, type) {
    if (!isNode(node)) {
        return false;
    }
    switch (adone.meta.typeOf(type)) {
        case "string":
            return node.type === type;
        case "RegExp":
            return type.test(node.type);
        case "Array": {
            for (const key of type.slice()) {
                if (isType(node, key)) {
                    return true;
                }
            }
            return false;
        }
        default: {
            throw new TypeError('expected "type" to be an array, string or regexp');
        }
    }
};

/**
 * Returns true if the given `node` has the given `type` in `node.nodes`.
 * Throws a `TypeError` if `node` is not an instance of `Node`.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {string} `type`
 * @returns {boolean}
 */
export const hasType = function (node, type) {
    if (!isNode(node)) {
        return false;
    }
    if (!is.array(node.nodes)) {
        return false;
    }
    for (const child of node.nodes) {
        if (isType(child, type)) {
            return true;
        }
    }
    return false;
};

/**
 * Returns the first node from `node.nodes` of the given `type`
 *
 * @param {Array} `nodes`
 * @param {string} `type`
 * @return {Object|undefined} Returns the first matching node or undefined.
 */
export const firstOfType = function (nodes, type) {
    for (const node of nodes) {
        if (isType(node, type)) {
            return node;
        }
    }
};

/**
 * Returns the node at the specified index, or the first node of the
 * given `type` from `node.nodes`.
 *
 * @param {Array} `nodes`
 * @param {String|Number} `type` Node type or index.
 * @returns {object} Returns a node or undefined.
 */
export const findNode = function (nodes, type) {
    if (!is.array(nodes)) {
        return null;
    }
    if (is.number(type)) {
        return nodes[type];
    }
    return firstOfType(nodes, type);
};

/**
 * Returns true if the given node is an "*.open" node.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {boolean}
 */
export const isOpen = function (node) {
    if (!node) {
        return false;
    }
    if (node.parent && is.function(node.parent.isOpen)) {
        return node.parent.isOpen(node);
    }
    if (node && is.function(node.isOpen)) {
        return node.isOpen(node);
    }
    return node.type ? node.type.slice(-5) === ".open" : false;
};

/**
 * Returns true if the given node is a "*.close" node.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {boolean}
 */
export const isClose = function (node) {
    if (!node) {
        return false;
    }
    if (node.parent && is.function(node.parent.isClose)) {
        return node.parent.isClose(node);
    }
    if (node && is.function(node.isClose)) {
        return node.isClose(node);
    }
    return node.type ? node.type.slice(-6) === ".close" : false;
};

/**
 * Returns true if the given node is an "*.open" node.
 *
 * @param {Object} `node` Instance of [snapdragon-node][]
 * @return {Boolean}
 * @api public
 */
export const isBlock = function (node) {
    if (!node || !isNode(node)) {
        return false;
    }
    if (!is.array(node.nodes)) {
        return false;
    }
    if (node.parent && is.function(node.parent.isBlock)) {
        return node.parent.isBlock(node);
    }
    if (is.function(node.isBlock)) {
        return node.isBlock(node);
    }
    return hasOpenAndClose(node);
};

/**
 * Returns true if `node.nodes` **has** an `.open` node
 *
 * @param {object} `node` Node
 * @returns {boolean}
 */
export const hasOpen = function (node) {
    assert(isNode(node), "expected node to be an instance of Node");
    const first = node.first || node.nodes ? node.nodes[0] : null;
    if (!isNode(first)) {
        return false;
    }
    if (is.function(node.isOpen)) {
        return node.isOpen(first);
    }
    return first.type === `${node.type}.open`;
};

/**
 * Returns true if `node.nodes` **has** a `.close` node
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {boolean}
 */
export const hasClose = function (node) {
    assert(isNode(node), "expected node to be an instance of Node");
    const last = node.last || node.nodes ? node.nodes[node.nodes.length - 1] : null;
    if (!isNode(last)) {
        return false;
    }
    if (is.function(node.isClose)) {
        return node.isClose(last);
    }
    return last.type === `${node.type}.close`;
};

/**
 * Returns true if `node.nodes` has both `.open` and `.close` nodes
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @returns {boolean}
 */
export const hasOpenAndClose = function (node) {
    return hasOpen(node) && hasClose(node);
};

/**
 * Push the given `node` onto the `state.inside` array for the
 * given type. This array is used as a specialized "stack" for
 * only the given `node.type`.
 *
 * @param {object} `state` The `compiler.state` object or custom state object.
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {Array} Returns the `state.inside` stack for the given type.
 */
export const addType = function (state, node) {
    assert(isNode(node), "expected node to be an instance of Node");
    assert(is.object(state), "expected state to be an object");

    const type = node.parent
        ? node.parent.type
        : node.type.replace(/\.open$/, "");

    if (!state.hasOwnProperty("inside")) {
        state.inside = {};
    }
    if (!state.inside.hasOwnProperty(type)) {
        state.inside[type] = [];
    }

    const arr = state.inside[type];
    arr.push(node);
    return arr;
};

/**
 * Remove the given `node` from the `state.inside` array for the
 * given type. This array is used as a specialized "stack" for
 * only the given `node.type`.
 *
 * @param {object} `state` The `compiler.state` object or custom state object.
 * @param {object} `node` Instance of [snapdragon-node][]
 * @return {Array} Returns the `state.inside` stack for the given type.
 */
export const removeType = function (state, node) {
    assert(isNode(node), "expected node to be an instance of Node");
    assert(is.object(state), "expected state to be an object");

    const type = node.parent
        ? node.parent.type
        : node.type.replace(/\.close$/, "");

    if (state.inside.hasOwnProperty(type)) {
        return state.inside[type].pop();
    }
};

/**
 * Returns true if `node.val` is an empty string, or `node.nodes` does
 * not contain any non-empty text nodes.
 *
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {Function} `fn`
 * @returns {boolean}
 */
export const isEmpty = function (node, fn) {
    assert(isNode(node), "expected node to be an instance of Node");

    if (!is.array(node.nodes)) {
        if (is.function(fn)) {
            return fn(node);
        }
        return !value(node);
    }

    if (node.nodes.length === 0) {
        return true;
    }

    for (const child of node.nodes) {
        if (!isEmpty(child, fn)) {
            return false;
        }
    }

    return true;
};

/**
 * Returns true if the `state.inside` stack for the given type exists
 * and has one or more nodes on it.
 *
 * @param {object} `state`
 * @param {string} `type`
 * @returns {boolean}
 */
export const isInsideType = function (state, type) {
    assert(is.object(state), "expected state to be an object");
    assert(is.string(type), "expected type to be a string");

    if (!state.hasOwnProperty("inside")) {
        return false;
    }

    if (!state.inside.hasOwnProperty(type)) {
        return false;
    }

    return state.inside[type].length > 0;
};

/**
 * Returns true if `node` is either a child or grand-child of the given `type`,
 * or `state.inside[type]` is a non-empty array.
 *
 * @param {object} `state` Either the `compiler.state` object, if it exists, or a user-supplied state object.
 * @param {object} `node` Instance of [snapdragon-node][]
 * @param {string} `type` The `node.type` to check for.
 * @returns {boolean}
 */
export const isInside = function (state, node, type) {
    assert(isNode(node), "expected node to be an instance of Node");
    assert(is.object(state), "expected state to be an object");

    if (is.array(type)) {
        for (let i = 0; i < type.length; i++) {
            if (isInside(state, node, type[i])) {
                return true;
            }
        }
        return false;
    }

    const parent = node.parent;
    if (is.string(type)) {
        return (parent && parent.type === type) || isInsideType(state, type);
    }

    if (adone.meta.typeOf(type) === "RegExp") {
        if (parent && parent.type && type.test(parent.type)) {
            return true;
        }

        const keys = Object.keys(state.inside);
        const len = keys.length;
        let idx = -1;
        while (++idx < len) {
            const key = keys[idx];
            const value = state.inside[key];

            if (is.array(value) && value.length !== 0 && type.test(key)) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Get the last `n` element from the given `array`. Used for getting
 * a node from `node.nodes.`
 *
 * @param {Array} `array`
 * @param {number} `n`
 * @return {undefined}
 */
export const last = function (arr, n) {
    return is.array(arr) ? arr[arr.length - (n || 1)] : null;
};

export const lastNode = function (node) {
    return is.array(node.nodes) ? last(node.nodes) : null;
};

/**
 * Cast the given `value` to an array.
 *
 * @param {any} `value`
 * @return {Array}
 */
export const arrayify = function (value) {
    if (is.string(value) && value !== "") {
        return [value];
    }
    if (!is.array(value)) {
        return [];
    }
    return value;
};

/**
 * Convert the given `value` to a string by joining with `,`. Useful
 * for creating a cheerio/CSS/DOM-style selector from a list of strings.
 *
 * @param {any} `value`
 * @return {Array}
 */
export const stringify = function (value) {
    return arrayify(value).join(",");
};
