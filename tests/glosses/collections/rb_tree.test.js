describe("collection", "RedBlackTree", () => {
    const iota = (n) => [...new Array(n)].map((_, i) => i);

    const COLORS = ["r", "b", "bb"];

    const printTree = (tree) => {
        if (!tree) {
            return [];
        }
        return [COLORS[tree._color], tree.key, printTree(tree.left), printTree(tree.right)];
    };

    // Ensures the red black axioms are satisfied by tree
    const checkTree = (tree) => {
        if (!tree.root) {
            return;
        }
        assert.equal(tree.root._color, 1, "root is black");
        const checkNode = (node) => {
            if (!node) {
                return [1, 0];
            }
            if (node._color === 0) {
                assert.isOk(!node.left || node.left._color === 1, "children of red node must be black");
                assert.isOk(!node.right || node.right._color === 1, "children of red node must be black");
            } else {
                assert.equal(node._color, 1, "node color must be red or black");
            }
            if (node.left) {
                assert.isOk(tree._compare(node.left.key, node.key) <= 0, "left tree order invariant");
            }
            if (node.right) {
                assert.isOk(tree._compare(node.right.key, node.key) >= 0, "right tree order invariant");
            }
            const cl = checkNode(node.left);
            const cr = checkNode(node.right);
            assert.equal(cl[0], cr[0], "number of black nodes along all paths to root must be constant");
            assert.equal(cl[1] + cr[1] + 1, node._count, "item count consistency");
            return [cl[0] + node._color, cl[1] + cr[1] + 1];
        };
        const r = checkNode(tree.root);
        assert.equal(r[1], tree.length, "tree length");
    };

    const compareIterators = (a, b) => {
        assert.equal(a.tree, b.tree, "iter trees");
        assert.equal(a.valid, b.valid, "iter validity");
        if (!b.valid) {
            return;
        }
        assert.equal(a.node, b.node, "iter node");
        assert.equal(a.key, b.key, "iter key");
        assert.equal(a.value, b.value, "iter value");
        assert.equal(a.index, b.index, "iter index");
    };

    it("insert()", () => {
        const t1 = new adone.collection.RedBlackTree();

        let u = t1;
        const arr = [];
        for (let i = 20; i >= 0; --i) {
            const x = i;
            const next = u.insert(x, true);
            checkTree(u);
            checkTree(next);
            assert.equal(u.length, arr.length);
            arr.push(x);
            u = next;
        }
        for (let i = -20; i < 0; ++i) {
            const x = i;
            const next = u.insert(x, true);
            checkTree(u);
            checkTree(next);
            arr.sort((a, b) => {
                return a - b;
            });
            let ptr = 0;
            u.forEach((k) => {
                assert.equal(k, arr[ptr++]);
            });
            assert.equal(ptr, arr.length);
            arr.push(x);
            u = next;
        }

        const start = u.begin;
        for (let i = -20, j = 0; j <= 40; ++i, ++j) {
            assert.equal(u.at(j).key, i, "checking at()");
            assert.equal(start.key, i, "checking iter");
            assert.equal(start.index, j, "checking index");
            assert.isOk(start.valid, "checking valid");
            if (j < 40) {
                assert.isOk(start.hasNext, "hasNext()");
            } else {
                assert.isOk(!start.hasNext, "eof hasNext()");
            }
            start.next();
        }
        assert.isOk(!start.valid, "invalid eof iterator");
        assert.isOk(!start.hasNext, "hasNext() at eof fail");
        assert.equal(start.index, 41, "eof index");
    });

    it("foreach", () => {
        const u = iota(31).reduce((u, k, v) => {
            return u.insert(k, v);
        }, new adone.collection.RedBlackTree());

        //Check basic foreach
        let visitKeys = [];
        let visitVals = [];
        u.forEach((k, v) => {
            visitKeys.push(k);
            visitVals.push(v);
        });
        assert.sameMembers(visitKeys, u.keys);
        assert.sameMembers(visitVals, u.values);

        //Check foreach with termination
        visitKeys = [];
        visitVals = [];
        assert.equal(u.forEach((k, v) => {
            if (k === 5) {
                return 1000;
            }
            visitKeys.push(k);
            visitVals.push(v);
        }), 1000);
        assert.sameMembers(visitKeys, u.keys.slice(0, 5));
        assert.sameMembers(visitVals, u.values.slice(0, 5));

        //Check half interval foreach
        visitKeys = [];
        visitVals = [];
        u.forEach((k, v) => {
            visitKeys.push(k);
            visitVals.push(v);
        }, 3);
        assert.sameMembers(visitKeys, u.keys.slice(3));
        assert.sameMembers(visitVals, u.values.slice(3));

        //Check half interval foreach with termination
        visitKeys = [];
        visitVals = [];
        assert.equal(u.forEach((k, v) => {
            if (k === 12) {
                return 1000;
            }
            visitKeys.push(k);
            visitVals.push(v);
        }, 3), 1000);
        assert.sameMembers(visitKeys, u.keys.slice(3, 12));
        assert.sameMembers(visitVals, u.values.slice(3, 12));


        //Check interval foreach
        visitKeys = [];
        visitVals = [];
        u.forEach((k, v) => {
            visitKeys.push(k);
            visitVals.push(v);
        }, 3, 15);
        assert.sameMembers(visitKeys, u.keys.slice(3, 15));
        assert.sameMembers(visitVals, u.values.slice(3, 15));

        //Check interval foreach with termination
        visitKeys = [];
        visitVals = [];
        assert.equal(u.forEach((k, v) => {
            if (k === 12) {
                return 1000;
            }
            visitKeys.push(k);
            visitVals.push(v);
        }, 3, 15), 1000);
        assert.sameMembers(visitKeys, u.keys.slice(3, 12));
        assert.sameMembers(visitVals, u.values.slice(3, 12));
    });

    it("iterators", () => {
        const u = iota(20).reduce((u, k, v) => {
            return u.insert(k, v);
        }, new adone.collection.RedBlackTree());

        //Try walking forward
        let iter = u.begin;
        const c = iter.clone();
        assert.ok(iter.hasNext, "must have next at beginneing");
        assert.ok(!iter.hasPrev, "must not have predecessor");
        for (let i = 0; i < 20; ++i) {
            const v = u.at(i);
            compareIterators(iter, v);
            assert.equal(iter.index, i);
            iter.next();
        }
        assert.ok(!iter.valid, "must be eof iterator");

        //Check if the clone worked
        compareIterators(c, u.begin);

        //Try walking backward
        iter = u.end;
        assert.ok(!iter.hasNext, "must not have next");
        assert.ok(iter.hasPrev, "must have predecessor");
        for (let i = 19; i >= 0; --i) {
            const v = u.at(i);
            compareIterators(iter, v);
            assert.equal(iter.index, i);
            iter.prev();
        }
        assert.ok(!iter.valid, "must be eof iterator");
    });

    it("remove()", () => {
        const sz = [1, 2, 10, 20, 23, 31, 32, 33];
        for (let n = 0; n < sz.length; ++n) {
            const c = sz[n];
            const u = iota(c).reduce((u, k, v) => {
                return u.insert(k, v);
            }, new adone.collection.RedBlackTree());
            for (let i = 0; i < c; ++i) {
                checkTree(u.remove(i));
            }
        }
    });

    it("update()", () => {
        const arr = [0, 1, 2, 3, 4, 5, 6];
        const u = arr.reduce((u, k, v) => {
            return u.insert(k, v);
        }, new adone.collection.RedBlackTree());
        for (let iter = u.begin; iter.hasNext; iter.next()) {
            const updated = iter.update(1000);
            assert.equal(iter.value, iter.key, "ensure no mutation");
            assert.equal(updated.find(iter.key).value, 1000, "ensure update applied");
            checkTree(updated);
            checkTree(u);
        }
    });

    it("keys and values", () => {
        const originalKeys = ["potato", "sock", "foot", "apple", "newspaper", "gameboy"];
        const originalValues = [42, 10, false, "!!!", {}, null];

        let u = new adone.collection.RedBlackTree();
        for (let i = 0; i < originalKeys.length; ++i) {
            u = u.insert(originalKeys[i], originalValues[i]);
        }

        const zipped = iota(6).map((i) => {
            return [originalKeys[i], originalValues[i]];
        });

        zipped.sort((a, b) => {
            if (a[0] < b[0]) {
                return -1;
            }
            if (a[0] > b[0]) {
                return 1;
            }
            return 0;
        });

        const keys = zipped.map((v) => {
            return v[0];
        });
        const values = zipped.map((v) => {
            return v[1];
        });

        assert.sameMembers(u.keys, keys);
        assert.sameMembers(u.values, values);
    });

    it("searching", () => {
        const arr = [0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 6];
        const u = arr.reduce((u, k, v) => {
            return u.insert(k, v);
        }, new adone.collection.RedBlackTree());


        for (let i = 0; i < arr.length; ++i) {
            if (arr[i] !== arr[i - 1] && arr[i] !== arr[i + 1]) {
                assert.equal(u.get(arr[i]), i, `get ${arr[i]}`);
            }
        }
        assert.equal(u.get(-1), undefined, "get missing");

        assert.equal(u.ge(3).index, 6, "ge simple");
        assert.equal(u.ge(0.9).index, 1, "ge run start");
        assert.equal(u.ge(1).index, 1, "ge run mid");
        assert.equal(u.ge(1.1).index, 5, "ge run end");
        assert.equal(u.ge(0).index, 0, "ge first");
        assert.equal(u.ge(6).index, 9, "ge last");
        assert.equal(u.ge(100).valid, false, "ge big");
        assert.equal(u.ge(-1).index, 0, "ge small");

        assert.equal(u.gt(3).index, 7, "gt simple");
        assert.equal(u.gt(0.9).index, 1, "gt run start");
        assert.equal(u.gt(1).index, 5, "gt run mid");
        assert.equal(u.gt(1.1).index, 5, "gt run end");
        assert.equal(u.gt(0).index, 1, "gt first");
        assert.equal(u.gt(6).valid, false, "gt last");
        assert.equal(u.gt(100).valid, false, "gt big");
        assert.equal(u.gt(-1).index, 0, "ge small");

        assert.equal(u.le(3).index, 6, "le simple");
        assert.equal(u.le(0.9).index, 0, "le run start");
        assert.equal(u.le(1).index, 4, "le run mid");
        assert.equal(u.le(1.1).index, 4, "le run end");
        assert.equal(u.le(0).index, 0, "le first");
        assert.equal(u.le(6).index, 10, "le last");
        assert.equal(u.le(100).index, 10, "le big");
        assert.equal(u.le(-1).valid, false, "le small");

        assert.equal(u.lt(3).index, 5, "lt simple");
        assert.equal(u.lt(0.9).index, 0, "lt run start");
        assert.equal(u.lt(1).index, 0, "lt run mid");
        assert.equal(u.lt(1.1).index, 4, "lt run end");
        assert.equal(u.lt(0).valid, false, "lt first");
        assert.equal(u.lt(6).index, 8, "lt last");
        assert.equal(u.lt(100).index, 10, "lt big");
        assert.equal(u.lt(-1).valid, false, "lt small");

        assert.equal(u.find(-1).valid, false, "find missing small");
        assert.equal(u.find(10000).valid, false, "find missing big");
        assert.equal(u.find(3).index, 6, "find simple");
        assert.ok(u.find(1).index > 0, "find repeat");
        assert.ok(u.find(1).index < 5, "find repeat");

        for (let i = 0; i < arr.length; ++i) {
            assert.equal(u.find(arr[i]).key, arr[i], `find ${i}`);
        }

        for (let i = 0; i < arr.length; ++i) {
            assert.equal(u.at(i).key, arr[i], `at ${i}`);
        }
        assert.equal(u.at(-1).valid, false, "at missing small");
        assert.equal(u.at(1000).valid, false, "at missing big");
    });

    it("slab-sequence", () => {
        let tree = new adone.collection.RedBlackTree();

        tree = tree.insert(0, 0);
        checkTree(tree);
        assert.sameMembers(tree.values, [0]);

        tree = tree.insert(1, 1);
        checkTree(tree);
        assert.sameMembers(tree.values, [0, 1]);

        tree = tree.insert(0.5, 2);
        checkTree(tree);
        assert.sameMembers(tree.values, [0, 2, 1]);

        tree = tree.insert(0.25, 3);
        checkTree(tree);
        assert.sameMembers(tree.values, [0, 3, 2, 1]);

        tree = tree.remove(0);
        checkTree(tree);
        assert.sameMembers(tree.values, [3, 2, 1]);

        tree = tree.insert(0.375, 4);
        checkTree(tree);
        assert.sameMembers(tree.values, [3, 4, 2, 1]);

        tree = tree.remove(1);
        checkTree(tree);
        assert.sameMembers(tree.values, [3, 4, 2]);

        tree = tree.remove(0.5);
        checkTree(tree);
        assert.sameMembers(tree.values, [3, 4]);

        tree = tree.remove(0.375);
        checkTree(tree);
        assert.sameMembers(tree.values, [3]);

        tree = tree.remove(0.25);
        checkTree(tree);
        assert.sameMembers(tree.values, []);
    });

    it("slab-sequence-2", () => {
        let u = new adone.collection.RedBlackTree();

        u = u.insert(12, 22);
        u = u.insert(11, 3);
        u = u.insert(10, 28);
        u = u.insert(13, 16);
        u = u.insert(9, 9);
        u = u.insert(14, 10);
        u = u.insert(8, 15);
        u = u.insert(15, 29);
        u = u.insert(16, 4);
        u = u.insert(7, 21);
        u = u.insert(17, 23);
        u = u.insert(6, 2);
        u = u.insert(5, 27);
        u = u.insert(18, 17);
        u = u.insert(4, 8);
        u = u.insert(31, 11);
        u = u.insert(30, 30);
        u = u.insert(29, 5);
        u = u.insert(28, 24);
        u = u.insert(27, 18);
        u = u.insert(26, 12);
        u = u.insert(25, 31);
        u = u.insert(24, 6);
        u = u.insert(23, 25);
        u = u.insert(19, 7);
        u = u.insert(20, 13);
        u = u.insert(1, 20);
        u = u.insert(0, 14);
        u = u.insert(22, 0);
        u = u.insert(2, 1);
        u = u.insert(3, 26);
        u = u.insert(21, 19);
        u = u.remove(18, 17);
        u = u.remove(17, 23);
        u = u.remove(16, 4);
        u = u.remove(15, 29);
        u = u.remove(14, 10);
        u = u.remove(13, 16);
        u = u.remove(12, 22);
        u = u.remove(6, 2);
        u = u.remove(7, 21);
        u = u.remove(8, 15);
        u = u.remove(11, 3);
        u = u.remove(4, 8);
        u = u.remove(9, 9);
        u = u.remove(10, 28);
        u = u.remove(5, 27);
        u = u.remove(31, 11);
        u = u.remove(0, 14);
        u = u.remove(30, 30);
        u = u.remove(29, 5);
        u = u.remove(1, 20);
        u = u.remove(28, 24);
        u = u.remove(2, 1);
        u = u.remove(3, 26);
        u = u.remove(27, 18);
        u = u.remove(19, 7);
        u = u.remove(26, 12);
        u = u.remove(20, 13);
        u = u.remove(25, 31);
        u = u.remove(24, 6);
        u = u.remove(21, 19);
        u = u.remove(23, 25);
        u = u.remove(22, 0);
    });
});
