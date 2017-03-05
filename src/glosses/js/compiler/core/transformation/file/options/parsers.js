// @flow

import * as util from "../../../util";

export function boolean(val: any): boolean {
    return !!val;
}

export function booleanString(val: any): boolean | any {
    return util.booleanify(val);
}

export function list(val: any): string[] {
    return util.list(val);
}
