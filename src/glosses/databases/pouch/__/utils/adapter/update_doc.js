const {
    database: {
        pouch: {
            __: {
                util: {
                    merge: {
                        isDeleted,
                        merge,
                        winningRev: calculateWinningRev,
                        revExists
                    },
                    adapter: {
                        parseDoc
                    }
                }
            },
            x: {
                createError, REV_CONFLICT
            }
        }
    }
} = adone;

export default function updateDoc(revLimit, prev, docInfo, results,
    i, cb, writeDoc, newEdits) {

    if (revExists(prev.rev_tree, docInfo.metadata.rev)) {
        results[i] = docInfo;
        return cb();
    }

    // sometimes this is pre-calculated. historically not always
    const previousWinningRev = prev.winningRev || calculateWinningRev(prev);
    const previouslyDeleted = "deleted" in prev ? prev.deleted :
        isDeleted(prev, previousWinningRev);
    const deleted = "deleted" in docInfo.metadata ? docInfo.metadata.deleted :
        isDeleted(docInfo.metadata);
    const isRoot = /^1-/.test(docInfo.metadata.rev);

    if (previouslyDeleted && !deleted && newEdits && isRoot) {
        const newDoc = docInfo.data;
        newDoc._rev = previousWinningRev;
        newDoc._id = docInfo.metadata.id;
        docInfo = parseDoc(newDoc, newEdits);
    }

    const merged = merge(prev.rev_tree, docInfo.metadata.rev_tree[0], revLimit);

    const inConflict = newEdits && ((
        (previouslyDeleted && deleted && merged.conflicts !== "new_leaf") ||
        (!previouslyDeleted && merged.conflicts !== "new_leaf") ||
        (previouslyDeleted && !deleted && merged.conflicts === "new_branch")));

    if (inConflict) {
        const err = createError(REV_CONFLICT);
        results[i] = err;
        return cb();
    }

    const newRev = docInfo.metadata.rev;
    docInfo.metadata.rev_tree = merged.tree;
    docInfo.stemmedRevs = merged.stemmedRevs || [];
    /* istanbul ignore else */
    if (prev.rev_map) {
        docInfo.metadata.rev_map = prev.rev_map; // used only by leveldb
    }

    // recalculate
    const winningRev = calculateWinningRev(docInfo.metadata);
    const winningRevIsDeleted = isDeleted(docInfo.metadata, winningRev);

    // calculate the total number of documents that were added/removed,
    // from the perspective of total_rows/doc_count
    const delta = (previouslyDeleted === winningRevIsDeleted) ? 0 :
        previouslyDeleted < winningRevIsDeleted ? -1 : 1;

    let newRevIsDeleted;
    if (newRev === winningRev) {
        // if the new rev is the same as the winning rev, we can reuse that value
        newRevIsDeleted = winningRevIsDeleted;
    } else {
        // if they're not the same, then we need to recalculate
        newRevIsDeleted = isDeleted(docInfo.metadata, newRev);
    }

    writeDoc(docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted,
        true, delta, i, cb);
}
