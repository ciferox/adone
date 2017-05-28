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

export default class BinarySearchTree {
    constructor(options = {}) {
        this.left = this.right = null;
        this.parent = !is.undefined(options.parent) ? options.parent : null;
        if (options.hasOwnProperty("key")) {
            this.key = options.key;
        }
        this.data = options.hasOwnProperty("value") ? [options.value] : [];
        this.unique = options.unique || false;

        this.compareKeys = options.compareKeys || defaultCompareKeysFunction;
        this.checkValueEquality = options.checkValueEquality || defaultCheckValueEquality;
    }

    getMaxKeyDescendant() {
        if (this.right) {
            return this.right.getMaxKeyDescendant();
        }
        return this;
    }

    getMaxKey() {
        return this.getMaxKeyDescendant().key;
    }

    getMinKeyDescendant() {
        if (this.left) {
            return this.left.getMinKeyDescendant();
        }
        return this;
    }

    getMinKey() {
        return this.getMinKeyDescendant().key;
    }

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

    checkNodeOrdering() {
        if (!this.hasOwnProperty("key")) {
            return;
        }

        if (this.left) {
            this.left.checkAllNodesFullfillCondition((k) => {
                if (this.compareKeys(k, this.key) >= 0) {
                    throw new Error(`Tree with root ${this.key} is not a binary search tree`);
                }
            });
            this.left.checkNodeOrdering();
        }

        if (this.right) {
            this.right.checkAllNodesFullfillCondition((k) => {
                if (this.compareKeys(k, this.key) <= 0) {
                    throw new Error(`Tree with root ${this.key} is not a binary search tree`);
                }
            });
            this.right.checkNodeOrdering();
        }
    }

    checkInternalPointers() {
        if (this.left) {
            if (this.left.parent !== this) {
                throw new Error(`Parent pointer broken for key ${this.key}`);
            }
            this.left.checkInternalPointers();
        }

        if (this.right) {
            if (this.right.parent !== this) {
                throw new Error(`Parent pointer broken for key ${this.key}`);
            }
            this.right.checkInternalPointers();
        }
    }

    checkIsBST() {
        this.checkNodeOrdering();
        this.checkInternalPointers();
        if (this.parent) {
            throw new Error("The root shouldn't have a parent");
        }
    }

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

    createSimilar(options = {}) {
        options.unique = this.unique;
        options.compareKeys = this.compareKeys;
        options.checkValueEquality = this.checkValueEquality;

        return new this.constructor(options);
    }

    createLeftChild(options) {
        const leftChild = this.createSimilar(options);
        leftChild.parent = this;
        this.left = leftChild;

        return leftChild;
    }

    createRightChild(options) {
        const rightChild = this.createSimilar(options);
        rightChild.parent = this;
        this.right = rightChild;

        return rightChild;
    }

    insert(key, value) {
        // Empty tree, insert as root
        if (!this.hasOwnProperty("key")) {
            this.key = key;
            this.data.push(value);
            return;
        }

        // Same key as root
        if (this.compareKeys(this.key, key) === 0) {
            if (this.unique) {
                const err = new Error(`Can't insert key ${key}, it violates the unique constraint`);
                err.key = key;
                err.errorType = "uniqueViolated";
                throw err;
            } else {
                this.data.push(value);
            }
            return;
        }

        if (this.compareKeys(key, this.key) < 0) {
            // Insert in left subtree
            if (this.left) {
                this.left.insert(key, value);
            } else {
                this.createLeftChild({ key, value });
            }
        } else {
            // Insert in right subtree
            if (this.right) {
                this.right.insert(key, value);
            } else {
                this.createRightChild({ key, value });
            }
        }
    }

    search(key) {
        if (!this.hasOwnProperty("key")) {
            return [];
        }

        if (this.compareKeys(this.key, key) === 0) {
            return this.data;
        }

        if (this.compareKeys(key, this.key) < 0) {
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

    getLowerBoundMatcher(query) {
        // No lower bound
        if (!query.hasOwnProperty("$gt") && !query.hasOwnProperty("$gte")) {
            return () => true;
        }

        if (query.hasOwnProperty("$gt") && query.hasOwnProperty("$gte")) {
            if (this.compareKeys(query.$gte, query.$gt) === 0) {
                return (key) => this.compareKeys(key, query.$gt) > 0;
            }
            if (this.compareKeys(query.$gte, query.$gt) > 0) {
                return (key) => this.compareKeys(key, query.$gte) >= 0;
            }
            return (key) => this.compareKeys(key, query.$gt) > 0;
        }

        if (query.hasOwnProperty("$gt")) {
            return (key) => this.compareKeys(key, query.$gt) > 0;
        }
        return (key) => this.compareKeys(key, query.$gte) >= 0;
    }

    getUpperBoundMatcher(query) {
        // No lower bound
        if (!query.hasOwnProperty("$lt") && !query.hasOwnProperty("$lte")) {
            return () => true;
        }

        if (query.hasOwnProperty("$lt") && query.hasOwnProperty("$lte")) {
            if (this.compareKeys(query.$lte, query.$lt) === 0) {
                return (key) => this.compareKeys(key, query.$lt) < 0;
            }
            if (this.compareKeys(query.$lte, query.$lt) < 0) {
                return (key) => this.compareKeys(key, query.$lte) <= 0;
            }
            return (key) => this.compareKeys(key, query.$lt) < 0;
        }

        if (query.hasOwnProperty("$lt")) {
            return (key) => this.compareKeys(key, query.$lt) < 0;
        }
        return (key) => this.compareKeys(key, query.$lte) <= 0;
    }

    betweenBounds(query, lbm, ubm) {
        if (!this.hasOwnProperty("key")) {  // Empty tree
            return [];
        }

        lbm = lbm || this.getLowerBoundMatcher(query);
        ubm = ubm || this.getUpperBoundMatcher(query);

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

    deleteIfLeaf() {
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

    deleteIfOnlyOneChild() {
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

    delete(key, value) {
        if (!this.hasOwnProperty("key")) {
            return;
        }

        if (this.compareKeys(key, this.key) < 0) {
            if (this.left) {
                this.left.delete(key, value);
            }
            return;
        }

        if (this.compareKeys(key, this.key) > 0) {
            if (this.right) {
                this.right.delete(key, value);
            }
            return;
        }

        if (!this.compareKeys(key, this.key) === 0) {
            return;
        }

        const newData = [];

        // Delete only a value
        if (this.data.length > 1 && !is.undefined(value)) {
            for (const i of this.data) {
                if (!this.checkValueEquality(i, value)) {
                    newData.push(i);
                }
            }
            this.data = newData;
            return;
        }

        // Delete the whole node
        if (this.deleteIfLeaf()) {
            return;
        }
        if (this.deleteIfOnlyOneChild()) {
            return;
        }

        // We are in the case where the node to delete has two children
        if (Math.random() >= 0.5) {   // Randomize replacement to avoid unbalancing the tree too much
            // Use the in-order predecessor
            const replaceWith = this.left.getMaxKeyDescendant();

            this.key = replaceWith.key;
            this.data = replaceWith.data;

            if (this === replaceWith.parent) {   // Special case
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

            if (this === replaceWith.parent) {   // Special case
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

    executeOnEveryNode(fn) {
        if (this.left) {
            this.left.executeOnEveryNode(fn);
        }
        fn(this);
        if (this.right) {
            this.right.executeOnEveryNode(fn);
        }
    }

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
