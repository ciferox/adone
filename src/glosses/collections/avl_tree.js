const { is, collection, error } = adone;

class _AVLTree extends collection.BinarySearchTree {
    balanceFactor() {
        const leftH = this.left ? this.left.height : 0;
        const rightH = this.right ? this.right.height : 0;
        return leftH - rightH;
    }

    checkHeightCorrect() {
        if (!this.hasOwnProperty("key")) { // Empty tree
            return;
        }

        if (this.left && is.undefined(this.left.height)) {
            throw new error.IllegalStateException(`Undefined height for node ${this.left.key}`);
        }
        if (this.right && is.undefined(this.right.height)) {
            throw new error.IllegalStateException(`Undefined height for node ${this.right.key}`);
        }
        if (is.undefined(this.height)) {
            throw new error.IllegalStateException(`Undefined height for node ${this.key}`);
        }

        const leftH = this.left ? this.left.height : 0;
        const rightH = this.right ? this.right.height : 0;

        if (this.height !== 1 + Math.max(leftH, rightH)) {
            throw new error.IllegalStateException(`Height constraint failed for node ${this.key}`);
        }
        if (this.left) {
            this.left.checkHeightCorrect();
        }
        if (this.right) {
            this.right.checkHeightCorrect();
        }
    }

    checkBalanceFactors() {
        if (Math.abs(this.balanceFactor()) > 1) {
            throw new error.IllegalStateException(`Tree is unbalanced at node ${this.key}`);
        }

        if (this.left) {
            this.left.checkBalanceFactors();
        }
        if (this.right) {
            this.right.checkBalanceFactors();
        }
    }

    checkIsAVLT() {
        super.checkIsBST();
        this.checkHeightCorrect();
        this.checkBalanceFactors();
    }

    rightRotation() {
        const p = this.left;
        if (!p) {
            return this;
        } // No change

        const b = p.right;
        const q = this;

        // Alter tree structure
        if (q.parent) {
            p.parent = q.parent;
            if (q.parent.left === q) {
                q.parent.left = p;
            } else {
                q.parent.right = p;
            }
        } else {
            p.parent = null;
        }
        p.right = q;
        q.parent = p;
        q.left = b;
        if (b) {
            b.parent = q;
        }

        // Update heights
        const ah = p.left ? p.left.height : 0;
        const bh = b ? b.height : 0;
        const ch = q.right ? q.right.height : 0;
        q.height = Math.max(bh, ch) + 1;
        p.height = Math.max(ah, q.height) + 1;

        return p;
    }

    leftRotation() {
        const q = this.right;
        if (!q) {
            return this;
        } // No change

        const b = q.left;
        const p = this;
        // Alter tree structure
        if (p.parent) {
            q.parent = p.parent;
            if (p.parent.left === p) {
                p.parent.left = q;
            } else {
                p.parent.right = q;
            }
        } else {
            q.parent = null;
        }
        q.left = p;
        p.parent = q;
        p.right = b;
        if (b) {
            b.parent = p;
        }

        // Update heights
        const ah = p.left ? p.left.height : 0;
        const bh = b ? b.height : 0;
        const ch = q.right ? q.right.height : 0;
        p.height = Math.max(ah, bh) + 1;
        q.height = Math.max(ch, p.height) + 1;

        return q;
    }

    rightTooSmall() {
        if (this.balanceFactor() <= 1) {
            return this;
        } // Right is not too small, don't change

        if (this.left.balanceFactor() < 0) {
            this.left.leftRotation();
        }

        return this.rightRotation();
    }

    leftTooSmall() {
        if (this.balanceFactor() >= -1) {
            return this;
        } // Left is not too small, don't change

        if (this.right.balanceFactor() > 0) {
            this.right.rightRotation();
        }

        return this.leftRotation();
    }

    rebalanceAlongPath(path) {
        if (!this.hasOwnProperty("key")) {
            delete this.height;
            return this;
        } // Empty tree

        let newRoot = this;
        let rotated;
        // Rebalance the tree and update all heights
        for (let i = path.length - 1; i >= 0; --i) {
            path[i].height = 1 + Math.max(
                path[i].left ? path[i].left.height : 0,
                path[i].right ? path[i].right.height : 0
            );

            if (path[i].balanceFactor() > 1) {
                rotated = path[i].rightTooSmall();
                if (i === 0) {
                    newRoot = rotated;
                }
            }

            if (path[i].balanceFactor() < -1) {
                rotated = path[i].leftTooSmall();
                if (i === 0) {
                    newRoot = rotated;
                }
            }
        }

        return newRoot;
    }

    insert(key, value) {
        // Empty tree, insert as root
        if (!this.hasOwnProperty("key")) {
            this.key = key;
            this.data.push(value);
            this.height = 1;
            return this;
        }

        const insertPath = [];
        let currentNode = this;
        // Insert new leaf at the right place
        for ( ; ; ) {
            // Same key: no change in the tree structure
            if (currentNode._compareKeys(currentNode.key, key) === 0) {
                if (currentNode._unique) {
                    const err = new error.IllegalStateException(`Can't insert key ${key}, it violates the unique constraint`);
                    err.key = key;
                    err.errorType = "uniqueViolated";
                    throw err;
                } else {
                    currentNode.data.push(value);
                }
                return this;
            }

            insertPath.push(currentNode);

            if (currentNode._compareKeys(key, currentNode.key) < 0) {
                if (!currentNode.left) {
                    insertPath.push(currentNode._createLeftChild({ key, value }));
                    break;
                } else {
                    currentNode = currentNode.left;
                }
            } else {
                if (!currentNode.right) {
                    insertPath.push(currentNode._createRightChild({ key, value }));
                    break;
                } else {
                    currentNode = currentNode.right;
                }
            }
        }

        return this.rebalanceAlongPath(insertPath);
    }

    delete(key, value) {
        if (!this.hasOwnProperty("key")) {
            return this;
        } // Empty tree

        const deletePath = [];
        let currentNode = this;
        // Either no match is found and the function will return from within the loop
        // Or a match is found and deletePath will contain the path from the root to the node to delete after the loop
        for ( ; ; ) {
            if (currentNode._compareKeys(key, currentNode.key) === 0) {
                break;
            }

            deletePath.push(currentNode);

            if (currentNode._compareKeys(key, currentNode.key) < 0) {
                if (currentNode.left) {
                    currentNode = currentNode.left;
                } else {
                    return this; // Key not found, no modification
                }
            } else {
                // currentNode._compareKeys(key, currentNode.key) is > 0
                if (currentNode.right) {
                    currentNode = currentNode.right;
                } else {
                    return this; // Key not found, no modification
                }
            }
        }
        const newData = [];
        // Delete only a value (no tree modification)
        if (currentNode.data.length > 1 && !is.undefined(value)) {
            currentNode.data.forEach((d) => {
                if (!currentNode._checkValueEquality(d, value)) {
                    newData.push(d);
                }
            });
            currentNode.data = newData;
            return this;
        }

        // Delete a whole node

        // Leaf
        if (!currentNode.left && !currentNode.right) {
            if (currentNode === this) { // This leaf is also the root
                delete currentNode.key;
                currentNode.data = [];
                delete currentNode.height;
                return this;
            }
            if (currentNode.parent.left === currentNode) {
                currentNode.parent.left = null;
            } else {
                currentNode.parent.right = null;
            }
            return this.rebalanceAlongPath(deletePath);

        }

        let replaceWith;
        // Node with only one child
        if (!currentNode.left || !currentNode.right) {
            replaceWith = currentNode.left ? currentNode.left : currentNode.right;

            if (currentNode === this) { // This node is also the root
                replaceWith.parent = null;
                return replaceWith; // height of replaceWith is necessarily 1 because the tree was balanced before deletion
            }
            if (currentNode.parent.left === currentNode) {
                currentNode.parent.left = replaceWith;
                replaceWith.parent = currentNode.parent;
            } else {
                currentNode.parent.right = replaceWith;
                replaceWith.parent = currentNode.parent;
            }

            return this.rebalanceAlongPath(deletePath);

        }

        // Node with two children
        // Use the in-order predecessor (no need to randomize since we actively rebalance)
        deletePath.push(currentNode);
        replaceWith = currentNode.left;

        // Special case: the in-order predecessor is right below the node to delete
        if (!replaceWith.right) {
            currentNode.key = replaceWith.key;
            currentNode.data = replaceWith.data;
            currentNode.left = replaceWith.left;
            if (replaceWith.left) {
                replaceWith.left.parent = currentNode;
            }
            return this.rebalanceAlongPath(deletePath);
        }

        // After this loop, replaceWith is the right-most leaf in the left subtree
        // and deletePath the path from the root (inclusive) to replaceWith (exclusive)
        for ( ; ; ) {
            if (replaceWith.right) {
                deletePath.push(replaceWith);
                replaceWith = replaceWith.right;
            } else {
                break;
            }
        }

        currentNode.key = replaceWith.key;
        currentNode.data = replaceWith.data;

        replaceWith.parent.right = replaceWith.left;
        if (replaceWith.left) {
            replaceWith.left.parent = replaceWith.parent;
        }

        return this.rebalanceAlongPath(deletePath);
    }
}

/**
 * Represents an AVL tree, a self-balancing binary search tree
 */
export default class AVLTree {
    constructor(options) {
        this.tree = new _AVLTree(options);
    }

    /**
     * Checks whether the tree is an avl tree
     *
     * @returns {void}
     */
    checkIsAVLT() {
        this.tree.checkIsAVLT();
    }

    /**
     * Inserts a new key/value
     *
     * @returns {void}
     */
    insert(key, value) {
        const newTree = this.tree.insert(key, value);

        // If newTree is undefined, that means its structure was not modified
        if (newTree) {
            this.tree = newTree;
        }
    }

    /**
     * Deletes the given key/value from the tree
     *
     * @returns {void}
     */
    delete(key, value) {
        const newTree = this.tree.delete(key, value);

        // If newTree is undefined, that means its structure was not modified
        if (newTree) {
            this.tree = newTree;
        }
    }
}

AVLTree._AVLTree = _AVLTree;

for (const m of ["getNumberOfKeys", "search", "betweenBounds", "prettyPrint", "executeOnEveryNode"]) {
    AVLTree.prototype[m] = function (...args) {
        return this.tree[m](...args);
    };
}

