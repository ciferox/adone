// @flow

import type Plugin from "./plugin";
import manageOptions from "./option_manager";

const {
    is
} = adone;

export type ResolvedConfig = {
    options: Object,
    passes: Array<Array<[Plugin, ?{}]>>,
};

/**
 * Standard API for loading Babel configuration data. Not for public consumption.
 */
export default function loadConfig(opts: mixed): ResolvedConfig | null {
    if (!is.nil(opts) && typeof opts !== "object") {
        throw new Error("Babel options must be an object, null, or undefined");
    }

    return manageOptions(opts || {});
}
