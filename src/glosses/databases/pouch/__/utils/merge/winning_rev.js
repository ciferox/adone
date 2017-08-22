// We fetch all leafs of the revision tree, and sort them based on tree length
// and whether they were deleted, undeleted documents with the longest revision
// tree (most edits) win
// The final sort algorithm is slightly documented in a sidebar here:
// http://guide.couchdb.org/draft/conflicts.html
export default function winningRev(metadata) {
    let winningId;
    let winningPos;
    let winningDeleted;
    const toVisit = metadata.rev_tree.slice();
    let node;
    while ((node = toVisit.pop())) {
        const tree = node.ids;
        const branches = tree[2];
        const pos = node.pos;
        if (branches.length) { // non-leaf
            for (let i = 0, len = branches.length; i < len; i++) {
                toVisit.push({ pos: pos + 1, ids: branches[i] });
            }
            continue;
        }
        const deleted = Boolean(tree[1].deleted);
        const id = tree[0];
        // sort by deleted, then pos, then id
        if (!winningId || (winningDeleted !== deleted ? winningDeleted :
            winningPos !== pos ? winningPos < pos : winningId < id)) {
            winningId = id;
            winningPos = pos;
            winningDeleted = deleted;
        }
    }

    return `${winningPos}-${winningId}`;
}
