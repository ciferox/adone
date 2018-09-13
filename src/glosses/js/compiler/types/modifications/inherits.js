import { INHERIT_KEYS } from "../constants";
import inheritsComments from "../comments/inheritsComments";

const {
    is
} = adone;

/**
 * Inherit all contextual properties from `parent` node to `child` node.
 */
export default function inherits(child, parent) {
    if (!child || !parent) {
        return child;
    }

    // optionally inherit specific properties if not null
    for (const key of (INHERIT_KEYS.optional)) {
        if (is.nil(child[key])) {
            child[key] = parent[key];
        }
    }

    // force inherit "private" properties
    for (const key in parent) {
        if (key[0] === "_" && key !== "__clone") {
            child[key] = parent[key];
        }
    }

    // force inherit select properties
    for (const key of (INHERIT_KEYS.force)) {
        child[key] = parent[key];
    }

    inheritsComments(child, parent);

    return child;
}
