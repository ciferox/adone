// for a better overview of what this is doing, read:
// https://github.com/apache/couchdb-couch/blob/master/src/couch_key_tree.erl
//
// But for a quick intro, CouchDB uses a revision tree to store a documents
// history, A -> B -> C, when a document has conflicts, that is a branch in the
// tree, A -> (B1 | B2 -> C), We store these as a nested array in the format
//
// KeyTree = [Path ... ]
// Path = {pos: position_from_root, ids: Tree}
// Tree = [Key, Opts, [Tree, ...]], in particular single node: [Key, []]

const { database: { pouch: { __: { util: { merge: _merge } } } } } = adone;

const sortByPos = (a, b) => {
    return a.pos - b.pos;
};

// classic binary search
const binarySearch = (arr, item, comparator) => {
    let low = 0;
    let high = arr.length;
    let mid;
    while (low < high) {
        mid = (low + high) >>> 1;
        if (comparator(arr[mid], item) < 0) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
};

// assuming the arr is sorted, insert the item in the proper place
const insertSorted = (arr, item, comparator) => {
    const idx = binarySearch(arr, item, comparator);
    arr.splice(idx, 0, item);
};

// Turn a path as a flat array into a tree with a single branch.
// If any should be stemmed from the beginning of the array, that's passed
// in as the second argument
const pathToTree = (path, numStemmed) => {
    let root;
    let leaf;
    for (let i = numStemmed, len = path.length; i < len; i++) {
        const node = path[i];
        const currentLeaf = [node.id, node.opts, []];
        if (leaf) {
            leaf[2].push(currentLeaf);
            leaf = currentLeaf;
        } else {
            root = leaf = currentLeaf;
        }
    }
    return root;
};

// compare the IDs of two trees
const compareTree = (a, b) => {
    return a[0] < b[0] ? -1 : 1;
};

// Merge two trees together
// The roots of tree1 and tree2 must be the same revision
const mergeTree = (in_tree1, in_tree2) => {
    const queue = [{ tree1: in_tree1, tree2: in_tree2 }];
    let conflicts = false;
    while (queue.length > 0) {
        const item = queue.pop();
        const tree1 = item.tree1;
        const tree2 = item.tree2;

        if (tree1[1].status || tree2[1].status) {
            tree1[1].status =
                (tree1[1].status === "available" ||
                    tree2[1].status === "available") ? "available" : "missing";
        }

        for (let i = 0; i < tree2[2].length; i++) {
            if (!tree1[2][0]) {
                conflicts = "new_leaf";
                tree1[2][0] = tree2[2][i];
                continue;
            }

            let merged = false;
            for (let j = 0; j < tree1[2].length; j++) {
                if (tree1[2][j][0] === tree2[2][i][0]) {
                    queue.push({ tree1: tree1[2][j], tree2: tree2[2][i] });
                    merged = true;
                }
            }
            if (!merged) {
                conflicts = "new_branch";
                insertSorted(tree1[2], tree2[2][i], compareTree);
            }
        }
    }
    return { conflicts, tree: in_tree1 };
};

const doMerge = (tree, path, dontExpand) => {
    const restree = [];
    let conflicts = false;
    let merged = false;
    let res;

    if (!tree.length) {
        return { tree: [path], conflicts: "new_leaf" };
    }

    for (let i = 0, len = tree.length; i < len; i++) {
        const branch = tree[i];
        if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
            // Paths start at the same position and have the same root, so they need
            // merged
            res = mergeTree(branch.ids, path.ids);
            restree.push({ pos: branch.pos, ids: res.tree });
            conflicts = conflicts || res.conflicts;
            merged = true;
        } else if (dontExpand !== true) {
            // The paths start at a different position, take the earliest path and
            // traverse up until it as at the same point from root as the path we
            // want to merge.  If the keys match we return the longer path with the
            // other merged After stemming we dont want to expand the trees

            const t1 = branch.pos < path.pos ? branch : path;
            const t2 = branch.pos < path.pos ? path : branch;
            const diff = t2.pos - t1.pos;

            const candidateParents = [];

            const trees = [];
            trees.push({ ids: t1.ids, diff, parent: null, parentIdx: null });
            while (trees.length > 0) {
                const item = trees.pop();
                if (item.diff === 0) {
                    if (item.ids[0] === t2.ids[0]) {
                        candidateParents.push(item);
                    }
                    continue;
                }
                const elements = item.ids[2];
                for (let j = 0, elementsLen = elements.length; j < elementsLen; j++) {
                    trees.push({
                        ids: elements[j],
                        diff: item.diff - 1,
                        parent: item.ids,
                        parentIdx: j
                    });
                }
            }

            const el = candidateParents[0];

            if (!el) {
                restree.push(branch);
            } else {
                res = mergeTree(el.ids, t2.ids);
                el.parent[2][el.parentIdx] = res.tree;
                restree.push({ pos: t1.pos, ids: t1.ids });
                conflicts = conflicts || res.conflicts;
                merged = true;
            }
        } else {
            restree.push(branch);
        }
    }

    // We didnt find
    if (!merged) {
        restree.push(path);
    }

    restree.sort(sortByPos);

    return {
        tree: restree,
        conflicts: conflicts || "internal_node"
    };
};

// To ensure we dont grow the revision tree infinitely, we stem old revisions
const stem = (tree, depth) => {
    // First we break out the tree into a complete list of root to leaf paths
    const paths = _merge.rootToLeaf(tree);
    let stemmedRevs;

    let result;
    for (let i = 0, len = paths.length; i < len; i++) {
        // Then for each path, we cut off the start of the path based on the
        // `depth` to stem to, and generate a new set of flat trees
        const path = paths[i];
        const stemmed = path.ids;
        let node;
        if (stemmed.length > depth) {
            // only do the stemming work if we actually need to stem
            if (!stemmedRevs) {
                stemmedRevs = {}; // avoid allocating this object unnecessarily
            }
            const numStemmed = stemmed.length - depth;
            node = {
                pos: path.pos + numStemmed,
                ids: pathToTree(stemmed, numStemmed)
            };

            for (let s = 0; s < numStemmed; s++) {
                const rev = `${path.pos + s}-${stemmed[s].id}`;
                stemmedRevs[rev] = true;
            }
        } else { // no need to actually stem
            node = {
                pos: path.pos,
                ids: pathToTree(stemmed, 0)
            };
        }

        // Then we remerge all those flat trees together, ensuring that we dont
        // connect trees that would go beyond the depth limit
        if (result) {
            result = doMerge(result, node, true).tree;
        } else {
            result = [node];
        }
    }

    // this is memory-heavy per Chrome profiler, avoid unless we actually stemmed
    if (stemmedRevs) {
        _merge.traverseRevTree(result, (isLeaf, pos, revHash) => {
            // some revisions may have been removed in a branch but not in another
            delete stemmedRevs[`${pos}-${revHash}`];
        });
    }

    return {
        tree: result,
        revs: stemmedRevs ? Object.keys(stemmedRevs) : []
    };
};

export default function merge(tree, path, depth) {
    const newTree = doMerge(tree, path);
    const stemmed = stem(newTree.tree, depth);
    return {
        tree: stemmed.tree,
        stemmedRevs: stemmed.revs,
        conflicts: newTree.conflicts
    };
}
