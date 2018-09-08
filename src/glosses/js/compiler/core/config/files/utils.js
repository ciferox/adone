import { makeStrongCache } from "../caching";

const {
    is,
    std: { fs }
} = adone;

const fileMtime = function (filepath) {
    try {
        return Number(fs.statSync(filepath).mtime);
    } catch (e) {
        if (e.code !== "ENOENT" && e.code !== "ENOTDIR") {
            throw e;
        }
    }

    return null;
};

export const makeStaticFileCache = function (fn) {
    return makeStrongCache((filepath, cache) => {
        if (is.null(cache.invalidate(() => fileMtime(filepath)))) {
            cache.forever();
            return null;
        }

        return fn(filepath, fs.readFileSync(filepath, "utf8"));
    });
};
