// @flow
import type { FileResult } from "./transformation";

const {
    is
} = adone;

export default function transformFile(
    filename: string,
    opts?: Object = {},
    callback: (?Error, FileResult | null) => void,
) {
    if (is.function(opts)) {
        callback = opts;
    }

    callback(new Error("Transforming files is not supported in browsers"), null);
}
