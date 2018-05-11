const {
    is,
    std: { path }
} = adone;

const slice = [].slice;
const indexOf = [].indexOf || function (item) {
    for (let i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item) {
            return i;
        }
    }
    return -1;
};

const isFunction = function (val) {
    return val instanceof Function;
};
const isString = function (val) {
    return is.string(val) || Boolean(val) && typeof val === "object" && Object.prototype.toString.call(val) === "[object String]";
};
const upath = exports;
const toUnix = function (p) {
    p = p.replace(/\\/g, "/");
    const double = /\/\//;
    while (p.match(double)) {
        p = p.replace(double, "/");
    }
    return p;
};

const isValidExt = function (ext, ignoreExts, maxSize) {
    if (is.nil(ignoreExts)) {
        ignoreExts = [];
    }
    return ext && ext.length <= maxSize && indexOf.call(ignoreExts.map((e) => {
        return (e && e[0] !== "." ? "." : "") + e;
    }), ext) < 0;
};

for (const propName in path) {
    const propValue = path[propName];
    if (isFunction(propValue)) {
        upath[propName] = function (propName) {
            return function () {
                let args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
                args = args.map((p) => {
                    if (isString(p)) {
                        return toUnix(p);
                    }
                    return p;

                });
                const result = path[propName].apply(path, args);
                if (isString(result)) {
                    return toUnix(result);
                }
                return result;

            };
        }(propName);
    } else {
        upath[propName] = propValue;
    }
}
upath.sep = "/";
const extraFunctions = {
    toUnix,
    normalizeSafe(p) {
        p = toUnix(p);
        if (p.startsWith("./")) {
            if (p.startsWith("./..") || p === "./") {
                return upath.normalize(p);
            }
            return `./${upath.normalize(p)}`;

        }
        return upath.normalize(p);

    },
    normalizeTrim(p) {
        p = upath.normalizeSafe(p);
        if (p.endsWith("/")) {
            return p.slice(0, Number(p.length - 2) + 1 || 9000000000);
        }
        return p;

    },
    joinSafe() {
        const p = arguments.length >= 1 ? slice.call(arguments, 0) : [];
        let result = upath.join.apply(null, p);
        if (p[0].startsWith("./") && !result.startsWith("./")) {
            result = `./${result}`;
        }
        return result;
    },
    addExt(file, ext) {
        if (!ext) {
            return file;
        }
        if (ext[0] !== ".") {
            ext = `.${ext}`;
        }
        return file + (file.endsWith(ext) ? "" : ext);

    },
    trimExt(filename, ignoreExts, maxSize) {
        if (is.nil(maxSize)) {
            maxSize = 7;
        }
        const oldExt = upath.extname(filename);
        if (isValidExt(oldExt, ignoreExts, maxSize)) {
            return filename.slice(0, Number(filename.length - oldExt.length - 1) + 1 || 9000000000);
        }
        return filename;

    },
    removeExt(filename, ext) {
        if (!ext) {
            return filename;
        }
        ext = ext[0] === "." ? ext : `.${ext}`;
        if (upath.extname(filename) === ext) {
            return upath.trimExt(filename);
        }
        return filename;


    },
    changeExt(filename, ext, ignoreExts, maxSize) {
        if (is.nil(maxSize)) {
            maxSize = 7;
        }
        return upath.trimExt(filename, ignoreExts, maxSize) + (!ext ? "" : ext[0] === "." ? ext : `.${ext}`);
    },
    defaultExt(filename, ext, ignoreExts, maxSize) {
        if (is.nil(maxSize)) {
            maxSize = 7;
        }
        const oldExt = upath.extname(filename);
        if (isValidExt(oldExt, ignoreExts, maxSize)) {
            return filename;
        }
        return upath.addExt(filename, ext);

    }
};

for (const name in extraFunctions) {
    const extraFn = extraFunctions[name];
    if (upath[name] !== void 0) {
        throw new Error(`path.${name} already exists.`);
    } else {
        upath[name] = extraFn;
    }
}
