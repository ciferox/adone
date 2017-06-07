// Porting tests from Apache CouchDB
// https://github.com/davisp/couchdb/blob/local_doc_revs/test/
// etap/060-kt-merging.t

const PouchDB = adone.database.pouch.coverage.DB;
const merge = PouchDB.utils.merge;
const winningRev = PouchDB.utils.winningRev;

describe("test.merge.js", () => {

    let simple;
    let two0;
    let two1;
    let newleaf;
    let withnewleaf;
    let newbranch;
    let newdeepbranch;
    let stemmededit;
    let stemmedconflicts;
    let newbranchleaf;
    let newbranchleafbranch;
    let stemmed2;
    let stemmed3;
    let partialrecover;

    /*
     * Our merge() function actually mutates the input object, because it's
     * more performant than deep cloning the object every time it's passed
     * into merge(). So in order for these tests to pass, we need to redefine
     * these objects every time.
     */
    beforeEach(() => {
        simple = { pos: 1, ids: ["1", {}, []] };
        two0 = { pos: 1, ids: ["1", {}, [["2_0", {}, []]]] };
        two1 = { pos: 1, ids: ["1", {}, [["2_1", {}, []]]] };
        newleaf = { pos: 2, ids: ["2_0", {}, [["3", {}, []]]] };
        withnewleaf = { pos: 1, ids: ["1", {}, [["2_0", {}, [["3", {}, []]]]]] };
        newbranch = { pos: 1, ids: ["1", {}, [["2_0", {}, []], ["2_1", {}, []]]] };
        newdeepbranch = { pos: 2, ids: ["2_0", {}, [["3_1", {}, []]]] };

        stemmededit = { pos: 3, ids: ["3", {}, []] };
        stemmedconflicts = [simple, stemmededit];

        newbranchleaf = {
            pos: 1,
            ids: ["1", {}, [["2_0", {}, [["3", {}, []]]], ["2_1", {}, []]]]
        };

        newbranchleafbranch = {
            pos: 1,
            ids: ["1", {}, [
                ["2_0", {}, [["3", {}, []], ["3_1", {}, []]]], ["2_1", {}, []]
            ]]
        };

        stemmed2 = [
            { pos: 1, ids: ["1", {}, [["2_1", {}, []]]] },
            { pos: 2, ids: ["2_0", {}, [["3", {}, []], ["3_1", {}, []]]] }
        ];

        stemmed3 = [
            { pos: 2, ids: ["2_1", {}, []] },
            { pos: 3, ids: ["3", {}, []] },
            { pos: 3, ids: ["3_1", {}, []] }
        ];

        partialrecover = [
            { pos: 1, ids: ["1", {}, [["2_0", {}, [["3", {}, []]]]]] },
            { pos: 2, ids: ["2_1", {}, []] },
            { pos: 3, ids: ["3_1", {}, []] }
        ];
    });

    it("Merging a path into an empty tree is the path", () => {
        assert.deepEqual(merge([], simple, 10), {
            tree: [simple],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    it("Remerge path into path is reflexive", () => {
        assert.deepEqual(merge([simple], simple, 10), {
            tree: [simple],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("Merging a path with multiple entries is the path", () => {
        assert.deepEqual(merge([], two0, 10), {
            tree: [two0],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    it("Merging a path with multiple entries is reflexive", () => {
        assert.deepEqual(merge([two0], two0, 10), {
            tree: [two0],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("Merging a subpath into a path results in the path", () => {
        assert.deepEqual(merge([two0], simple, 10), {
            tree: [two0],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("Merging a new leaf gives us a new leaf", () => {
        assert.deepEqual(merge([two0], newleaf, 10), {
            tree: [withnewleaf],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    it("Merging a new branch returns a proper tree", () => {
        assert.deepEqual(merge([two0], two1, 10), {
            tree: [newbranch],
            stemmedRevs: [],
            conflicts: "new_branch"
        });
    });

    it("Order of merging does not affect the resulting tree", () => {
        assert.deepEqual(merge([two1], two0, 10), {
            tree: [newbranch],
            stemmedRevs: [],
            conflicts: "new_branch"
        });
    });

    it("Merging a new_leaf doesnt return new_branch when branches exist",
        () => {
            assert.deepEqual(merge([newbranch], newleaf, 10), {
                tree: [newbranchleaf],
                stemmedRevs: [],
                conflicts: "new_leaf"
            });
        });

    it("Merging a deep branch with branches works", () => {
        assert.deepEqual(merge([newbranchleaf], newdeepbranch, 10), {
            tree: [newbranchleafbranch],
            stemmedRevs: [],
            conflicts: "new_branch"
        });
    });

    it("New information reconnects steming induced conflicts", () => {
        assert.deepEqual(merge(stemmedconflicts, withnewleaf, 10), {
            tree: [withnewleaf],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    it("Simple stemming works", () => {
        assert.deepEqual(merge([two0], newleaf, 2), {
            tree: [newleaf],
            stemmedRevs: ["1-1"],
            conflicts: "new_leaf"
        });
    });

    it("Merge with stemming works correctly for branches", () => {
        assert.deepEqual(merge([newbranchleafbranch], simple, 2), {
            tree: stemmed2,
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("Merge with stemming to leaves works fine", () => {
        assert.deepEqual(merge([newbranchleafbranch], simple, 1), {
            tree: stemmed3,
            stemmedRevs: ["1-1", "2-2_0"],
            conflicts: "internal_node"
        });
    });

    it("Merging unstemmed recovers as much as possible without losing info",
        () => {
            assert.deepEqual(merge(stemmed3, withnewleaf, 10), {
                tree: partialrecover,
                stemmedRevs: [],
                conflicts: "internal_node"
            });
        });

    it("winningRev returns the longest leaf", () => {
        const tree = [
            {
                pos: 1, ids: [
                    "bfe70372c90ded1087239e5191984f76", {}, [
                        ["44d71a718b90e4696c06a90e08912c8f", {}, []],
                        ["56e657612d55ab1a402dcb281c874f2a", {}, [
                            ["93c3db16462f656f7172ccabd3cf6cd6", {}, []]
                        ]]
                    ]
                ]
            }
        ];
        assert.equal(winningRev({ rev_tree: tree }), "3-93c3db16462f656f7172ccabd3cf6cd6");
    });

    it("winningRev returns the longest leaf again", () => {
        // this one is from issue #293
        const tree = [
            {
                pos: 1, ids: [
                    "203db1a1810a838895d561f67b224b5d", {}, [
                        ["bf5e08a4f9fa6d33a53f4a00ae3ea399", {}, [
                            ["28cd77a3ca30f79e1cfffcd6a41ca308", {}, []]
                        ]]
                    ]
                ]
            },
            {
                pos: 1, ids: [
                    "c6d5cce35bcfbef90b20f140d723cbdb", {}, [
                        ["1b8dfbb1267e213328920bae43f2f597", {}, []],
                        ["59ed830b84b276ab776c3c51aaf93a16", {}, [
                            ["64a9842c6aea50bf24660378e496e853", {}, []]
                        ]]
                    ]
                ]
            }
        ];
        assert.equal(winningRev({ rev_tree: tree }), "3-64a9842c6aea50bf24660378e496e853");
    });

    // ///// These are tests from CouchDB's kt-merging.erl test suite

    const one = { pos: 1, ids: ["1", {}, []] };
    it("The empty tree is the identity for merge.", () => {
        assert.deepEqual(merge([], one, 10), {
            tree: [one],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    it("Merging is reflexive", () => {
        assert.deepEqual(merge([one], one, 10), {
            tree: [one],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const two = { pos: 1, ids: ["2", {}, []] };
    const twoSibs = [one, two];
    it("Merging a prefix of a tree with the tree yields the tree.", () => {
        assert.deepEqual(merge(twoSibs, one, 10), {
            tree: twoSibs,
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const three = { pos: 1, ids: ["3", {}, []] };
    const threeSibs = [one, two, three];
    it("Merging a third unrelated branch leads to a conflict.", () => {
        assert.deepEqual(merge(twoSibs, three, 10), {
            tree: threeSibs,
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const twoChild = {
        pos: 1, ids: ["1", {}, [
            ["1a", {}, [
                ["1aa", {}, []]
            ]]
        ]]
    };
    it("Merging two children is still reflexive.", () => {
        assert.deepEqual(merge([twoChild], twoChild, 10), {
            tree: [twoChild],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const twoChildSibs = {
        pos: 1, ids: ["1", {}, [
            ["1a", {}, []],
            ["1b", {}, []]
        ]]
    };
    it("Merging a tree to itself is itself.", () => {
        assert.deepEqual(merge([twoChildSibs], twoChildSibs, 10), {
            tree: [twoChildSibs],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const twoChildPlusSibs = {
        pos: 1, ids: ["1", {}, [
            ["1a", {}, [
                ["1aa", {}, []]
            ]],
            ["1b", {}, []]
        ]]
    };
    it("Merging tree of uneven length at node 2.", () => {
        assert.deepEqual(merge([twoChild], twoChildSibs, 10), {
            tree: [twoChildPlusSibs],
            stemmedRevs: [],
            conflicts: "new_branch"
        });
    });

    const stemmed1b = { pos: 2, ids: ["1a", {}, []] };
    it("Merging a tree with a stem.", () => {
        assert.deepEqual(merge([twoChildSibs], stemmed1b, 10), {
            tree: [twoChildSibs],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const twoChildPlusSibs2 = {
        pos: 1, ids: ["1", {}, [
            ["1a", {}, []],
            ["1b", {}, [
                ["1bb", {}, []]
            ]]
        ]]
    };
    const stemmed1bb = { pos: 3, ids: ["1bb", {}, []] };
    it("Merging a stem at a deeper level.", () => {
        assert.deepEqual(merge([twoChildPlusSibs2], stemmed1bb, 10), {
            tree: [twoChildPlusSibs2],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const stemmedTwoChildSibs2 = [
        { pos: 2, ids: ["1a", {}, []] },
        { pos: 2, ids: ["1b", {}, [["1bb", {}, []]]] }
    ];
    it("Merging a stem at a deeper level against paths at deeper levels.",
        () => {
            assert.deepEqual(merge(stemmedTwoChildSibs2, stemmed1bb, 10), {
                tree: stemmedTwoChildSibs2,
                stemmedRevs: [],
                conflicts: "internal_node"
            });
        });

    const stemmed1aa = { pos: 3, ids: ["1aa", {}, []] };
    it("Merging a single tree with a deeper stem.", () => {
        assert.deepEqual(merge([twoChild], stemmed1aa, 10), {
            tree: [twoChild],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const stemmed1a = { pos: 2, ids: ["1a", {}, [["1aa", {}, []]]] };
    it("Merging a larger stem.", () => {
        assert.deepEqual(merge([twoChild], stemmed1a, 10), {
            tree: [twoChild],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("More merging.", () => {
        assert.deepEqual(merge([stemmed1a], stemmed1aa, 10), {
            tree: [stemmed1a],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    const oneChild = { pos: 1, ids: ["1", {}, [["1a", {}, []]]] };
    it("Merging should create conflicts.", () => {
        assert.deepEqual(merge([oneChild], stemmed1aa, 10), {
            tree: [oneChild, stemmed1aa],
            stemmedRevs: [],
            conflicts: "internal_node"
        });
    });

    it("Merging should have no conflicts.", () => {
        assert.deepEqual(merge([oneChild, stemmed1aa], twoChild, 10), {
            tree: [twoChild],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

    const foo = {
        pos: 1, ids: ["foo", {}, [
            ["foo2", {}, []],
            ["foo3", {}, []]
        ]]
    };
    const bar = {
        pos: 1, ids: ["foo", {}, [
            ["foo3", {}, [
                ["foo4", {}, []]
            ]]
        ]]
    };
    const fooBar = {
        pos: 1, ids: ["foo", {}, [
            ["foo2", {}, []],
            ["foo3", {}, [
                ["foo4", {}, []]
            ]]
        ]]
    };

    it("Merging trees with conflicts ought to behave.", () => {
        assert.deepEqual(merge([foo], bar, 10), {
            tree: [fooBar],
            stemmedRevs: [],
            conflicts: "new_leaf"
        });
    });

});
