const { std: { fs, path }, x } = adone;

export const getCommentRegex = () => {
    return /^\s*\/(?:\/|\*)[@#]\s+sourceMappingURL=data:(?:application|text)\/json;(?:charset[:=]\S+;)?base64,(.*)$/mg;
};

export const getMapFileCommentRegex = () => {
    // Matches sourceMappingURL in either // or /* comment styles.
    return /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"`]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*(?:\*\/){1}[ \t]*$)/mg;
};

const decodeBase64 = (base64) => Buffer.from(base64, "base64").toString();
const stripComment = (sm) => sm.split(",").pop();

const readFromFileMap = (sm, dir) => {
    const r = getMapFileCommentRegex().exec(sm);

    // for some odd reason //# .. captures in 1 and /* .. */ in 2
    const filename = r[1] || r[2];
    const filepath = path.resolve(dir, filename);

    try {
        return fs.readFileSync(filepath, "utf8");
    } catch (e) {
        throw new x.Exception(`An error occurred while trying to read the map file at ${filepath}\n${e}`);
    }
};

class Converter {
    constructor(sm, options = {}) {
        if (options.isFileComment) {
            sm = readFromFileMap(sm, options, options.commentFileDir);
        }
        if (options.hasComment) {
            sm = stripComment(sm);
        }
        if (options.isEncoded) {
            sm = decodeBase64(sm);
        }
        if (options.isJSON || options.isEncoded) {
            sm = JSON.parse(sm);
        }
        this.sourcemap = sm;
    }

    toJSON(space) {
        return JSON.stringify(this.sourcemap, null, space);
    }

    toBase64() {
        return Buffer.from(this.toJSON()).toString("base64");
    }

    toComment(options) {
        const base64 = this.toBase64();
        const data = `sourceMappingURL=data:application/json;charset=utf-8;base64,${base64}`;
        return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;

    }

    toObject() {
        return JSON.parse(this.toJSON());
    }

    addProperty(key, value) {
        if (this.sourcemap.hasOwnProperty(key)) {
            throw new x.Exception("property %s already exists on the sourcemap, use set property instead");
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

export const fromObject = (obj) => new Converter(obj);

export const fromJSON = (json) => new Converter(json, { isJSON: true });

export const fromBase64 = (base64) => new Converter(base64, { isEncoded: true });

export const fromComment = (comment) => {
    comment = comment
        .replace(/^\/\*/g, "//")
        .replace(/\*\/$/g, "");

    return new Converter(comment, { isEncoded: true, hasComment: true });
};

export const fromMapFileComment = (comment, dir) => new Converter(comment, {
    commentFileDir: dir, isFileComment: true, isJSON: true
});

export const fromMapFileSource = (content, dir) => {
    const m = content.match(getMapFileCommentRegex());
    return m ? fromMapFileComment(m.pop(), dir) : null;
};

export const removeComments = (src) => {
    return src.replace(getCommentRegex(), "");
};

export const removeMapFileComments = (src) => {
    return src.replace(getMapFileCommentRegex(), "");
};

export const generateMapFileComment = (file, options) => {
    const data = `sourceMappingURL=${file}`;
    return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;
};

export const fromSource = (content, largeSource) => {
    const m = content.match(getCommentRegex());
    return m ? fromComment(m.pop()) : null;
};
