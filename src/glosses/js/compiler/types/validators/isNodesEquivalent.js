import { NODE_FIELDS, VISITOR_KEYS } from "../definitions";

const {
    is
} = adone;

/**
 * Check if two nodes are equivalent
 */
export default function isNodesEquivalent(a, b) {
    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        is.nil(a) ||
        is.nil(b)
    ) {
        return a === b;
    }

    if (a.type !== b.type) {
        return false;
    }

    const fields = Object.keys(NODE_FIELDS[a.type] || a.type);
    const visitorKeys = VISITOR_KEYS[a.type];

    for (const field of fields) {
        if (typeof a[field] !== typeof b[field]) {
            return false;
        }

        if (is.array(a[field])) {
            if (!is.array(b[field])) {
                return false;
            }
            if (a[field].length !== b[field].length) {
                return false;
            }

            for (let i = 0; i < a[field].length; i++) {
                if (!isNodesEquivalent(a[field][i], b[field][i])) {
                    return false;
                }
            }
            continue;
        }

        if (
            typeof a[field] === "object" &&
            (!visitorKeys || !visitorKeys.includes(field))
        ) {
            for (const key in a[field]) {
                if (a[field][key] !== b[field][key]) {
                    return false;
                }
            }
            continue;
        }

        if (!isNodesEquivalent(a[field], b[field])) {
            return false;
        }
    }

    return true;
}
