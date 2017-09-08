const {
    database: { pouch }
} = adone;

const {
    util: { merge }
} = adone.private(pouch);

const sortByPos = (a, b) => {
    return a.pos - b.pos;
};

export default function collectLeaves(revs) {
    const leaves = [];
    merge.traverseRevTree(revs, (isLeaf, pos, id, acc, opts) => {
        if (isLeaf) {
            leaves.push({ rev: `${pos}-${id}`, pos, opts });
        }
    });
    leaves.sort(sortByPos).reverse();
    for (let i = 0, len = leaves.length; i < len; i++) {
        delete leaves[i].pos;
    }
    return leaves;
}
