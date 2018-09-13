import { COMMENT_KEYS } from "../constants";

const {
    is
} = adone;

const CLEAR_KEYS = ["tokens", "start", "end", "loc", "raw", "rawValue"];

const CLEAR_KEYS_PLUS_COMMENTS = COMMENT_KEYS.concat(["comments"]).concat(
    CLEAR_KEYS,
);

/**
 * Remove all of the _* properties from a node along with the additional metadata
 * properties like location data and raw token data.
 */
export default function removeProperties(
    node,
    opts = {},
) {
    const map = opts.preserveComments ? CLEAR_KEYS : CLEAR_KEYS_PLUS_COMMENTS;
    for (const key of map) {
        if (!is.nil(node[key])) {
            node[key] = undefined;
        }
    }

    for (const key in node) {
        if (key[0] === "_" && !is.nil(node[key])) {
            node[key] = undefined;
        }
    }

    const symbols = Object.getOwnPropertySymbols(node);
    for (const sym of symbols) {
        node[sym] = null;
    }
}
