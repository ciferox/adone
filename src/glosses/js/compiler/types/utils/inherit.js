const {
    lodash: { uniq }
} = adone;

export default function inherit(key, child, parent) {
    if (child && parent) {
        child[key] = uniq([].concat(child[key], parent[key]).filter(Boolean));
    }
}
