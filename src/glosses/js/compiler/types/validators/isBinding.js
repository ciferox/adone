import getBindingIdentifiers from "../retrievers/getBindingIdentifiers";

const {
    is
} = adone;

/**
 * Check if the input `node` is a binding identifier.
 */
export default function isBinding(node, parent) {
    const keys = getBindingIdentifiers.keys[parent.type];
    if (keys) {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const val = parent[key];
            if (is.array(val)) {
                if (val.includes(node)) {
                    return true;
                }
            } else {
                if (val === node) {
                    return true;
                }
            }
        }
    }

    return false;
}
