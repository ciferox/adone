// Pretty much all below can be combined into a higher order function to
// traverse revisions
// The return value from the callback will be passed as context to all
// children of that node
export default function traverseRevTree(revs, callback) {
    const toVisit = revs.slice();

    let node;
    while ((node = toVisit.pop())) {
        const pos = node.pos;
        const tree = node.ids;
        const branches = tree[2];
        const newCtx = callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
        for (let i = 0, len = branches.length; i < len; i++) {
            toVisit.push({ pos: pos + 1, ids: branches[i], ctx: newCtx });
        }
    }
}
