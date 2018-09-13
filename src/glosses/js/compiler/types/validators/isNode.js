// @flow
import { VISITOR_KEYS } from "../definitions";

export default function isNode(node?: Object): boolean {
    return Boolean(node && VISITOR_KEYS[node.type]);
}
