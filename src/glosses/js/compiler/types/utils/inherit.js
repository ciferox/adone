// @flow
const {
    lodash: { uniq }
} = adone;

export default function inherit(
    key: string,
    child: Object,
    parent: Object,
): void {
    if (child && parent) {
        child[key] = uniq([].concat(child[key], parent[key]).filter(Boolean));
    }
}
