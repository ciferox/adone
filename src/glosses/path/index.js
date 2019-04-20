const {
    is,
    std: { path }
} = adone;

const upath = exports;

const toUnix = function (p) {
    p = p.replace(/\\/g, "/");
    const double = /\/\//;
    while (p.match(double)) {
        p = p.replace(double, "/");
    } // node on windows doesn't replace doubles
    return p;
};


const isValidExt = function (ext, ignoreExts, maxSize) {
    let needle;
    if (is.nil(ignoreExts)) {
        ignoreExts = [];
    }
    return ((ext) && (ext.length <= maxSize)) &&
        ((needle = ext, !Array.from(ignoreExts.map((e) => (e && (e[0] !== ".") ? "." : "") + e)).includes(needle)));
};

for (const propName in path) {
    const propValue = path[propName];
    if (is.function(propValue)) {
        upath[propName] = ((propName) =>
            function (...args) {
                args = args.map((p) => {
                    if (is.string(p)) {
                        return toUnix(p);
                    }
                    return p;
                });

                const result = path[propName](...Array.from(args || []));

                if (is.string(result)) {
                    return toUnix(result);
                }
                return result;

            }
        )(propName);
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
            if (p.startsWith("./..") || (p === "./")) {
                return upath.normalize(p);
            }
            return `./${upath.normalize(p)}`;

        }
        return upath.normalize(p);

    },

    normalizeTrim(p) {
        p = upath.normalizeSafe(p);
        if (p.endsWith("/")) {
            return p.slice(0, Number(p.length - 2) + 1 || undefined);
        }
        return p;

    },


    joinSafe(...p) {
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
            return filename.slice(0, Number((filename.length - oldExt.length) - 1) + 1 || undefined);
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
        return upath.trimExt(filename, ignoreExts, maxSize) +
            (!ext ?
                ""
                :
                ext[0] === "." ?
                    ext
                    :
                    `.${ext}`);
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

for (const name of Object.keys(extraFunctions || {})) {
    const extraFn = extraFunctions[name];
    if (!is.undefined(upath[name])) {
        throw new Error(`path.${name} already exists.`);
    } else {
        upath[name] = extraFn;
    }
}
