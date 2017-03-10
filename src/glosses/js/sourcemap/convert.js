

const { std: { fs, path }, x } = adone;

const commentRx = getCommentRegex();
const mapFileCommentRx = getMapFileCommentRegex();

const decodeBase64 = (base64) => new Buffer(base64, "base64").toString();
const stripComment = (sm) => sm.split(",").pop();

function readFromFileMap(sm, dir) {
    // NOTE: this will only work on the server since it attempts to read the map file

    const r = mapFileCommentRx.exec(sm);
    mapFileCommentRx.lastIndex = 0;

    // for some odd reason //# .. captures in 1 and /* .. */ in 2
    const filename = r[1] || r[2];
    const filepath = path.resolve(dir, filename);

    try {
        return fs.readFileSync(filepath, "utf8");
    } catch (e) {
        throw new Error("An error occurred while trying to read the map file at " + filepath + "\n" + e);
    }
}


function convertFromLargeSource(content) {
    const lines = content.split("\n");
    let line;
    // find first line which contains a source map starting at end of content
    for (let i = lines.length - 1; i > 0; i--) {
        line = lines[i];
        if (~line.indexOf("sourceMappingURL=data:")) {
            return fromComment(line);
        }
    }
}

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
        const json = this.toJSON();
        return new Buffer(json).toString("base64");
    }

    toComment(options) {
        const base64 = this.toBase64();
        const data = `sourceMappingURL=data:application/json;base64,${base64}`;
        return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;

    }

    // returns copy instead of original
    toObject = function () {
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

export function fromObject(obj) {
    return new Converter(obj);
}

export function fromJSON(json) {
    return new Converter(json, { isJSON: true });
}

export function fromBase64(base64) {
    return new Converter(base64, { isEncoded: true });
}

export function fromComment(comment) {
    comment = comment
        .replace(/^\/\*/g, "//")
        .replace(/\*\/$/g, "");

    return new Converter(comment, { isEncoded: true, hasComment: true });
}

export function fromMapFileComment(comment, dir) {
    return new Converter(comment, { commentFileDir: dir, isFileComment: true, isJSON: true });
}

// Finds last sourcemap comment in file or returns null if none was found
export function fromSource(content, largeSource) {
    if (largeSource) {
        const res = convertFromLargeSource(content);
        return res ? res : null;
    }

    const m = content.match(commentRx);
    commentRx.lastIndex = 0;
    return m ? exports.fromComment(m.pop()) : null;
}

// Finds last sourcemap comment in file or returns null if none was found
export function fromMapFileSource(content, dir) {
    const m = content.match(mapFileCommentRx);
    mapFileCommentRx.lastIndex = 0;
    return m ? exports.fromMapFileComment(m.pop(), dir) : null;
}

export function removeComments(src) {
    commentRx.lastIndex = 0;
    return src.replace(commentRx, "");
}

export function removeMapFileComments(src) {
    mapFileCommentRx.lastIndex = 0;
    return src.replace(mapFileCommentRx, "");
}

export function generateMapFileComment(file, options) {
    const data = `sourceMappingURL=${file}`;
    return options && options.multiline ? `/*# ${data} */` : `//# ${data}`;
}


export function getCommentRegex() {
    return /^\s*\/(?:\/|\*)[@#]\s+sourceMappingURL=data:(?:application|text)\/json;(?:charset[:=]\S+;)?base64,(.*)$/mg;
}

export function getMapFileCommentRegex() {
    return /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/){1}[ \t]*$)/mg;
}
