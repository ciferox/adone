const {
    std: { fs, path }
} = adone;

export const getCommentRegex = () => /^\s*\/(?:\/|\*)[@#]\s+sourceMappingURL=data:(?:application|text)\/json;(?:charset[:=]\S+?;)?base64,(?:.*)$/mg;

export const getMapFileCommentRegex = () => /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"`]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/){1}[ \t]*$)/mg;

const decodeBase64 = (base64) => Buffer.from(base64, "base64").toString();

const stripComment = (sm) => sm.split(",").pop();

const readFromFileMap = function (sm, dir) {
    // NOTE: this will only work on the server since it attempts to read the map file

    const r = getMapFileCommentRegex().exec(sm);

    // for some odd reason //# .. captures in 1 and /* .. */ in 2
    const filename = r[1] || r[2];
    const filepath = path.resolve(dir, filename);

    try {
        return fs.readFileSync(filepath, "utf8");
    } catch (e) {
        throw new Error(`An error occurred while trying to read the map file at ${filepath}\n${e}`);
    }
};

class Converter {
    constructor(sm, opts) {
        opts = opts || {};

        if (opts.isFileComment) {
            sm = readFromFileMap(sm, opts.commentFileDir);
        }
        if (opts.hasComment) {
            sm = stripComment(sm);
        }
        if (opts.isEncoded) {
            sm = decodeBase64(sm);
        }
        if (opts.isJSON || opts.isEncoded) {
            sm = JSON.parse(sm);
        }

        this.sourcemap = sm;
    }

    toJSON(space) {
        return JSON.stringify(this.sourcemap, null, space);
    }

    toBase64() {
        const json = this.toJSON();
        return Buffer.from(json, "utf8").toString("base64");
    }

    toComment(options) {
        const base64 = this.toBase64();
        const data = `sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;
        return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;
    }

    // returns copy instead of original
    toObject() {
        return JSON.parse(this.toJSON());
    }

    addProperty(key, value) {
        if (this.sourcemap.hasOwnProperty(key)) {
            throw new Error(`property "${key}" already exists on the sourcemap, use set property instead`);
        }
        return this.setProperty(key, value);
    }

    setProperty(key, value) {
        this.sourcemap[key] = value;
        return this;
    }

    getProperty(key) {
        return this.sourcemap[key];
    }
}

export const fromObject = function (obj) {
    return new Converter(obj);
};

export const fromJSON = function (json) {
    return new Converter(json, { isJSON: true });
};

export const fromBase64 = function (base64) {
    return new Converter(base64, { isEncoded: true });
};

export const fromComment = function (comment) {
    comment = comment
        .replace(/^\/\*/g, "//")
        .replace(/\*\/$/g, "");

    return new Converter(comment, { isEncoded: true, hasComment: true });
};

export const fromMapFileComment = function (comment, dir) {
    return new Converter(comment, { commentFileDir: dir, isFileComment: true, isJSON: true });
};

// Finds last sourcemap comment in file or returns null if none was found
export const fromSource = function (content) {
    const m = content.match(getCommentRegex());
    return m ? fromComment(m.pop()) : null;
};

// Finds last sourcemap comment in file or returns null if none was found
export const fromMapFileSource = function (content, dir) {
    const m = content.match(getMapFileCommentRegex());
    return m ? fromMapFileComment(m.pop(), dir) : null;
};

export const removeComments = function (src) {
    return src.replace(getCommentRegex(), "");
};

export const removeMapFileComments = function (src) {
    return src.replace(getMapFileCommentRegex(), "");
};

export const generateMapFileComment = function (file, options) {
    const data = `sourceMappingURL=${file}`;
    return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;
};
