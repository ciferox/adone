// @flow

const {
    is
} = adone;

import fs from "fs";
import { makeStrongCache } from "../caching";

export function makeStaticFileCache<T>(
    fn: (string, string) => T,
): string => T | null {
    return makeStrongCache((filepath, cache) => {
        if (is.null(cache.invalidate(() => fileMtime(filepath)))) {
            cache.forever();
            return null;
        }

        return fn(filepath, fs.readFileSync(filepath, "utf8"));
    });
}

function fileMtime(filepath: string): number | null {
    try {
        return Number(fs.statSync(filepath).mtime);
    } catch (e) {
        if (e.code !== "ENOENT" && e.code !== "ENOTDIR") {
            throw e;
        }
    }

    return null;
}
