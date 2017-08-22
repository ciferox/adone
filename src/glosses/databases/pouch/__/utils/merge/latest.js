// returns the current leaf node for a given revision
export default function latest(rev, metadata) {
    const toVisit = metadata.rev_tree.slice();
    let node;
    while ((node = toVisit.pop())) {
        const pos = node.pos;
        const tree = node.ids;
        const id = tree[0];
        const opts = tree[1];
        const branches = tree[2];
        const isLeaf = branches.length === 0;

        const history = node.history ? node.history.slice() : [];
        history.push({ id, pos, opts });

        if (isLeaf) {
            for (let i = 0, len = history.length; i < len; i++) {
                const historyNode = history[i];
                const historyRev = `${historyNode.pos}-${historyNode.id}`;

                if (historyRev === rev) {
                    // return the rev of this leaf
                    return `${pos}-${id}`;
                }
            }
        }

        for (let j = 0, l = branches.length; j < l; j++) {
            toVisit.push({ pos: pos + 1, ids: branches[j], history });
        }
    }

    /* istanbul ignore next */
    throw new Error(`Unable to resolve latest revision for id ${metadata.id}, rev ${rev}`);
}
