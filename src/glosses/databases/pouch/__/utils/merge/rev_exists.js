// return true if a rev exists in the rev tree, false otherwise
export default function revExists(revs, rev) {
    const toVisit = revs.slice();
    const splitRev = rev.split("-");
    const targetPos = parseInt(splitRev[0], 10);
    const targetId = splitRev[1];

    let node;
    while ((node = toVisit.pop())) {
        if (node.pos === targetPos && node.ids[0] === targetId) {
            return true;
        }
        const branches = node.ids[2];
        for (let i = 0, len = branches.length; i < len; i++) {
            toVisit.push({ pos: node.pos + 1, ids: branches[i] });
        }
    }
    return false;
}
