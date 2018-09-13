import shallowEqual from "../utils/shallowEqual";
import isType from "./isType";

/**
 * Returns whether `node` is of given `type`.
 *
 * For better performance, use this instead of `is[Type]` when `type` is unknown.
 */
export default function is(type, node, opts) {
    if (!node) {
        return false;
    }

    const matches = isType(node.type, type);
    if (!matches) {
        return false;
    }

    if (adone.is.undefined(opts)) {
        return true;
    }
    return shallowEqual(node, opts);
}
