const { database: { pouch: { __: { util: { merge } } } } } = adone;

// compact a tree by marking its non-leafs as missing,
// and return a list of revs to delete
export default function compactTree(metadata) {
    const revs = [];
    merge.traverseRevTree(metadata.rev_tree, (isLeaf, pos,
        revHash, ctx, opts) => {
        if (opts.status === "available" && !isLeaf) {
            revs.push(`${pos}-${revHash}`);
            opts.status = "missing";
        }
    });
    return revs;
}
