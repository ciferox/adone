const RED = 0;
const BLACK = 1;

class RBNode {
    constructor(color, key, value, left, right, count) {
        this._color = color;
        this.key = key;
        this.value = value;
        this.left = left;
        this.right = right;
        this._count = count;
    }
}

const cloneNode = (node) => new RBNode(node._color, node.key, node.value, node.left, node.right, node._count);
const repaint = (color, node) => new RBNode(color, node.key, node.value, node.left, node.right, node._count);
const recount = (node) => (node._count = 1 + (node.left ? node.left._count : 0) + (node.right ? node.right._count : 0));

// Visit all nodes inorder
const doVisitFull = (visit, node) => {
    if (node.left) {
        const v = doVisitFull(visit, node.left);
        if (v) {
            return v;
        }
    }
    const v = visit(node.key, node.value);
    if (v) {
        return v;
    }
    if (node.right) {
        return doVisitFull(visit, node.right);
    }
};

// Visit half nodes in order
const doVisitHalf = (lo, compare, visit, node) => {
    const l = compare(lo, node.key);
    if (l <= 0) {
        if (node.left) {
            const v = doVisitHalf(lo, compare, visit, node.left);
            if (v) {
                return v;
            }
        }
        const v = visit(node.key, node.value);
        if (v) {
            return v;
        }
    }
    if (node.right) {
        return doVisitHalf(lo, compare, visit, node.right);
    }
};

// Visit all nodes within a range
const doVisit = (lo, hi, compare, visit, node) => {
    const l = compare(lo, node.key);
    const h = compare(hi, node.key);
    let v;
    if (l <= 0) {
        if (node.left) {
            v = doVisit(lo, hi, compare, visit, node.left);
            if (v) {
                return v;
            }
        }
        if (h > 0) {
            v = visit(node.key, node.value);
            if (v) {
                return v;
            }
        }
    }
    if (h > 0 && node.right) {
        return doVisit(lo, hi, compare, visit, node.right);
    }
};

// Swaps two nodes
const swapNode = (n, v) => {
    n.key = v.key;
    n.value = v.value;
    n.left = v.left;
    n.right = v.right;
    n._color = v._color;
    n._count = v._count;
};

//Fix up a double black node in a tree
const fixDoubleBlack = (stack) => {
    let n;
    let p;
    let s;
    let z;
    for (let i = stack.length - 1; i >= 0; --i) {
        n = stack[i];
        if (i === 0) {
            n._color = BLACK;
            return;
        }
        //console.log("visit node:", n.key, i, stack[i].key, stack[i-1].key)
        p = stack[i - 1];
        if (p.left === n) {
            //console.log("left child")
            s = p.right;
            if (s.right && s.right._color === RED) {
                //console.log("case 1: right sibling child red")
                s = p.right = cloneNode(s);
                z = s.right = cloneNode(s.right);
                p.right = s.left;
                s.left = p;
                s.right = z;
                s._color = p._color;
                n._color = BLACK;
                p._color = BLACK;
                z._color = BLACK;
                recount(p);
                recount(s);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.left === p) {
                        pp.left = s;
                    } else {
                        pp.right = s;
                    }
                }
                stack[i - 1] = s;
                return;
            } else if (s.left && s.left._color === RED) {
                //console.log("case 1: left sibling child red")
                s = p.right = cloneNode(s);
                z = s.left = cloneNode(s.left);
                p.right = z.left;
                s.left = z.right;
                z.left = p;
                z.right = s;
                z._color = p._color;
                p._color = BLACK;
                s._color = BLACK;
                n._color = BLACK;
                recount(p);
                recount(s);
                recount(z);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.left === p) {
                        pp.left = z;
                    } else {
                        pp.right = z;
                    }
                }
                stack[i - 1] = z;
                return;
            }
            if (s._color === BLACK) {
                if (p._color === RED) {
                    //console.log("case 2: black sibling, red parent", p.right.value)
                    p._color = BLACK;
                    p.right = repaint(RED, s);
                    return;
                }
                //console.log("case 2: black sibling, black parent", p.right.value)
                p.right = repaint(RED, s);
                continue;

            } else {
                //console.log("case 3: red sibling")
                s = cloneNode(s);
                p.right = s.left;
                s.left = p;
                s._color = p._color;
                p._color = RED;
                recount(p);
                recount(s);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.left === p) {
                        pp.left = s;
                    } else {
                        pp.right = s;
                    }
                }
                stack[i - 1] = s;
                stack[i] = p;
                if (i + 1 < stack.length) {
                    stack[i + 1] = n;
                } else {
                    stack.push(n);
                }
                i = i + 2;
            }
        } else {
            //console.log("right child")
            s = p.left;
            if (s.left && s.left._color === RED) {
                //console.log("case 1: left sibling child red", p.value, p._color)
                s = p.left = cloneNode(s);
                z = s.left = cloneNode(s.left);
                p.left = s.right;
                s.right = p;
                s.left = z;
                s._color = p._color;
                n._color = BLACK;
                p._color = BLACK;
                z._color = BLACK;
                recount(p);
                recount(s);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.right === p) {
                        pp.right = s;
                    } else {
                        pp.left = s;
                    }
                }
                stack[i - 1] = s;
                return;
            } else if (s.right && s.right._color === RED) {
                //console.log("case 1: right sibling child red")
                s = p.left = cloneNode(s);
                z = s.right = cloneNode(s.right);
                p.left = z.right;
                s.right = z.left;
                z.right = p;
                z.left = s;
                z._color = p._color;
                p._color = BLACK;
                s._color = BLACK;
                n._color = BLACK;
                recount(p);
                recount(s);
                recount(z);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.right === p) {
                        pp.right = z;
                    } else {
                        pp.left = z;
                    }
                }
                stack[i - 1] = z;
                return;
            }
            if (s._color === BLACK) {
                if (p._color === RED) {
                    //console.log("case 2: black sibling, red parent")
                    p._color = BLACK;
                    p.left = repaint(RED, s);
                    return;
                }
                //console.log("case 2: black sibling, black parent")
                p.left = repaint(RED, s);
                continue;

            } else {
                //console.log("case 3: red sibling")
                s = cloneNode(s);
                p.left = s.right;
                s.right = p;
                s._color = p._color;
                p._color = RED;
                recount(p);
                recount(s);
                if (i > 1) {
                    const pp = stack[i - 2];
                    if (pp.right === p) {
                        pp.right = s;
                    } else {
                        pp.left = s;
                    }
                }
                stack[i - 1] = s;
                stack[i] = p;
                if (i + 1 < stack.length) {
                    stack[i + 1] = n;
                } else {
                    stack.push(n);
                }
                i = i + 2;
            }
        }
    }
};

let RedBlackTreeRef = null;

class RedBlackTreeIterator {
    constructor(tree, stack) {
        this.tree = tree;
        this._stack = stack;
    }

    /**
     * Checks if the iterator is valid
     */
    get valid() {
        return this._stack.length > 0;
    }

    /**
     * The value of the node at the iterator's current position
     */
    get node() {
        if (this._stack.length > 0) {
            return this._stack[this._stack.length - 1];
        }
        return null;
    }

    /**
     * The key of the item referenced by the iterator
     */
    get key() {
        if (this._stack.length > 0) {
            return this._stack[this._stack.length - 1].key;
        }
    }

    /**
     * The value of the item referenced by the iterator
     */
    get value() {
        if (this._stack.length > 0) {
            return this._stack[this._stack.length - 1].value;
        }
    }

    /**
     * Returns the position of this iterator in the sequence
     *
     * @returns {number}
     */
    get index() {
        let idx = 0;
        const stack = this._stack;
        if (stack.length === 0) {
            const r = this.tree.root;
            if (r) {
                return r._count;
            }
            return 0;
        } else if (stack[stack.length - 1].left) {
            idx = stack[stack.length - 1].left._count;
        }
        for (let s = stack.length - 2; s >= 0; --s) {
            if (stack[s + 1] === stack[s].right) {
                ++idx;
                if (stack[s].left) {
                    idx += stack[s].left._count;
                }
            }
        }
        return idx;
    }

    /**
     * If true, then the iterator is not at the end of the sequence
     */
    get hasNext() {
        const stack = this._stack;
        if (stack.length === 0) {
            return false;
        }
        if (stack[stack.length - 1].right) {
            return true;
        }
        for (let s = stack.length - 1; s > 0; --s) {
            if (stack[s - 1].left === stack[s]) {
                return true;
            }
        }
        return false;
    }

    /**
     * If true, then the iterator is not at the beginning of the sequence
     */
    get hasPrev() {
        const stack = this._stack;
        if (stack.length === 0) {
            return false;
        }
        if (stack[stack.length - 1].left) {
            return true;
        }
        for (let s = stack.length - 1; s > 0; --s) {
            if (stack[s - 1].right === stack[s]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Makes a copy of the iterator
     */
    clone() {
        return new RedBlackTreeIterator(this.tree, this._stack.slice());
    }

    /**
     * Removes the item at the position of the iterator
     *
     * @returns {RedBlackTree} A new binary search tree with iter's item removed
     */
    remove() {
        const stack = this._stack;
        if (stack.length === 0) {
            return this.tree;
        }
        //First copy path to node
        const cstack = new Array(stack.length);
        let n = stack[stack.length - 1];
        cstack[cstack.length - 1] = new RBNode(n._color, n.key, n.value, n.left, n.right, n._count);
        for (let i = stack.length - 2; i >= 0; --i) {
            n = stack[i];
            if (n.left === stack[i + 1]) {
                cstack[i] = new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count);
            } else {
                cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
            }
        }

        //Get node
        n = cstack[cstack.length - 1];
        //console.log("start remove: ", n.value)

        //If not leaf, then swap with previous node
        if (n.left && n.right) {
            //console.log("moving to leaf")

            //First walk to previous leaf
            const split = cstack.length;
            n = n.left;
            while (n.right) {
                cstack.push(n);
                n = n.right;
            }
            //Copy path to leaf
            const v = cstack[split - 1];
            cstack.push(new RBNode(n._color, v.key, v.value, n.left, n.right, n._count));
            cstack[split - 1].key = n.key;
            cstack[split - 1].value = n.value;

            //Fix up stack
            for (let i = cstack.length - 2; i >= split; --i) {
                n = cstack[i];
                cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
            }
            cstack[split - 1].left = cstack[split];
        }
        //console.log("stack=", cstack.map(function(v) { return v.value }))

        //Remove leaf node
        n = cstack[cstack.length - 1];
        if (n._color === RED) {
            //Easy case: removing red leaf
            //console.log("RED leaf")
            const p = cstack[cstack.length - 2];
            if (p.left === n) {
                p.left = null;
            } else if (p.right === n) {
                p.right = null;
            }
            cstack.pop();
            for (let i = 0; i < cstack.length; ++i) {
                cstack[i]._count--;
            }
            return new RedBlackTreeRef(this.tree._compare, cstack[0]);
        }
        if (n.left || n.right) {
            //Second easy case:  Single child black parent
            //console.log("BLACK single child")
            if (n.left) {
                swapNode(n, n.left);
            } else if (n.right) {
                swapNode(n, n.right);
            }
            //Child must be red, so repaint it black to balance color
            n._color = BLACK;
            for (let i = 0; i < cstack.length - 1; ++i) {
                cstack[i]._count--;
            }
            return new RedBlackTreeRef(this.tree._compare, cstack[0]);
        } else if (cstack.length === 1) {
            //Third easy case: root
            //console.log("ROOT")
            return new RedBlackTreeRef(this.tree._compare, null);
        }
        //Hard case: Repaint n, and then do some nasty stuff
        //console.log("BLACK leaf no children")
        for (let i = 0; i < cstack.length; ++i) {
            cstack[i]._count--;
        }
        const parent = cstack[cstack.length - 2];
        fixDoubleBlack(cstack);
        //Fix up links
        if (parent.left === n) {
            parent.left = null;
        } else {
            parent.right = null;
        }


        return new RedBlackTreeRef(this.tree._compare, cstack[0]);
    }

    /**
     * Advances the iterator to the next position
     */
    next() {
        const stack = this._stack;
        if (stack.length === 0) {
            return;
        }
        let n = stack[stack.length - 1];
        if (n.right) {
            n = n.right;
            while (n) {
                stack.push(n);
                n = n.left;
            }
        } else {
            stack.pop();
            while (stack.length > 0 && stack[stack.length - 1].right === n) {
                n = stack[stack.length - 1];
                stack.pop();
            }
        }
    }

    /**
     * Updates the value of the node in the tree at this iterator
     *
     * @returns {RedBlackTree} A new binary search tree with the corresponding node updated
     */
    update(value) {
        const stack = this._stack;
        if (stack.length === 0) {
            throw new Error("Can't update empty node!");
        }
        const cstack = new Array(stack.length);
        let n = stack[stack.length - 1];
        cstack[cstack.length - 1] = new RBNode(n._color, n.key, value, n.left, n.right, n._count);
        for (let i = stack.length - 2; i >= 0; --i) {
            n = stack[i];
            if (n.left === stack[i + 1]) {
                cstack[i] = new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count);
            } else {
                cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
            }
        }
        return new RedBlackTreeRef(this.tree._compare, cstack[0]);
    }

    /**
     * Moves the iterator backward one element
     */
    prev() {
        const stack = this._stack;
        if (stack.length === 0) {
            return;
        }
        let n = stack[stack.length - 1];
        if (n.left) {
            n = n.left;
            while (n) {
                stack.push(n);
                n = n.right;
            }
        } else {
            stack.pop();
            while (stack.length > 0 && stack[stack.length - 1].left === n) {
                n = stack[stack.length - 1];
                stack.pop();
            }
        }
    }
}

export default class RedBlackTree {
    constructor(compare = ((a, b) => (a < b) ? -1 : (a > b ? 1 : 0)), root = null) {
        this._compare = compare;
        this.root = root;
    }

    /**
     * A sorted array of all the keys in the tree
     *
     * @returns {any[]}
     */
    get keys() {
        const result = [];
        this.forEach((k) => {
            result.push(k);
        });
        return result;
    }

    /**
     * An array of all the values in the tree
     *
     * @returns {any[]}
     */
    get values() {
        const result = [];
        this.forEach((k, v) => {
            result.push(v);
        });
        return result;
    }

    /**
     * The number of items in the tree
     *
     * @returns {number}
     */
    get length() {
        if (this.root) {
            return this.root._count;
        }
        return 0;
    }

    /**
     * An iterator pointing to the first element in the tree
     *
     * @returns {RedBlackTreeIterator}
     */
    get begin() {
        const stack = [];
        let n = this.root;
        while (n) {
            stack.push(n);
            n = n.left;
        }
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * An iterator pointing to the last element in the tree
     *
     * @returns {RedBlackTreeIterator}
     */
    get end() {
        const stack = [];
        let n = this.root;
        while (n) {
            stack.push(n);
            n = n.right;
        }
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * Creates a new tree with the new pair inserted
     *
     * @returns {RedBlackTree} A new tree with key and value inserted
     */
    insert(key, value) {
        const cmp = this._compare;
        //Find point to insert new node at
        let n = this.root;
        const nStack = [];
        const dStack = [];
        while (n) {
            const d = cmp(key, n.key);
            nStack.push(n);
            dStack.push(d);
            if (d <= 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        //Rebuild path to leaf node
        nStack.push(new RBNode(RED, key, value, null, null, 1));
        for (let s = nStack.length - 2; s >= 0; --s) {
            n = nStack[s];
            if (dStack[s] <= 0) {
                nStack[s] = new RBNode(n._color, n.key, n.value, nStack[s + 1], n.right, n._count + 1);
            } else {
                nStack[s] = new RBNode(n._color, n.key, n.value, n.left, nStack[s + 1], n._count + 1);
            }
        }
        //Rebalance tree using rotations
        //console.log("start insert", key, dStack)
        for (let s = nStack.length - 1; s > 1; --s) {
            const p = nStack[s - 1];
            n = nStack[s];
            if (p._color === BLACK || n._color === BLACK) {
                break;
            }
            const pp = nStack[s - 2];
            if (pp.left === p) {
                if (p.left === n) {
                    const y = pp.right;
                    if (y && y._color === RED) {
                        //console.log("LLr")
                        p._color = BLACK;
                        pp.right = repaint(BLACK, y);
                        pp._color = RED;
                        s -= 1;
                    } else {
                        //console.log("LLb")
                        pp._color = RED;
                        pp.left = p.right;
                        p._color = BLACK;
                        p.right = pp;
                        nStack[s - 2] = p;
                        nStack[s - 1] = n;
                        recount(pp);
                        recount(p);
                        if (s >= 3) {
                            const ppp = nStack[s - 3];
                            if (ppp.left === pp) {
                                ppp.left = p;
                            } else {
                                ppp.right = p;
                            }
                        }
                        break;
                    }
                } else {
                    const y = pp.right;
                    if (y && y._color === RED) {
                        //console.log("LRr")
                        p._color = BLACK;
                        pp.right = repaint(BLACK, y);
                        pp._color = RED;
                        s -= 1;
                    } else {
                        //console.log("LRb")
                        p.right = n.left;
                        pp._color = RED;
                        pp.left = n.right;
                        n._color = BLACK;
                        n.left = p;
                        n.right = pp;
                        nStack[s - 2] = n;
                        nStack[s - 1] = p;
                        recount(pp);
                        recount(p);
                        recount(n);
                        if (s >= 3) {
                            const ppp = nStack[s - 3];
                            if (ppp.left === pp) {
                                ppp.left = n;
                            } else {
                                ppp.right = n;
                            }
                        }
                        break;
                    }
                }
            } else {
                if (p.right === n) {
                    const y = pp.left;
                    if (y && y._color === RED) {
                        //console.log("RRr", y.key)
                        p._color = BLACK;
                        pp.left = repaint(BLACK, y);
                        pp._color = RED;
                        s -= 1;
                    } else {
                        //console.log("RRb")
                        pp._color = RED;
                        pp.right = p.left;
                        p._color = BLACK;
                        p.left = pp;
                        nStack[s - 2] = p;
                        nStack[s - 1] = n;
                        recount(pp);
                        recount(p);
                        if (s >= 3) {
                            const ppp = nStack[s - 3];
                            if (ppp.right === pp) {
                                ppp.right = p;
                            } else {
                                ppp.left = p;
                            }
                        }
                        break;
                    }
                } else {
                    const y = pp.left;
                    if (y && y._color === RED) {
                        //console.log("RLr")
                        p._color = BLACK;
                        pp.left = repaint(BLACK, y);
                        pp._color = RED;
                        s -= 1;
                    } else {
                        //console.log("RLb")
                        p.left = n.right;
                        pp._color = RED;
                        pp.right = n.left;
                        n._color = BLACK;
                        n.right = p;
                        n.left = pp;
                        nStack[s - 2] = n;
                        nStack[s - 1] = p;
                        recount(pp);
                        recount(p);
                        recount(n);
                        if (s >= 3) {
                            const ppp = nStack[s - 3];
                            if (ppp.right === pp) {
                                ppp.right = n;
                            } else {
                                ppp.left = n;
                            }
                        }
                        break;
                    }
                }
            }
        }
        //Return new tree
        nStack[0]._color = BLACK;
        return new RedBlackTree(cmp, nStack[0]);
    }

    /**
     * Walks a visitor function over the nodes of the tree in order
     *
     * @param {(key: any, value: any) => any} visit A callback that gets executed on each node.
     *                                              If a truthy value is returned from the visitor, then iteration is stopped.
     * @param {any} [lo] An optional start of the range to visit (inclusive)
     * @param {any} [hi] An optional end of the range to visit (non-inclusive)
     * @returns The last value returned by the callback
     */
    forEach(visit, lo, hi) {
        if (!this.root) {
            return;
        }
        switch (arguments.length) {
            case 1:
                return doVisitFull(visit, this.root);
            case 2:
                return doVisitHalf(lo, this._compare, visit, this.root);
            case 3:
                if (this._compare(lo, hi) >= 0) {
                    return;
                }
                return doVisit(lo, hi, this._compare, visit, this.root);
        }
    }

    /**
     * Finds an iterator starting at the given element
     *
     * @returns {RedBlackTreeIterator} An iterator starting at position
     */
    at(idx) {
        if (idx < 0) {
            return new RedBlackTreeIterator(this, []);
        }
        let n = this.root;
        const stack = [];
        for ( ; ; ) {
            stack.push(n);
            if (n.left) {
                if (idx < n.left._count) {
                    n = n.left;
                    continue;
                }
                idx -= n.left._count;
            }
            if (!idx) {
                return new RedBlackTreeIterator(this, stack);
            }
            idx -= 1;
            if (n.right) {
                if (idx >= n.right._count) {
                    break;
                }
                n = n.right;
            } else {
                break;
            }
        }
        return new RedBlackTreeIterator(this, []);
    }

    /**
     * Finds the first item in the tree whose key is >= key
     *
     * @returns {RedBlackTreeIterator} An iterator at the given element.
     */
    ge(key) {
        const cmp = this._compare;
        let n = this.root;
        const stack = [];
        let lastPtr = 0;
        while (n) {
            const d = cmp(key, n.key);
            stack.push(n);
            if (d <= 0) {
                lastPtr = stack.length;
            }
            if (d <= 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        stack.length = lastPtr;
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * Finds the first item in the tree whose key is > key
     *
     * @returns {RedBlackTreeIterator} An iterator at the given element.
     */
    gt(key) {
        const cmp = this._compare;
        let n = this.root;
        const stack = [];
        let lastPtr = 0;
        while (n) {
            const d = cmp(key, n.key);
            stack.push(n);
            if (d < 0) {
                lastPtr = stack.length;
            }
            if (d < 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        stack.length = lastPtr;
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * Finds the first item in the tree whose key is < key
     *
     * @returns {RedBlackTreeIterator} An iterator at the given element.
     */
    lt(key) {
        const cmp = this._compare;
        let n = this.root;
        const stack = [];
        let lastPtr = 0;
        while (n) {
            const d = cmp(key, n.key);
            stack.push(n);
            if (d > 0) {
                lastPtr = stack.length;
            }
            if (d <= 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        stack.length = lastPtr;
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * Finds the first item in the tree whose key is <= key
     *
     * @returns {RedBlackTreeIterator} An iterator at the given element.
     */
    le(key) {
        const cmp = this._compare;
        let n = this.root;
        const stack = [];
        let lastPtr = 0;
        while (n) {
            const d = cmp(key, n.key);
            stack.push(n);
            if (d >= 0) {
                lastPtr = stack.length;
            }
            if (d < 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        stack.length = lastPtr;
        return new RedBlackTreeIterator(this, stack);
    }

    /**
     * Returns an iterator pointing to the first item in the tree with key, otherwise null.
     *
     * @returns {RedBlackTreeIterator}
     */
    find(key) {
        const cmp = this._compare;
        let n = this.root;
        const stack = [];
        while (n) {
            const d = cmp(key, n.key);
            stack.push(n);
            if (d === 0) {
                return new RedBlackTreeIterator(this, stack);
            }
            if (d <= 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }
        return new RedBlackTreeIterator(this, []);
    }

    /**
     * Removes the first item with key in the tree
     *
     * @returns {RedBlackTree}
     */
    remove(key) {
        const iter = this.find(key);
        if (iter) {
            return iter.remove();
        }
        return this;
    }

    /**
     * Retrieves the value associated to the given key
     */
    get(key) {
        const cmp = this._compare;
        let n = this.root;
        while (n) {
            const d = cmp(key, n.key);
            if (d === 0) {
                return n.value;
            }
            if (d <= 0) {
                n = n.left;
            } else {
                n = n.right;
            }
        }

    }
}

RedBlackTreeRef = RedBlackTree;
