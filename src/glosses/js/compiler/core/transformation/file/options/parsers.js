import { booleanify, list } from "../../../util";

export default {
    boolean(val) {
        return Boolean(val);
    },
    booleanString(val) {
        return booleanify(val);
    },
    list(val) {
        return list(val);
    }
};
