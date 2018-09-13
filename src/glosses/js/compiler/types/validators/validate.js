import { NODE_FIELDS } from "../definitions";

const {
    is
} = adone;

export default function validate(node, key, val) {
    if (!node) {
        return;
    }

    const fields = NODE_FIELDS[node.type];
    if (!fields) {
        return;
    }

    const field = fields[key];
    if (!field || !field.validate) {
        return;
    }
    if (field.optional && is.nil(val)) {
        return;
    }

    field.validate(node, key, val);
}
