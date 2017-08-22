// build up a list of all the paths to the leafs in this revision tree
export default function rootToLeaf(revs) {
    const paths = [];
    const toVisit = revs.slice();
    let node;
    while ((node = toVisit.pop())) {
        const pos = node.pos;
        const tree = node.ids;
        const id = tree[0];
        const opts = tree[1];
        const branches = tree[2];
        const isLeaf = branches.length === 0;

        const history = node.history ? node.history.slice() : [];
        history.push({ id, opts });
        if (isLeaf) {
            paths.push({ pos: (pos + 1 - history.length), ids: history });
        }
        for (let i = 0, len = branches.length; i < len; i++) {
            toVisit.push({ pos: pos + 1, ids: branches[i], history });
        }
    }
    return paths.reverse();
}
