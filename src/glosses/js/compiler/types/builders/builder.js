import { NODE_FIELDS, BUILDER_KEYS } from "../definitions";
import validate from "../validators/validate";

const {
    is,
    lodash: { clone: loClone }
} = adone;

export default function builder(type, ...args) {
    const keys = BUILDER_KEYS[type];
    const countArgs = args.length;
    if (countArgs > keys.length) {
        throw new Error(
            `${type}: Too many arguments passed. Received ${countArgs} but can receive no more than ${keys.length}`,
        );
    }

    const node = { type };

    let i = 0;
    keys.forEach((key) => {
        const field = NODE_FIELDS[type][key];

        let arg;
        if (i < countArgs) { arg = args[i]; }
        if (is.undefined(arg)) { arg = loClone(field.default); }

        node[key] = arg;
        i++;
    });

    for (const key in node) {
        validate(node, key, node[key]);
    }

    return node;
}
