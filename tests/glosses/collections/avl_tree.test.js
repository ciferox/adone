describe("collection", "AVLTree", () => {
    const { is, collection: { AVLTree } } = adone;

    const getRandomArray = (n) => {
        if (n === 0) {
            return [];
        }
        if (n === 1) {
            return [0];
        }

        const res = getRandomArray(n - 1);
        const next = Math.floor(Math.random() * n);
        res.splice(next, 0, n - 1); // Add n-1 at a random position in the array

        return res;
    };

    describe("Sanity checks", () => {

        it("Checking that all nodes heights are correct", () => {
            const _AVLTree = AVLTree._AVLTree;
            const avlt = new _AVLTree({ key: 10 });
            const l = new _AVLTree({ key: 5 });
            const r = new _AVLTree({ key: 15 });
            const ll = new _AVLTree({ key: 3 });
            const lr = new _AVLTree({ key: 8 });
            const rl = new _AVLTree({ key: 13 });
            const rr = new _AVLTree({ key: 18 });
            const lrl = new _AVLTree({ key: 7 });
            const lrll = new _AVLTree({ key: 6 });

            // With a balanced tree
            avlt.left = l;
            avlt.right = r;
            l.left = ll;
            l.right = lr;
            r.left = rl;
            r.right = rr;

            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            avlt.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            l.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            r.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            ll.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lr.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            rl.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            rr.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            avlt.height = 2;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            l.height = 2;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            r.height = 2;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            avlt.height = 3;
            avlt.checkHeightCorrect(); // Correct

            // With an unbalanced tree
            lr.left = lrl;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lrl.left = lrll;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lrl.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lrll.height = 1;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lrl.height = 2;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            lr.height = 3;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            l.height = 4;
            expect(() => {
                avlt.checkHeightCorrect();
            }).to.throw();

            avlt.height = 5;
            avlt.checkHeightCorrect(); // Correct
        });

        it("Calculate the balance factor", () => {
            const _AVLTree = AVLTree._AVLTree;
            const avlt = new _AVLTree({ key: 10 });
            const l = new _AVLTree({ key: 5 });
            const r = new _AVLTree({ key: 15 });
            const ll = new _AVLTree({ key: 3 });
            const lr = new _AVLTree({ key: 8 });
            const rl = new _AVLTree({ key: 13 });
            const rr = new _AVLTree({ key: 18 });
            const lrl = new _AVLTree({ key: 7 });
            const lrll = new _AVLTree({ key: 6 });

            // With a balanced tree
            avlt.left = l;
            avlt.right = r;
            l.left = ll;
            l.right = lr;
            r.left = rl;
            r.right = rr;

            ll.height = 1;
            rl.height = 1;
            rr.height = 1;
            avlt.height = 2;
            r.height = 2;
            lr.left = lrl;
            lrl.left = lrll;
            lrl.height = 1;
            lrll.height = 1;
            lrl.height = 2;
            lr.height = 3;
            l.height = 4;
            avlt.height = 5;
            avlt.checkHeightCorrect(); // Correct

            expect(lrll.balanceFactor()).to.be.equal(0);
            expect(lrl.balanceFactor()).to.be.equal(1);
            expect(ll.balanceFactor()).to.be.equal(0);
            expect(lr.balanceFactor()).to.be.equal(2);
            expect(rl.balanceFactor()).to.be.equal(0);
            expect(rr.balanceFactor()).to.be.equal(0);
            expect(l.balanceFactor()).to.be.equal(-2);
            expect(r.balanceFactor()).to.be.equal(0);
            expect(avlt.balanceFactor()).to.be.equal(2);
        });

        it("Can check that a tree is balanced", () => {
            const _AVLTree = AVLTree._AVLTree;
            const avlt = new _AVLTree({ key: 10 });
            const l = new _AVLTree({ key: 5 });
            const r = new _AVLTree({ key: 15 });
            const ll = new _AVLTree({ key: 3 });
            const lr = new _AVLTree({ key: 8 });
            const rl = new _AVLTree({ key: 13 });
            const rr = new _AVLTree({ key: 18 });

            avlt.left = l;
            avlt.right = r;
            l.left = ll;
            l.right = lr;
            r.left = rl;
            r.right = rr;

            ll.height = 1;
            lr.height = 1;
            rl.height = 1;
            rr.height = 1;
            l.height = 2;
            r.height = 2;
            avlt.height = 3;
            avlt.checkBalanceFactors();

            r.height = 0;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            r.height = 4;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            r.height = 2;
            avlt.checkBalanceFactors();

            ll.height = -1;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            ll.height = 3;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            ll.height = 1;
            avlt.checkBalanceFactors();

            rl.height = -1;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            rl.height = 3;
            expect(() => {
                avlt.checkBalanceFactors();
            }).to.throw();

            rl.height = 1;
            avlt.checkBalanceFactors();
        });
    }); // ==== End of 'Sanity checks' ==== //


    describe("Insertion", () => {

        it("The root has a height of 1", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "root");
            expect(avlt.tree.height).to.be.equal(1);
        });

        it("Insert at the root if its the first insertion", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "some data");

            avlt.checkIsAVLT();
            expect(avlt.tree.key).to.be.equal(10);

            expect(avlt.tree.data).to.be.deep.equal(["some data"]);
            assert.isNull(avlt.tree.left);
            assert.isNull(avlt.tree.right);
        });

        it("If uniqueness constraint not enforced, we can insert different data for same key", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "some data");
            avlt.insert(3, "hello");
            avlt.insert(3, "world");

            avlt.checkIsAVLT();
            expect(avlt.search(3)).to.be.deep.equal(["hello", "world"]);

            avlt.insert(12, "a");
            avlt.insert(12, "b");

            avlt.checkIsAVLT();
            expect(avlt.search(12)).to.be.deep.equal(["a", "b"]);
        });

        it("If uniqueness constraint is enforced, we cannot insert different data for same key", () => {
            const avlt = new AVLTree({ unique: true });

            avlt.insert(10, "some data");
            avlt.insert(3, "hello");
            try {
                avlt.insert(3, "world");
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
                expect(e.key).to.be.equal(3);
            }

            avlt.checkIsAVLT();
            expect(avlt.search(3)).to.be.deep.equal(["hello"]);

            avlt.insert(12, "a");
            try {
                avlt.insert(12, "world");
            } catch (e) {
                expect(e.errorType).to.be.equal("uniqueViolated");
                expect(e.key).to.be.equal(12);
            }

            avlt.checkIsAVLT();
            expect(avlt.search(12)).to.be.deep.equal(["a"]);
        });

        it("Can insert 0 or the empty string", () => {
            let avlt = new AVLTree();

            avlt.insert(0, "some data");

            avlt.checkIsAVLT();
            expect(avlt.tree.key).to.be.equal(0);

            expect(avlt.tree.data).to.be.deep.equal(["some data"]);

            avlt = new AVLTree();

            avlt.insert("", "some other data");

            avlt.checkIsAVLT();
            expect(avlt.tree.key).to.be.equal("");

            expect(avlt.tree.data).to.be.deep.equal(["some other data"]);
        });

        it("Auto-balancing insertions", () => {
            const avlt = new AVLTree();
            const avlt2 = new AVLTree();
            const avlt3 = new AVLTree();

            // Balancing insertions on the left
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(0);

            avlt.insert(18);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(1);

            avlt.tree.checkIsAVLT();
            avlt.insert(15);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(2);

            avlt.tree.checkIsAVLT();
            avlt.insert(13);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(3);

            avlt.tree.checkIsAVLT();
            avlt.insert(10);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(4);

            avlt.tree.checkIsAVLT();
            avlt.insert(8);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(5);

            avlt.tree.checkIsAVLT();
            avlt.insert(5);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(6);

            avlt.tree.checkIsAVLT();
            avlt.insert(3);
            expect(avlt.tree.getNumberOfKeys()).to.be.equal(7);

            avlt.tree.checkIsAVLT();

            // Balancing insertions on the right
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(0);

            avlt2.insert(3);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(1);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(5);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(2);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(8);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(3);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(10);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(4);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(13);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(5);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(15);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(6);

            avlt2.tree.checkIsAVLT();
            avlt2.insert(18);
            expect(avlt2.tree.getNumberOfKeys()).to.be.equal(7);

            avlt2.tree.checkIsAVLT();

            // Balancing already-balanced insertions
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(0);

            avlt3.insert(10);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(1);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(5);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(2);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(15);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(3);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(3);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(4);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(8);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(5);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(13);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(6);

            avlt3.tree.checkIsAVLT();
            avlt3.insert(18);
            expect(avlt3.tree.getNumberOfKeys()).to.be.equal(7);

            avlt3.tree.checkIsAVLT();
        });

        it("Can insert a lot of keys and still get an AVLT (sanity check)", () => {
            const avlt = new AVLTree({ unique: true });

            getRandomArray(1000).forEach((n) => {
                avlt.insert(n, "some data");
                avlt.checkIsAVLT();
            });
        });
    }); // ==== End of 'Insertion' ==== //


    describe("Search", () => {

        it("Can find data in an AVLT", () => {
            const avlt = new AVLTree();
            let i;

            getRandomArray(100).forEach((n) => {
                avlt.insert(n, `some data for ${n}`);
            });

            avlt.checkIsAVLT();

            for (i = 0; i < 100; i += 1) {
                expect(avlt.search(i)).to.be.deep.equal([`some data for ${i}`]);
            }
        });

        it("If no data can be found, return an empty array", () => {
            const avlt = new AVLTree();

            getRandomArray(100).forEach((n) => {
                if (n !== 63) {
                    avlt.insert(n, `some data for ${n}`);
                }
            });

            avlt.checkIsAVLT();

            expect(avlt.search(-2).length).to.be.equal(0);
            expect(avlt.search(100).length).to.be.equal(0);
            expect(avlt.search(101).length).to.be.equal(0);
            expect(avlt.search(63).length).to.be.equal(0);
        });

        it("Can search for data between two bounds", () => {
            const avlt = new AVLTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                avlt.insert(k, `data ${k}`);
            });

            assert.deepEqual(avlt.betweenBounds({ $gte: 8, $lte: 15 }), ["data 8", "data 10", "data 13", "data 15"]);
            assert.deepEqual(avlt.betweenBounds({ $gt: 8, $lt: 15 }), ["data 10", "data 13"]);
        });

        it("Bounded search can handle cases where query contains both $lt and $lte, or both $gt and $gte", () => {
            const avlt = new AVLTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                avlt.insert(k, `data ${k}`);
            });

            assert.deepEqual(avlt.betweenBounds({ $gt: 8, $gte: 8, $lte: 15 }), ["data 10", "data 13", "data 15"]);
            assert.deepEqual(avlt.betweenBounds({ $gt: 5, $gte: 8, $lte: 15 }), ["data 8", "data 10", "data 13", "data 15"]);
            assert.deepEqual(avlt.betweenBounds({ $gt: 8, $gte: 5, $lte: 15 }), ["data 10", "data 13", "data 15"]);

            assert.deepEqual(avlt.betweenBounds({ $gte: 8, $lte: 15, $lt: 15 }), ["data 8", "data 10", "data 13"]);
            assert.deepEqual(avlt.betweenBounds({ $gte: 8, $lte: 18, $lt: 15 }), ["data 8", "data 10", "data 13"]);
            assert.deepEqual(avlt.betweenBounds({ $gte: 8, $lte: 15, $lt: 18 }), ["data 8", "data 10", "data 13", "data 15"]);
        });

        it("Bounded search can work when one or both boundaries are missing", () => {
            const avlt = new AVLTree();

            [10, 5, 15, 3, 8, 13, 18].forEach((k) => {
                avlt.insert(k, `data ${k}`);
            });

            assert.deepEqual(avlt.betweenBounds({ $gte: 11 }), ["data 13", "data 15", "data 18"]);
            assert.deepEqual(avlt.betweenBounds({ $lte: 9 }), ["data 3", "data 5", "data 8"]);
        });
    }); /// ==== End of 'Search' ==== //


    describe("Deletion", () => {

        it("Deletion does nothing on an empty tree", () => {
            const avlt = new AVLTree();
            const avltu = new AVLTree({ unique: true });

            expect(avlt.getNumberOfKeys()).to.be.equal(0);
            expect(avltu.getNumberOfKeys()).to.be.equal(0);

            avlt.delete(5);
            avltu.delete(5);

            expect(avlt.tree.hasOwnProperty("key")).to.be.equal(false);
            expect(avltu.tree.hasOwnProperty("key")).to.be.equal(false);
            expect(avlt.tree.data.length).to.be.equal(0);
            expect(avltu.tree.data.length).to.be.equal(0);
            expect(avlt.getNumberOfKeys()).to.be.equal(0);
            expect(avltu.getNumberOfKeys()).to.be.equal(0);
        });

        it("Deleting a non-existent key doesnt have any effect", () => {
            const avlt = new AVLTree();

            [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });

            const checkavlt = () => {
                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
                });
            };

            checkavlt();
            expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(2);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(4);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(9);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(6);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(11);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(14);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(20);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(200);
            checkavlt(); avlt.checkIsAVLT(); expect(avlt.getNumberOfKeys()).to.be.equal(7);
        });

        it("Able to delete the root if it is also a leaf", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "hello");
            expect(avlt.tree.key).to.be.equal(10);

            expect(avlt.tree.data).to.be.deep.equal(["hello"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(1);

            avlt.delete(10);
            expect(avlt.tree.hasOwnProperty("key")).to.be.equal(false);
            expect(avlt.tree.data.length).to.be.equal(0);
            expect(avlt.getNumberOfKeys()).to.be.equal(0);
        });

        it("Able to delete leaf nodes that are non-root", () => {
            let avlt;

            // This will create an AVL tree with leaves 3, 8, 12, 37
            // (do a pretty print to see this)
            const recreateavlt = () => {
                avlt = new AVLTree();

                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    avlt.insert(k, `some ${k}`);
                });

                expect(avlt.getNumberOfKeys()).to.be.equal(7);
            };

            // Check that only keys in array theRemoved were removed
            const checkRemoved = (theRemoved) => {
                [10, 5, 3, 8, 15, 12, 37].forEach((k) => {
                    if (theRemoved.indexOf(k) !== -1) {
                        expect(avlt.search(k).length).to.be.equal(0);
                    } else {
                        expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
                    }
                });

                expect(avlt.getNumberOfKeys()).to.be.equal(7 - theRemoved.length);
            };

            recreateavlt();
            avlt.delete(3);
            avlt.checkIsAVLT();
            checkRemoved([3]);

            recreateavlt();
            avlt.delete(8);
            avlt.checkIsAVLT();
            checkRemoved([8]);

            recreateavlt();
            avlt.delete(12);
            avlt.checkIsAVLT();
            checkRemoved([12]);

            // Delete all leaves in a way that makes the tree unbalanced
            recreateavlt();
            avlt.delete(37);
            avlt.checkIsAVLT();
            checkRemoved([37]);

            avlt.delete(12);
            avlt.checkIsAVLT();
            checkRemoved([12, 37]);

            avlt.delete(15);
            avlt.checkIsAVLT();
            checkRemoved([12, 15, 37]);

            avlt.delete(3);
            avlt.checkIsAVLT();
            checkRemoved([3, 12, 15, 37]);

            avlt.delete(5);
            avlt.checkIsAVLT();
            checkRemoved([3, 5, 12, 15, 37]);

            avlt.delete(10);
            avlt.checkIsAVLT();
            checkRemoved([3, 5, 10, 12, 15, 37]);

            avlt.delete(8);
            avlt.checkIsAVLT();
            checkRemoved([3, 5, 8, 10, 12, 15, 37]);
        });

        it("Able to delete the root if it has only one child", () => {
            let avlt;

            // Root has only one child, on the left
            avlt = new AVLTree();
            [10, 5].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(2);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(1);

            expect(avlt.search(5)).to.be.deep.equal(["some 5"]);
            expect(avlt.search(10).length).to.be.equal(0);

            // Root has only one child, on the right

            avlt = new AVLTree();
            [10, 15].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(2);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(1);

            expect(avlt.search(15)).to.be.deep.equal(["some 15"]);
            expect(avlt.search(10).length).to.be.equal(0);
        });

        it("Able to delete non root nodes that have only one child", () => {
            let avlt = new AVLTree();
            const firstSet = [10, 5, 15, 3, 1, 4, 20];
            const secondSet = [10, 5, 15, 3, 1, 4, 20, 17, 25];

            // Check that only keys in array theRemoved were removed
            const checkRemoved = (set, theRemoved) => {
                set.forEach((k) => {
                    if (theRemoved.indexOf(k) !== -1) {
                        expect(avlt.search(k).length).to.be.equal(0);
                    } else {
                        expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
                    }
                });

                expect(avlt.getNumberOfKeys()).to.be.equal(set.length - theRemoved.length);
            };

            // First set: no rebalancing necessary
            firstSet.forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });

            expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.checkIsAVLT();

            avlt.delete(4); // Leaf
            avlt.checkIsAVLT();
            checkRemoved(firstSet, [4]);

            avlt.delete(3); // Node with only one child (on the left)
            avlt.checkIsAVLT();
            checkRemoved(firstSet, [3, 4]);

            avlt.delete(10); // Leaf
            avlt.checkIsAVLT();
            checkRemoved(firstSet, [3, 4, 10]);

            avlt.delete(15); // Node with only one child (on the right)
            avlt.checkIsAVLT();
            checkRemoved(firstSet, [3, 4, 10, 15]);

            // Second set: some rebalancing necessary
            avlt = new AVLTree();
            secondSet.forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });

            avlt.delete(4); // Leaf
            avlt.checkIsAVLT();
            checkRemoved(secondSet, [4]);

            avlt.delete(3); // Node with only one child (on the left), causes rebalancing
            avlt.checkIsAVLT();
            checkRemoved(secondSet, [3, 4]);
        });

        it("Can delete the root if it has 2 children", () => {
            let avlt = new AVLTree();

            // No rebalancing needed
            [10, 5, 15, 3, 8, 12, 37].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(6);

            [5, 3, 8, 15, 12, 37].forEach((k) => {
                expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(avlt.search(10).length).to.be.equal(0);

            // Rebalancing needed

            avlt = new AVLTree();
            [10, 5, 15, 8, 12, 37, 42].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(7);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(6);

            [5, 8, 15, 12, 37, 42].forEach((k) => {
                expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(avlt.search(10).length).to.be.equal(0);
        });

        it("Can delete a non-root node that has two children", () => {
            let avlt;

            // On the left
            avlt = new AVLTree();
            [10, 5, 15, 3, 8, 12, 20, 1, 4, 6, 9, 11, 13, 19, 42, 3.5].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(16);

            avlt.delete(5);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(15);

            [10, 3, 1, 4, 8, 6, 9, 15, 12, 11, 13, 20, 19, 42, 3.5].forEach((k) => {
                expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(avlt.search(5).length).to.be.equal(0);

            // On the right

            avlt = new AVLTree();
            [10, 5, 15, 3, 8, 12, 20, 1, 4, 6, 9, 11, 13, 19, 42, 12.5].forEach((k) => {
                avlt.insert(k, `some ${k}`);
            });
            expect(avlt.getNumberOfKeys()).to.be.equal(16);

            avlt.delete(15);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(15);

            [10, 3, 1, 4, 8, 6, 9, 5, 12, 11, 13, 20, 19, 42, 12.5].forEach((k) => {
                expect(avlt.search(k)).to.be.deep.equal([`some ${k}`]);
            });
            expect(avlt.search(15).length).to.be.equal(0);
        });

        it("If no value is provided, it will delete the entire node even if there are multiple pieces of data", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "yes");
            avlt.insert(5, "hello");
            avlt.insert(3, "yes");
            avlt.insert(5, "world");
            avlt.insert(8, "yes");

            assert.deepEqual(avlt.search(5), ["hello", "world"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);

            avlt.delete(5);
            avlt.checkIsAVLT();
            expect(avlt.search(5).length).to.be.equal(0);
            expect(avlt.getNumberOfKeys()).to.be.equal(3);
        });

        it("Can remove only one value from an array", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "yes");
            avlt.insert(5, "hello");
            avlt.insert(3, "yes");
            avlt.insert(5, "world");
            avlt.insert(8, "yes");

            assert.deepEqual(avlt.search(5), ["hello", "world"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);

            avlt.delete(5, "hello");
            avlt.checkIsAVLT();
            assert.deepEqual(avlt.search(5), ["world"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);
        });

        it("Removes nothing if value doesnt match", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "yes");
            avlt.insert(5, "hello");
            avlt.insert(3, "yes");
            avlt.insert(5, "world");
            avlt.insert(8, "yes");

            assert.deepEqual(avlt.search(5), ["hello", "world"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);

            avlt.delete(5, "nope");
            avlt.checkIsAVLT();
            assert.deepEqual(avlt.search(5), ["hello", "world"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);
        });

        it("If value provided but node contains only one value, remove entire node", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "yes");
            avlt.insert(5, "hello");
            avlt.insert(3, "yes2");
            avlt.insert(5, "world");
            avlt.insert(8, "yes3");

            assert.deepEqual(avlt.search(3), ["yes2"]);
            expect(avlt.getNumberOfKeys()).to.be.equal(4);

            avlt.delete(3, "yes2");
            avlt.checkIsAVLT();
            expect(avlt.search(3).length).to.be.equal(0);
            expect(avlt.getNumberOfKeys()).to.be.equal(3);
        });

        it("Can remove the root from a tree with height 2 when the root has two children (special case)", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "maybe");
            avlt.insert(5, "no");
            avlt.insert(15, "yes");
            expect(avlt.getNumberOfKeys()).to.be.equal(3);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(2);

            assert.deepEqual(avlt.search(5), ["no"]);
            assert.deepEqual(avlt.search(15), ["yes"]);
        });

        it("Can remove the root from a tree with height 3 when the root has two children (special case where the two children themselves have children)", () => {
            const avlt = new AVLTree();

            avlt.insert(10, "maybe");
            avlt.insert(5, "no");
            avlt.insert(15, "yes");
            avlt.insert(2, "no");
            avlt.insert(35, "yes");
            expect(avlt.getNumberOfKeys()).to.be.equal(5);

            avlt.delete(10);
            avlt.checkIsAVLT();
            expect(avlt.getNumberOfKeys()).to.be.equal(4);

            assert.deepEqual(avlt.search(5), ["no"]);
            assert.deepEqual(avlt.search(15), ["yes"]);
        });

        it("Removing falsy values does not delete the entire key", () => {
            const avlt = new AVLTree();

            avlt.insert(10, 2);
            avlt.insert(10, 1);
            assert.deepEqual(avlt.search(10), [2, 1]);

            avlt.delete(10, 2);
            assert.deepEqual(avlt.search(10), [1]);

            avlt.insert(10, 0);
            assert.deepEqual(avlt.search(10), [1, 0]);

            avlt.delete(10, 0);
            assert.deepEqual(avlt.search(10), [1]);
        });
    }); // ==== End of 'Deletion' ==== //


    it("Can use undefined as key and value", () => {
        const compareKeys = (a, b) => {
            if (is.undefined(a) && is.undefined(b)) {
                return 0;
            }
            if (is.undefined(a)) {
                return -1;
            }
            if (is.undefined(b)) {
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
        };

        const avlt = new AVLTree({ compareKeys });

        avlt.insert(2, undefined);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(undefined), []);

        avlt.insert(undefined, "hello");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(undefined), ["hello"]);

        avlt.insert(undefined, "world");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(undefined), ["hello", "world"]);

        avlt.insert(4, undefined);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(4), [undefined]);
        assert.deepEqual(avlt.search(undefined), ["hello", "world"]);

        avlt.delete(undefined, "hello");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(4), [undefined]);
        assert.deepEqual(avlt.search(undefined), ["world"]);

        avlt.delete(undefined);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [undefined]);
        assert.deepEqual(avlt.search(4), [undefined]);
        assert.deepEqual(avlt.search(undefined), []);

        avlt.delete(2, undefined);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(avlt.search(2), []);
        assert.deepEqual(avlt.search(4), [undefined]);
        assert.deepEqual(avlt.search(undefined), []);

        avlt.delete(4);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(0);

        assert.deepEqual(avlt.search(2), []);
        assert.deepEqual(avlt.search(4), []);
        assert.deepEqual(avlt.search(undefined), []);
    });

    it("Can use null as key and value", () => {
        const compareKeys = (a, b) => {
            if (is.null(a) && is.null(b)) {
                return 0;
            }
            if (is.null(a)) {
                return -1;
            }
            if (is.null(b)) {
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
        };

        const avlt = new AVLTree({ compareKeys });

        avlt.insert(2, null);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(null), []);

        avlt.insert(null, "hello");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(null), ["hello"]);

        avlt.insert(null, "world");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(null), ["hello", "world"]);

        avlt.insert(4, null);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(4), [null]);
        assert.deepEqual(avlt.search(null), ["hello", "world"]);

        avlt.delete(null, "hello");
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(3);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(4), [null]);
        assert.deepEqual(avlt.search(null), ["world"]);

        avlt.delete(null);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(2);

        assert.deepEqual(avlt.search(2), [null]);
        assert.deepEqual(avlt.search(4), [null]);
        assert.deepEqual(avlt.search(null), []);

        avlt.delete(2, null);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(1);

        assert.deepEqual(avlt.search(2), []);
        assert.deepEqual(avlt.search(4), [null]);
        assert.deepEqual(avlt.search(null), []);

        avlt.delete(4);
        avlt.checkIsAVLT();
        expect(avlt.getNumberOfKeys()).to.be.equal(0);

        assert.deepEqual(avlt.search(2), []);
        assert.deepEqual(avlt.search(4), []);
        assert.deepEqual(avlt.search(null), []);
    });

    describe("Execute on every node (=tree traversal)", () => {

        it("Can execute a function on every node", () => {
            const avlt = new AVLTree();
            const keys = [];
            let executed = 0;

            avlt.insert(10, "yes");
            avlt.insert(5, "hello");
            avlt.insert(3, "yes2");
            avlt.insert(8, "yes3");
            avlt.insert(15, "yes3");
            avlt.insert(159, "yes3");
            avlt.insert(11, "yes3");

            avlt.executeOnEveryNode((node) => {
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

        const avlt = new AVLTree();
        const data = {};

        // Check two pieces of data coming from the avlt and data are the same
        const checkDataEquality = (fromavlt, fromData) => {
            if (fromavlt.length === 0) {
                if (fromData) {
                    expect(fromData.length).to.be.equal(0);
                }
            }

            assert.deepEqual(fromavlt, fromData);
        };

        // Check a avlt against a simple key => [data] object
        const checkDataIsTheSame = (avlt, data) => {
            const avltDataElems = [];

            // avltDataElems is a simple array containing every piece of data in the tree
            avlt.executeOnEveryNode((node) => {
                let i;
                for (i = 0; i < node.data.length; i += 1) {
                    avltDataElems.push(node.data[i]);
                }
            });

            // Number of key and number of pieces of data match
            expect(avlt.getNumberOfKeys()).to.be.equal(Object.keys(data).length);

            expect([...adone.util.entries(data)].map((d) => d[1].length).reduce((memo, n) => memo + n, 0)).
                to.be.equal(avltDataElems.length);

            // Compare data
            Object.keys(data).forEach((key) => {
                checkDataEquality(avlt.search(key), data[key]);
            });
        };

        // Tests the tree structure (deletions concern the whole tree, deletion of some data in a node is well tested above)
        it("Inserting and deleting entire nodes", () => {
            // You can skew to be more insertive or deletive, to test all cases
            const launchRandomTest = (nTests, proba) => {
                let key;
                let dataPiece;
                let possibleKeys;

                for (let i = 0; i < nTests; i += 1) {
                    if (Math.random() > proba) {
                        // Deletion
                        possibleKeys = Object.keys(data);

                        if (possibleKeys.length > 0) {
                            key = possibleKeys[Math.floor(possibleKeys.length * Math.random()).toString()];
                        } else {
                            key = Math.floor(70 * Math.random()).toString();
                        }

                        delete data[key];
                        avlt.delete(key);
                    } else {
                        // Insertion
                        key = Math.floor(70 * Math.random()).toString();
                        dataPiece = Math.random().toString().substring(0, 6);

                        avlt.insert(key, dataPiece);
                        if (data[key]) {
                            data[key].push(dataPiece);
                        } else {
                            data[key] = [dataPiece];
                        }
                    }

                    // Check the avlt constraint are still met and the data is correct
                    avlt.checkIsAVLT();
                    checkDataIsTheSame(avlt, data);
                }
            };

            launchRandomTest(1000, 0.65);
            launchRandomTest(2000, 0.35);
        });
    }); // ==== End of 'Randomized test' ==== //
});
