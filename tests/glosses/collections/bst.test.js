const BinarySearchTree = adone.collection.BinarySearchTree;

function getRandomArray(n) {
    let res, next;

    if (n === 0) {
        return [];
    }
    if (n === 1) {
        return [0];
    }

    res = getRandomArray(n - 1);
    next = Math.floor(Math.random() * n);
    res.splice(next, 0, n - 1); // Add n-1 at a random position in the array

    return res;
}

describe("Binary search tree", () => {

    it("Upon creation, left, right are null, key and data can be set", () => {
        let bst = new BinarySearchTree();
        assert.isNull(bst.left);
        assert.isNull(bst.right);
        expect(bst.hasOwnProperty("key")).to.be.equal(false);
        expect(bst.data.length).to.be.equal(0);


        bst = new BinarySearchTree({ key: 6, value: "ggg" });
        assert.isNull(bst.left);
        assert.isNull(bst.right);
        expect(bst.key).to.be.equal(6);
        expect(bst.data.length).to.be.equal(1);
        expect(bst.data[0]).to.be.equal("ggg");
    });

    describe("Sanity checks", () => {

        it("Can get maxkey and minkey descendants", () => {
            let t = new BinarySearchTree({ key: 10 }),
                l = new BinarySearchTree({ key: 5 }),
                r = new BinarySearchTree({ key: 15 }),
                ll = new BinarySearchTree({ key: 3 }),
                lr = new BinarySearchTree({ key: 8 }),
                rl = new BinarySearchTree({ key: 11 }),
                rr = new BinarySearchTree({ key: 42 });

            t.left = l; t.right = r;
            l.left = ll; l.right = lr;
            r.left = rl; r.right = rr;

            // Getting min and max key descendants
            expect(t.getMinKeyDescendant().key).to.be.equal(3);
            expect(t.getMaxKeyDescendant().key).to.be.equal(42);
            expect(t.left.getMinKeyDescendant().key).to.be.equal(3);
            expect(t.left.getMaxKeyDescendant().key).to.be.equal(8);
            expect(t.right.getMinKeyDescendant().key).to.be.equal(11);
            expect(t.right.getMaxKeyDescendant().key).to.be.equal(42);
            expect(t.right.left.getMinKeyDescendant().key).to.be.equal(11);
            expect(t.right.left.getMaxKeyDescendant().key).to.be.equal(11);

            // Getting min and max keys

            expect(t.getMinKey()).to.be.equal(3);
            expect(t.getMaxKey()).to.be.equal(42);
            expect(t.left.getMinKey()).to.be.equal(3);
            expect(t.left.getMaxKey()).to.be.equal(8);
            expect(t.right.getMinKey()).to.be.equal(11);
            expect(t.right.getMaxKey()).to.be.equal(42);
            expect(t.right.left.getMinKey()).to.be.equal(11);
            expect(t.right.left.getMaxKey()).to.be.equal(11);
        });

        it("Can check a condition against every node in a tree", () => {
            let t = new BinarySearchTree({ key: 10 }),
                l = new BinarySearchTree({ key: 6 }),
                r = new BinarySearchTree({ key: 16 }),
                ll = new BinarySearchTree({ key: 4 }),
                lr = new BinarySearchTree({ key: 8 }),
                rl = new BinarySearchTree({ key: 12 }),
                rr = new BinarySearchTree({ key: 42 });

            t.left = l; t.right = r;
            l.left = ll; l.right = lr;
            r.left = rl; r.right = rr;

            function test(k, v) {
                if (k % 2 !== 0) {
                    throw "Key is not even";
                }
            }

            t.checkAllNodesFullfillCondition(test);

            [l, r, ll, lr, rl, rr].forEach((node) => {
                node.key += 1;
                expect(() => {
                    t.checkAllNodesFullfillCondition(test);
                }).to.throw();

                node.key -= 1;
            });

            t.checkAllNodesFullfillCondition(test);
        });

        it("Can check that a tree verifies node ordering", () => {
            let t = new BinarySearchTree({ key: 10 }),
                l = new BinarySearchTree({ key: 5 }),
                r = new BinarySearchTree({ key: 15 }),
                ll = new BinarySearchTree({ key: 3 }),
                lr = new BinarySearchTree({ key: 8 }),
                rl = new BinarySearchTree({ key: 11 }),
                rr = new BinarySearchTree({ key: 42 });

            t.left = l; t.right = r;
            l.left = ll; l.right = lr;
            r.left = rl; r.right = rr;

            t.checkNodeOrdering();

            // Let's be paranoid and check all cases...
            l.key = 12;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            l.key = 5;

            r.key = 9;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            r.key = 15;

            ll.key = 6;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            ll.key = 11;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            ll.key = 3;

            lr.key = 4;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            lr.key = 11;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            lr.key = 8;

            rl.key = 16;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            rl.key = 9;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            rl.key = 11;

            rr.key = 12;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            rr.key = 7;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            rr.key = 10.5;
            expect(() => {
                t.checkNodeOrdering();
            }).to.throw();

            rr.key = 42;

            t.checkNodeOrdering();
        });

        it("Checking if a tree's internal pointers (i.e. parents) are correct", () => {
            let t = new BinarySearchTree({ key: 10 }),
                l = new BinarySearchTree({ key: 5 }),
                r = new BinarySearchTree({ key: 15 }),
                ll = new BinarySearchTree({ key: 3 }),
                lr = new BinarySearchTree({ key: 8 }),
                rl = new BinarySearchTree({ key: 11 }),
                rr = new BinarySearchTree({ key: 42 });

            t.left = l; t.right = r;
            l.left = ll; l.right = lr;
            r.left = rl; r.right = rr;

            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            l.parent = t;
            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            r.parent = t;
            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            ll.parent = l;
            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            lr.parent = l;
            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            rl.parent = r;
            expect(() => {
                t.checkInternalPointers();
            }).to.throw();

            rr.parent = r;

            t.checkInternalPointers();
        });

        it("Can get the number of inserted keys", () => {
            const bst = new BinarySearchTree();

            expect(bst.getNumberOfKeys()).to.be.equal(0);

            bst.insert(10);
            expect(bst.getNumberOfKeys()).to.be.equal(1);

            bst.insert(5);
            expect(bst.getNumberOfKeys()).to.be.equal(2);

            bst.insert(3);
            expect(bst.getNumberOfKeys()).to.be.equal(3);

            bst.insert(8);
            expect(bst.getNumberOfKeys()).to.be.equal(4);

            bst.insert(15);
            expect(bst.getNumberOfKeys()).to.be.equal(5);

            bst.insert(12);
            expect(bst.getNumberOfKeys()).to.be.equal(6);

            bst.insert(37);
            expect(bst.getNumberOfKeys()).to.be.equal(7);
        });
    });

    describe("Insertion", () => {

        it("Insert at the root if its the first insertion", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");

            bst.checkIsBST();
            expect(bst.key).to.be.equal(10);

            expect(bst.data).to.be.deep.equal(["some data"]);
            assert.isNull(bst.left);
            assert.isNull(bst.right);
        });

        it("Insert on the left if key is less than the root's", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");
            bst.insert(7, "some other data");

            bst.checkIsBST();
            assert.isNull(bst.right);
            expect(bst.left.key).to.be.equal(7);

            expect(bst.left.data).to.be.deep.equal(["some other data"]);
            assert.isNull(bst.left.left);
            assert.isNull(bst.left.right);
        });

        it("Insert on the right if key is greater than the root's", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");
            bst.insert(14, "some other data");

            bst.checkIsBST();
            assert.isNull(bst.left);
            expect(bst.right.key).to.be.equal(14);

            expect(bst.right.data).to.be.deep.equal(["some other data"]);
            assert.isNull(bst.right.left);
            assert.isNull(bst.right.right);
        });

        it("Recursive insertion on the left works", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");
            bst.insert(7, "some other data");
            bst.insert(1, "hello");
            bst.insert(9, "world");

            bst.checkIsBST();
            assert.isNull(bst.right);
            expect(bst.left.key).to.be.equal(7);

            expect(bst.left.data).to.be.deep.equal(["some other data"]);

            expect(bst.left.left.key).to.be.equal(1);

            expect(bst.left.left.data).to.be.deep.equal(["hello"]);

            expect(bst.left.right.key).to.be.equal(9);

            expect(bst.left.right.data).to.be.deep.equal(["world"]);
        });

        it("Recursive insertion on the right works", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");
            bst.insert(17, "some other data");
            bst.insert(11, "hello");
            bst.insert(19, "world");

            bst.checkIsBST();
            assert.isNull(bst.left);
            expect(bst.right.key).to.be.equal(17);

            expect(bst.right.data).to.be.deep.equal(["some other data"]);

            expect(bst.right.left.key).to.be.equal(11);

            expect(bst.right.left.data).to.be.deep.equal(["hello"]);

            expect(bst.right.right.key).to.be.equal(19);

            expect(bst.right.right.data).to.be.deep.equal(["world"]);
        });

        it("If uniqueness constraint not enforced, we can insert different data for same key", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "some data");
            bst.insert(3, "hello");
            bst.insert(3, "world");

            bst.checkIsBST();
            expect(bst.left.key).to.be.equal(3);

            expect(bst.left.data).to.be.deep.equal(["hello", "world"]);

            bst.insert(12, "a");
            bst.insert(12, "b");

            bst.checkIsBST();
            expect(bst.right.key).to.be.equal(12);

            expect(bst.right.data).to.be.deep.equal(["a", "b"]);
        });

        it("If uniqueness constraint is enforced, we cannot insert different data for same key", () => {
            const bst = new BinarySearchTree({ unique: true });

            bst.insert(10, "some data");
            bst.insert(3, "hello");
            try {
                bst.insert(3, "world");
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
                expect(e.key).to.be.equal(3);
            }

            bst.checkIsBST();
            expect(bst.left.key).to.be.equal(3);

            expect(bst.left.data).to.be.deep.equal(["hello"]);

            bst.insert(12, "a");
            try {
                bst.insert(12, "world");
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
                expect(e.key).to.be.equal(12);
            }

            bst.checkIsBST();
            expect(bst.right.key).to.be.equal(12);

            expect(bst.right.data).to.be.deep.equal(["a"]);
        });

        it("Can insert 0 or the empty string", () => {
            let bst = new BinarySearchTree();

            bst.insert(0, "some data");

            bst.checkIsBST();
            expect(bst.key).to.be.equal(0);

            expect(bst.data).to.be.deep.equal(["some data"]);
            assert.isNull(bst.left);
            assert.isNull(bst.right);

            bst = new BinarySearchTree();

            bst.insert("", "some other data");

            bst.checkIsBST();
            expect(bst.key).to.be.equal("");

            expect(bst.data).to.be.deep.equal(["some other data"]);
            assert.isNull(bst.left);
            assert.isNull(bst.right);
        });

        it("Can insert a lot of keys and still get a BST (sanity check)", () => {
            const bst = new BinarySearchTree({ unique: true });

            getRandomArray(100).forEach((n) => {
                bst.insert(n, "some data");
            });

            bst.checkIsBST();
        });

        it("All children get a pointer to their parent, the root doesnt", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "root");
            bst.insert(5, "yes");
            bst.insert(15, "no");

            bst.checkIsBST();

            assert.isNull(bst.parent);
            expect(bst.left.parent).to.be.equal(bst);
            expect(bst.right.parent).to.be.equal(bst);
        });
    }); // ==== End of 'Insertion' ==== //


    describe("Search", () => {

        it("Can find data in a BST", () => {
            let bst = new BinarySearchTree(),
                i;

            getRandomArray(100).forEach((n) => {
                bst.insert(n, `some data for ${n}`);
            });

            bst.checkIsBST();

            for (i = 0; i < 100; i += 1) {
                expect(bst.search(i)).to.be.deep.equal([`some data for ${i}`]);
            }
        });

        it("If no data can be found, return an empty array", () => {
            const bst = new BinarySearchTree();

            getRandomArray(100).forEach((n) => {
                if (n !== 63) {
                    bst.insert(n, `some data for ${n}`);
                }
            });

            bst.checkIsBST();

            expect(bst.search(-2).length).to.be.equal(0);
            expect(bst.search(100).length).to.be.equal(0);
            expect(bst.search(101).length).to.be.equal(0);
            expect(bst.search(63).length).to.be.equal(0);
        });

        it("Can search for data between two bounds", () => {
            const bst = new BinarySearchTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                bst.insert(k, `data ${k}`);
            });

            assert.deepEqual(bst.betweenBounds({ $gte: 8, $lte: 15 }), ["data 8", "data 10", "data 13", "data 15"]);
            assert.deepEqual(bst.betweenBounds({ $gt: 8, $lt: 15 }), ["data 10", "data 13"]);
        });

        it("Bounded search can handle cases where query contains both $lt and $lte, or both $gt and $gte", () => {
            const bst = new BinarySearchTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                bst.insert(k, `data ${k}`);
            });

            assert.deepEqual(bst.betweenBounds({ $gt: 8, $gte: 8, $lte: 15 }), ["data 10", "data 13", "data 15"]);
            assert.deepEqual(bst.betweenBounds({ $gt: 5, $gte: 8, $lte: 15 }), ["data 8", "data 10", "data 13", "data 15"]);
            assert.deepEqual(bst.betweenBounds({ $gt: 8, $gte: 5, $lte: 15 }), ["data 10", "data 13", "data 15"]);

            assert.deepEqual(bst.betweenBounds({ $gte: 8, $lte: 15, $lt: 15 }), ["data 8", "data 10", "data 13"]);
            assert.deepEqual(bst.betweenBounds({ $gte: 8, $lte: 18, $lt: 15 }), ["data 8", "data 10", "data 13"]);
            assert.deepEqual(bst.betweenBounds({ $gte: 8, $lte: 15, $lt: 18 }), ["data 8", "data 10", "data 13", "data 15"]);
        });

        it("Bounded search can work when one or both boundaries are missing", () => {
            const bst = new BinarySearchTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                bst.insert(k, `data ${k}`);
            });

            assert.deepEqual(bst.betweenBounds({ $gte: 11 }), ["data 13", "data 15", "data 18"]);
            assert.deepEqual(bst.betweenBounds({ $lte: 9 }), ["data 3", "data 5", "data 8"]);
        });
    }); /// ==== End of 'Search' ==== //


    describe("Deletion", () => {

        it("Deletion does nothing on an empty tree", () => {
            let bst = new BinarySearchTree(),
                bstu = new BinarySearchTree({ unique: true });

            expect(bst.getNumberOfKeys()).to.be.equal(0);
            expect(bstu.getNumberOfKeys()).to.be.equal(0);


            bst.delete(5);
            bstu.delete(5);

            expect(bst.hasOwnProperty("key")).to.be.equal(false);
            expect(bstu.hasOwnProperty("key")).to.be.equal(false);
            expect(bst.data.length).to.be.equal(0);
            expect(bstu.data.length).to.be.equal(0);
            expect(bst.getNumberOfKeys()).to.be.equal(0);
            expect(bstu.getNumberOfKeys()).to.be.equal(0);
        });

        it("Deleting a non-existent key doesnt have any effect", () => {
            const bst = new BinarySearchTree();

            [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });

            function checkBst() {
                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
                });
            }

            checkBst();
            expect(bst.getNumberOfKeys()).to.be.equal(7);


            bst.delete(2);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(4);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(9);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(6);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(11);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(14);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(20);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(200);
            checkBst(); bst.checkIsBST(); expect(bst.getNumberOfKeys()).to.be.equal(7);
        });

        it("Able to delete the root if it is also a leaf", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "hello");
            expect(bst.key).to.be.equal(10);

            expect(bst.data).to.be.deep.equal(["hello"]);
            expect(bst.getNumberOfKeys()).to.be.equal(1);


            bst.delete(10);
            expect(bst.hasOwnProperty("key")).to.be.equal(false);
            expect(bst.data.length).to.be.equal(0);
            expect(bst.getNumberOfKeys()).to.be.equal(0);
        });

        it("Able to delete leaf nodes that are non-root", () => {
            let bst;

            function recreateBst() {
                bst = new BinarySearchTree();

                // With this insertion order the tree is well balanced
                // So we know the leaves are 3, 8, 12, 37
                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    bst.insert(k, `some ${k}`);
                });

                expect(bst.getNumberOfKeys()).to.be.equal(7);
            }

            function checkOnlyOneWasRemoved(theRemoved) {
                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    if (k === theRemoved) {
                        expect(bst.search(k).length).to.be.equal(0);
                    } else {
                        expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
                    }
                });

                expect(bst.getNumberOfKeys()).to.be.equal(6);
            }

            recreateBst();
            bst.delete(3);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(3);
            assert.isNull(bst.left.left);

            recreateBst();
            bst.delete(8);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(8);
            assert.isNull(bst.left.right);

            recreateBst();
            bst.delete(12);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(12);
            assert.isNull(bst.right.left);

            recreateBst();
            bst.delete(37);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(37);
            assert.isNull(bst.right.right);
        });

        it("Able to delete the root if it has only one child", () => {
            let bst;

            // Root has only one child, on the left
            bst = new BinarySearchTree();
            [10, 5, 3, 6].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });
            expect(bst.getNumberOfKeys()).to.be.equal(4);

            bst.delete(10);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(3);

            [5, 3, 6].forEach((k) => {
                expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(bst.search(10).length).to.be.equal(0);

            // Root has only one child, on the right

            bst = new BinarySearchTree();
            [10, 15, 13, 16].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });
            expect(bst.getNumberOfKeys()).to.be.equal(4);

            bst.delete(10);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(3);

            [15, 13, 16].forEach((k) => {
                expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(bst.search(10).length).to.be.equal(0);
        });

        it("Able to delete non root nodes that have only one child", () => {
            let bst;

            function recreateBst() {
                bst = new BinarySearchTree();

                [10, 5, 15, 3, 1, 4, 20, 17, 25].forEach((k) => {
                    bst.insert(k, `some ${k}`);
                });

                expect(bst.getNumberOfKeys()).to.be.equal(9);
            }

            function checkOnlyOneWasRemoved(theRemoved) {
                [10, 5, 15, 3, 1, 4, 20, 17, 25].forEach((k) => {
                    if (k === theRemoved) {
                        expect(bst.search(k).length).to.be.equal(0);
                    } else {
                        expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
                    }
                });

                expect(bst.getNumberOfKeys()).to.be.equal(8);
            }

            recreateBst();
            bst.delete(5);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(5);

            recreateBst();
            bst.delete(15);
            bst.checkIsBST();
            checkOnlyOneWasRemoved(15);
        });

        it("Can delete the root if it has 2 children", () => {
            let bst;

            bst = new BinarySearchTree();
            [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });
            expect(bst.getNumberOfKeys()).to.be.equal(7);

            bst.delete(10);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(6);

            [5, 3, 8, 15, 12, 37].forEach((k) => {
                expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(bst.search(10).length).to.be.equal(0);
        });

        it("Can delete a non-root node that has two children", () => {
            let bst;

            bst = new BinarySearchTree();
            [10, 5, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });
            expect(bst.getNumberOfKeys()).to.be.equal(15);

            bst.delete(5);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(14);

            [10, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach((k) => {
                expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(bst.search(5).length).to.be.equal(0);


            bst = new BinarySearchTree();
            [10, 5, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42].forEach((k) => {
                bst.insert(k, `some ${k}`);
            });
            expect(bst.getNumberOfKeys()).to.be.equal(15);

            bst.delete(15);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(14);

            [10, 5, 3, 1, 4, 8, 6, 9, 12, 11, 13, 20, 19, 42].forEach((k) => {
                expect(bst.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(bst.search(15).length).to.be.equal(0);
        });

        it("If no value is provided, it will delete the entire node even if there are multiple pieces of data", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "yes");
            bst.insert(5, "hello");
            bst.insert(3, "yes");
            bst.insert(5, "world");
            bst.insert(8, "yes");

            assert.deepEqual(bst.search(5), ["hello", "world"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);


            bst.delete(5);
            expect(bst.search(5).length).to.be.equal(0);
            expect(bst.getNumberOfKeys()).to.be.equal(3);
        });

        it("Can remove only one value from an array", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "yes");
            bst.insert(5, "hello");
            bst.insert(3, "yes");
            bst.insert(5, "world");
            bst.insert(8, "yes");

            assert.deepEqual(bst.search(5), ["hello", "world"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);


            bst.delete(5, "hello");
            assert.deepEqual(bst.search(5), ["world"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);
        });

        it("Removes nothing if value doesnt match", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "yes");
            bst.insert(5, "hello");
            bst.insert(3, "yes");
            bst.insert(5, "world");
            bst.insert(8, "yes");

            assert.deepEqual(bst.search(5), ["hello", "world"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);


            bst.delete(5, "nope");
            assert.deepEqual(bst.search(5), ["hello", "world"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);
        });

        it("If value provided but node contains only one value, remove entire node", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "yes");
            bst.insert(5, "hello");
            bst.insert(3, "yes2");
            bst.insert(5, "world");
            bst.insert(8, "yes3");

            assert.deepEqual(bst.search(3), ["yes2"]);
            expect(bst.getNumberOfKeys()).to.be.equal(4);


            bst.delete(3, "yes2");
            expect(bst.search(3).length).to.be.equal(0);
            expect(bst.getNumberOfKeys()).to.be.equal(3);
        });

        it("Can remove the root from a tree with height 2 when the root has two children (special case)", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "maybe");
            bst.insert(5, "no");
            bst.insert(15, "yes");
            expect(bst.getNumberOfKeys()).to.be.equal(3);


            bst.delete(10);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(2);

            assert.deepEqual(bst.search(5), ["no"]);
            assert.deepEqual(bst.search(15), ["yes"]);
        });

        it("Can remove the root from a tree with height 3 when the root has two children (special case where the two children themselves have children)", () => {
            const bst = new BinarySearchTree();

            bst.insert(10, "maybe");
            bst.insert(5, "no");
            bst.insert(15, "yes");
            bst.insert(2, "no");
            bst.insert(35, "yes");
            expect(bst.getNumberOfKeys()).to.be.equal(5);


            bst.delete(10);
            bst.checkIsBST();
            expect(bst.getNumberOfKeys()).to.be.equal(4);

            assert.deepEqual(bst.search(5), ["no"]);
            assert.deepEqual(bst.search(15), ["yes"]);
        });
    }); // ==== End of 'Deletion' ==== //


    it("Can use undefined as key and value", () => {
        function compareKeys(a, b) {
            if (a === undefined && b === undefined) {
                return 0;
            }
            if (a === undefined) {
                return -1;
            }
            if (b === undefined) {
                return 1;
            }

            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            if (a === b) {
                return 0;
            }
        }

        const bst = new BinarySearchTree({ compareKeys });

        bst.insert(2, undefined);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(undefined), []);

        bst.insert(undefined, "hello");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(undefined), ["hello"]);

        bst.insert(undefined, "world");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(undefined), ["hello", "world"]);

        bst.insert(4, undefined);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(4), [undefined]);
        assert.deepEqual(bst.search(undefined), ["hello", "world"]);

        bst.delete(undefined, "hello");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(4), [undefined]);
        assert.deepEqual(bst.search(undefined), ["world"]);

        bst.delete(undefined);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [undefined]);
        assert.deepEqual(bst.search(4), [undefined]);
        assert.deepEqual(bst.search(undefined), []);

        bst.delete(2, undefined);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(bst.search(2), []);
        assert.deepEqual(bst.search(4), [undefined]);
        assert.deepEqual(bst.search(undefined), []);

        bst.delete(4);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(0);

        assert.deepEqual(bst.search(2), []);
        assert.deepEqual(bst.search(4), []);
        assert.deepEqual(bst.search(undefined), []);
    });

    it("Can use null as key and value", () => {
        function compareKeys(a, b) {
            if (a === null && b === null) {
                return 0;
            }
            if (a === null) {
                return -1;
            }
            if (b === null) {
                return 1;
            }

            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            if (a === b) {
                return 0;
            }
        }

        const bst = new BinarySearchTree({ compareKeys });

        bst.insert(2, null);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(null), []);

        bst.insert(null, "hello");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(null), ["hello"]);

        bst.insert(null, "world");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(null), ["hello", "world"]);

        bst.insert(4, null);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(4), [null]);
        assert.deepEqual(bst.search(null), ["hello", "world"]);

        bst.delete(null, "hello");
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(4), [null]);
        assert.deepEqual(bst.search(null), ["world"]);

        bst.delete(null);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(bst.search(2), [null]);
        assert.deepEqual(bst.search(4), [null]);
        assert.deepEqual(bst.search(null), []);

        bst.delete(2, null);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(bst.search(2), []);
        assert.deepEqual(bst.search(4), [null]);
        assert.deepEqual(bst.search(null), []);

        bst.delete(4);
        bst.checkIsBST();
        expect(bst.getNumberOfKeys()).to.be.equal(0);

        assert.deepEqual(bst.search(2), []);
        assert.deepEqual(bst.search(4), []);
        assert.deepEqual(bst.search(null), []);
    });

    describe("Execute on every node (=tree traversal)", () => {

        it("Can execute a function on every node", () => {
            let bst = new BinarySearchTree(),
                keys = [],
                executed = 0;

            bst.insert(10, "yes");
            bst.insert(5, "hello");
            bst.insert(3, "yes2");
            bst.insert(8, "yes3");
            bst.insert(15, "yes3");
            bst.insert(159, "yes3");
            bst.insert(11, "yes3");

            bst.executeOnEveryNode((node) => {
                keys.push(node.key);
                executed += 1;
            });

            assert.deepEqual(keys, [3, 5, 8, 10, 11, 15, 159]);
            expect(executed).to.be.equal(7);
        });
    }); // ==== End of 'Execute on every node' ==== //


    // This test performs several inserts and deletes at random, always checking the content
    // of the tree are as expected and the binary search tree constraint is respected
    // This test is important because it can catch bugs other tests can't
    // By their nature, BSTs can be hard to test (many possible cases, bug at one operation whose
    // effect begins to be felt only after several operations etc.)
    describe("Randomized test (takes much longer than the rest of the test suite)", function () {
        this.timeout(30000);
        let bst = new BinarySearchTree(),
            data = {};

        // Check a bst against a simple key => [data] object
        function checkDataIsTheSame(bst, data) {
            const bstDataElems = [];

            // bstDataElems is a simple array containing every piece of data in the tree
            bst.executeOnEveryNode((node) => {
                let i;
                for (i = 0; i < node.data.length; i += 1) {
                    bstDataElems.push(node.data[i]);
                }
            });

            // Number of key and number of pieces of data match
            expect(bst.getNumberOfKeys()).to.be.equal(Object.keys(data).length);


            expect([...adone.util.entries(data)].map((d) => d[1].length).reduce((memo, n) => memo + n, 0)).to.be.equal(bstDataElems.length);
            // Compare data
            Object.keys(data).forEach((key) => {
                checkDataEquality(bst.search(key), data[key]);
            });
        }

        // Check two pieces of data coming from the bst and data are the same
        function checkDataEquality(fromBst, fromData) {
            if (fromBst.length === 0) {
                if (fromData) {
                    expect(fromData.length).to.be.equal(0);
                }
            }

            assert.deepEqual(fromBst, fromData);
        }

        // Tests the tree structure (deletions concern the whole tree, deletion of some data in a node is well tested above)
        it("Inserting and deleting entire nodes", () => {
            // You can skew to be more insertive or deletive, to test all cases
            function launchRandomTest(nTests, proba) {
                let i, key, dataPiece, possibleKeys;

                for (i = 0; i < nTests; i += 1) {
                    if (Math.random() > proba) {
                        // Deletion
                        possibleKeys = Object.keys(data);

                        if (possibleKeys.length > 0) {
                            key = possibleKeys[Math.floor(possibleKeys.length * Math.random()).toString()];
                        } else {
                            key = Math.floor(70 * Math.random()).toString();
                        }

                        delete data[key];
                        bst.delete(key);
                    } else {
                        // Insertion
                        key = Math.floor(70 * Math.random()).toString();
                        dataPiece = Math.random().toString().substring(0, 6);
                        bst.insert(key, dataPiece);
                        if (data[key]) {
                            data[key].push(dataPiece);
                        } else {
                            data[key] = [dataPiece];
                        }
                    }

                    // Check the bst constraint are still met and the data is correct
                    bst.checkIsBST();
                    checkDataIsTheSame(bst, data);
                }
            }

            launchRandomTest(1000, 0.65);
            launchRandomTest(2000, 0.35);
        });
    }); // ==== End of 'Randomized test' ==== //

});
