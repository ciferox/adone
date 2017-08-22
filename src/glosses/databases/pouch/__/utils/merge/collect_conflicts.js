const { database: { pouch: { __: { util: { merge } } } } } = adone;

// returns revs of all conflicts that is leaves such that
// 1. are not deleted and
// 2. are different than winning revision
export default function collectConflicts(metadata) {
    const win = merge.winningRev(metadata);
    const leaves = merge.collectLeaves(metadata.rev_tree);
    const conflicts = [];
    for (let i = 0, len = leaves.length; i < len; i++) {
        const leaf = leaves[i];
        if (leaf.rev !== win && !leaf.opts.deleted) {
            conflicts.push(leaf.rev);
        }
    }
    return conflicts;
}
