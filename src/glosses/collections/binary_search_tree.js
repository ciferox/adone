const { is } = adone;

const defaultCompareKeysFunction = (a, b) => {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    if (a === b) {
        return 0;
    }

    const err = new Error("Couldn't compare elements");
    err.a = a;
    err.b = b;
    throw err;
};

const defaultCheckValueEquality = (a, b) => a === b;

/**
 * @typedef Query
 * @property {any} [$le]
 * @property {any} [$lte]
 * @property {any} [$gt]
 * @property {any} [$gte]
 *
 */

/**
 * Represents a binary search tree
 */
export default class BinarySearchTree {
    constructor(options = {}) {
        this.left = this.right = null;
        this.parent = !is.undefined(options.parent) ? options.parent : null;
        if (options.hasOwnProperty("key")) {
            this.key = options.key;
        }
        this.data = options.hasOwnProperty("value") ? [options.value] : [];
        this._unique = options.unique || false;

        this._compareKeys = options.compareKeys || defaultCompareKeysFunction;
        this._checkValueEquality = options.checkValueEquality || defaultCheckValueEquality;
    }

    /**
     * Returns the max descendant tree
     *
     * @returns {BinarySearchTree}
     */
    getMaxKeyDescendant() {
        if (this.right) {
            return this.right.getMaxKeyDescendant();
        }
        return this;
    }

    /**
     * Returns the maximum key
     *
     * @returns {any}
     */
    getMaxKey() {
        return this.getMaxKeyDescendant().key;
    }

    /**
     * Returns the min descendant tree
     *
     * @returns {BinarySearchTree}
     */
    getMinKeyDescendant() {
        if (this.left) {
            return this.left.getMinKeyDescendant();
        }
        return this;
    }

    /**
     * Returns the minumum key
     *
     * @returns {any}
     */
    getMinKey() {
        return this.getMinKeyDescendant().key;
    }

    /**
     * Traverses the tree and calls the given function for each node
     *
     * @param {(key, value) => void} test
     * @returns {void}
     */
    checkAllNodesFullfillCondition(test) {
        if (!this.hasOwnProperty("key")) {
            return;
        }

        test(this.key, this.data);

        if (this.left) {
            this.left.checkAllNodesFullfillCondition(test);
        }
        if (this.right) {
            this.right.checkAllNodesFullfillCondition(test);
        }
    }

    _checkNodeOrdering() {
        if (!this.hasOwnProperty("key")) {
            return;
        }

        if (this.left) {
            this.left.checkAllNodesFullfillCondition((k) => {
                if (this._compareKeys(k, this.key) >= 0) {
                    throw new Error(`Tree with root ${this.key} is not a binary search tree`);
                }
            });
            this.left._checkNodeOrdering();
        }

        if (this.right) {
            this.right.checkAllNodesFullfillCondition((k) => {
                if (this._compareKeys(k, this.key) <= 0) {
                    throw new Error(`Tree with root ${this.key} is not a binary search tree`);
                }
            });
            this.right._checkNodeOrdering();
        }
    }

    _checkInternalPointers() {
        if (this.left) {
            if (this.left.parent !== this) {
                throw new Error(`Parent pointer broken for key ${this.key}`);
            }
            this.left._checkInternalPointers();
        }

        if (this.right) {
            if (this.right.parent !== this) {
                throw new Error(`Parent pointer broken for key ${this.key}`);
            }
            this.right._checkInternalPointers();
        }
    }

    /**
     * Checks whether the tree is a binary search tree
     *
     * @returns {void}
     */
    checkIsBST() {
        this._checkNodeOrdering();
        this._checkInternalPointers();
        if (this.parent) {
            throw new Error("The root shouldn't have a parent");
        }
    }

    /**
     * Returns the of keys in the tree
     *
     * @returns {number}
     */
    getNumberOfKeys() {
        if (!this.hasOwnProperty("key")) {
            return 0;
        }

        let res = 1;
        if (this.left) {
            res += this.left.getNumberOfKeys();
        }
        if (this.right) {
            res += this.right.getNumberOfKeys();
        }

        return res;
    }

    _createSimilar(options = {}) {
        options.unique = this._unique;
        options.compareKeys = this._compareKeys;
        options.checkValueEquality = this._checkValueEquality;

        return new this.constructor(options);
    }

    _createLeftChild(options) {
        const leftChild = this._createSimilar(options);
        leftChild.parent = this;
        this.left = leftChild;

        return leftChild;
    }

    _createRightChild(options) {
        const rightChild = this._createSimilar(options);
        rightChild.parent = this;
        this.right = rightChild;

        return rightChild;
    }

    /**
     * Inserts a new key/value
     *
     * @return {void}
     */
    insert(key, value) {
        // Empty tree, insert as root
        if (!this.hasOwnProperty("key")) {
            this.key = key;
            this.data.push(value);
            return;
        }

        // Same key as root
        if (this._compareKeys(this.key, key) === 0) {
            if (this._unique) {
                const err = new Error(`Can't insert key ${key}, it violates the unique constraint`);
                err.key = key;
                err.errorType = "uniqueViolated";
                throw err;
            } else {
                this.data.push(value);
            }
            return;
        }

        if (this._compareKeys(key, this.key) < 0) {
            // Insert in left subtree
            if (this.left) {
                this.left.insert(key, value);
            } else {
                this._createLeftChild({ key, value });
            }
        } else {
            // Insert in right subtree
            if (this.right) {
                this.right.insert(key, value);
            } else {
                this._createRightChild({ key, value });
            }
        }
    }

    /**
     * Searches the given key in the tree
     *
     * @returns {any[]}
     */
    search(key) {
        if (!this.hasOwnProperty("key")) {
            return [];
        }

        if (this._compareKeys(this.key, key) === 0) {
            return this.data;
        }

        if (this._compareKeys(key, this.key) < 0) {
            if (this.left) {
                return this.left.search(key);
            }
            return [];
        }
        if (this.right) {
            return this.right.search(key);
        }
        return [];
    }

    /**
     * @param {Query} query
     */
    _getLowerBoundMatcher(query) {
        // No lower bound
        if (!query.hasOwnProperty("$gt") && !query.hasOwnProperty("$gte")) {
            return () => true;
        }

        if (query.hasOwnProperty("$gt") && query.hasOwnProperty("$gte")) {
            if (this._compareKeys(query.$gte, query.$gt) === 0) {
                return (key) => this._compareKeys(key, query.$gt) > 0;
            }
            if (this._compareKeys(query.$gte, query.$gt) > 0) {
                return (key) => this._compareKeys(key, query.$gte) >= 0;
            }
            return (key) => this._compareKeys(key, query.$gt) > 0;
        }

        if (query.hasOwnProperty("$gt")) {
            return (key) => this._compareKeys(key, query.$gt) > 0;
        }
        return (key) => this._compareKeys(key, query.$gte) >= 0;
    }

    /**
     * @param {Query} query
     */
    _getUpperBoundMatcher(query) {
        // No lower bound
        if (!query.hasOwnProperty("$lt") && !query.hasOwnProperty("$lte")) {
            return () => true;
        }

        if (query.hasOwnProperty("$lt") && query.hasOwnProperty("$lte")) {
            if (this._compareKeys(query.$lte, query.$lt) === 0) {
                return (key) => this._compareKeys(key, query.$lt) < 0;
            }
            if (this._compareKeys(query.$lte, query.$lt) < 0) {
                return (key) => this._compareKeys(key, query.$lte) <= 0;
            }
            return (key) => this._compareKeys(key, query.$lt) < 0;
        }

        if (query.hasOwnProperty("$lt")) {
            return (key) => this._compareKeys(key, query.$lt) < 0;
        }
        return (key) => this._compareKeys(key, query.$lte) <= 0;
    }

    /**
     * Returns all the values from the given key bounds
     *
     * @param {Query} query
     * @returns {any[]}
     */
    betweenBounds(query, lbm, ubm) {
        if (!this.hasOwnProperty("key")) { // Empty tree
            return [];
        }

        lbm = lbm || this._getLowerBoundMatcher(query);
        ubm = ubm || this._getUpperBoundMatcher(query);

        const res = [];
        if (lbm(this.key) && this.left) {
            res.push(...this.left.betweenBounds(query, lbm, ubm));
        }
        if (lbm(this.key) && ubm(this.key)) {
            res.push(...this.data);
        }
        if (ubm(this.key) && this.right) {
            res.push(...this.right.betweenBounds(query, lbm, ubm));
        }

        return res;
    }

    _deleteIfLeaf() {
        if (this.left || this.right) {
            return false;
        }

        // The leaf is itself a root
        if (!this.parent) {
            delete this.key;
            this.data = [];
            return true;
        }

        if (this.parent.left === this) {
            this.parent.left = null;
        } else {
            this.parent.right = null;
        }

        return true;
    }

    _deleteIfOnlyOneChild() {
        let child;

        if (this.left && !this.right) {
            child = this.left;
        }
        if (!this.left && this.right) {
            child = this.right;
        }
        if (!child) {
            return false;
        }

        // Root
        if (!this.parent) {
            this.key = child.key;
            this.data = child.data;

            this.left = null;
            if (child.left) {
                this.left = child.left;
                child.left.parent = this;
            }

            this.right = null;
            if (child.right) {
                this.right = child.right;
                child.right.parent = this;
            }

            return true;
        }

        if (this.parent.left === this) {
            this.parent.left = child;
            child.parent = this.parent;
        } else {
            this.parent.right = child;
            child.parent = this.parent;
        }

        return true;
    }

    /**
     * Deletes the given key/value from the tree
     *
     * @returns {void}
     */
    delete(key, value) {
        if (!this.hasOwnProperty("key")) {
            return;
        }

        if (this._compareKeys(key, this.key) < 0) {
            if (this.left) {
                this.left.delete(key, value);
            }
            return;
        }

        if (this._compareKeys(key, this.key) > 0) {
            if (this.right) {
                this.right.delete(key, value);
            }
            return;
        }

        if (!this._compareKeys(key, this.key) === 0) {
            return;
        }

        const newData = [];

        // Delete only a value
        if (this.data.length > 1 && !is.undefined(value)) {
            for (const i of this.data) {
                if (!this._checkValueEquality(i, value)) {
                    newData.push(i);
                }
            }
            this.data = newData;
            return;
        }

        // Delete the whole node
        if (this._deleteIfLeaf()) {
            return;
        }
        if (this._deleteIfOnlyOneChild()) {
            return;
        }

        // We are in the case where the node to delete has two children
        if (Math.random() >= 0.5) { // Randomize replacement to avoid unbalancing the tree too much
            // Use the in-order predecessor
            const replaceWith = this.left.getMaxKeyDescendant();

            this.key = replaceWith.key;
            this.data = replaceWith.data;

            if (this === replaceWith.parent) { // Special case
                this.left = replaceWith.left;
                if (replaceWith.left) {
                    replaceWith.left.parent = replaceWith.parent;
                }
            } else {
                replaceWith.parent.right = replaceWith.left;
                if (replaceWith.left) {
                    replaceWith.left.parent = replaceWith.parent;
                }
            }
        } else {
            // Use the in-order successor
            const replaceWith = this.right.getMinKeyDescendant();

            this.key = replaceWith.key;
            this.data = replaceWith.data;

            if (this === replaceWith.parent) { // Special case
                this.right = replaceWith.right;
                if (replaceWith.right) {
                    replaceWith.right.parent = replaceWith.parent;
                }
            } else {
                replaceWith.parent.left = replaceWith.right;
                if (replaceWith.right) {
                    replaceWith.right.parent = replaceWith.parent;
                }
            }
        }
    }

    /**
     * Executed the given callback for each node from left to right
     *
     * @param {(tree: BinarySearchTree) => void} fn
     */
    executeOnEveryNode(fn) {
        if (this.left) {
            this.left.executeOnEveryNode(fn);
        }
        fn(this);
        if (this.right) {
            this.right.executeOnEveryNode(fn);
        }
    }

    /**
     * Prints the tree
     */
    prettyPrint(printData, spacing) {
        spacing = spacing || "";

        console.log(`${spacing}* ${this.key}`);
        if (printData) {
            console.log(`${spacing}* ${this.data}`);
        }

        if (!this.left && !this.right) {
            return;
        }

        if (this.left) {
            this.left.prettyPrint(printData, `${spacing}  `);
        } else {
            console.log(`${spacing}  *`);
        }
        if (this.right) {
            this.right.prettyPrint(printData, `${spacing}  `);
        } else {
            console.log(`${spacing}  *`);
        }
    }
}
