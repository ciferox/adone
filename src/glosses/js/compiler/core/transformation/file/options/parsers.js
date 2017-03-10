// @flow

import { booleanify, list } from "../../../util";

export default {
    boolean(val: any): boolean {
        return Boolean(val);
    },
    booleanString(val: any): boolean | any {
        return booleanify(val);
    },
    list(val: any): string[] {
        return list(val);
    }
};
