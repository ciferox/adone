const {
    is,
    std
} = adone;

const sep = std.path.sep;
let defaultRoot = std.path.resolve("/").replace(/\\/g, "/").slice(0, -1).split("/");
if (is.windows && defaultRoot[0] === "" && defaultRoot[1] === "") {
    // network resource on windows
    defaultRoot = ["\\"].concat(defaultRoot.slice(2));
}

export class Path {
    /**
     * @param {string} path
     */
    constructor(path) {
        this.path = path;
        this.parts = null;
        this.startIndex = 0;
        this.trailingSlash = undefined;
        this.absolute = undefined;
        this._normalize();
        this._parse();
        this._resolve();
    }

    clone() {
        const path = new this.constructor(this.path);
        path.strip(this.startIndex);
        return path;
    }

    join(part) {
        const p = this.clone();
        p.path = `${p.path}${sep}${part}`;
        p.parts.push(part);
        return p;
    }

    nonRelativeJoin(path) {
        return [...this.parts.slice(0, this.startIndex), ...path.parts].join(sep);
    }

    strip(level) {
        this.startIndex += level;
    }

    /**
     * relative to the target engine(it can be mounted), should be used everywhere instead of .parts
     */
    get relativeParts() {
        return this.parts.slice(this.startIndex);
    }

    fullPath() {
        return this.parts.join(sep);
    }

    // non relative join

    /**
     * relative to the target engine
     */
    relativePath() {
        return this.relativeParts.join(sep);
    }

    filename() {
        return this.parts[this.parts.length - 1] || "";
    }

    _normalize() {
        this.path = this.path.replace(/\\+/g, "/");
        if (this.path[this.path.length - 1] === "/") {
            this.trailingSlash = true;
            this.path = this.path.slice(0, -1);
        } else {
            this.trailingSlash = false;
        }
    }

    _parse() {
        let parts = this.path.split(/\//);
        const [firstPart] = parts;

        this.absolute = false;

        if (firstPart === "") { // starts with / or \
            this.absolute = true;
            if (is.windows && parts.length > 1 && parts[1] === "") { // \\ is a windows network resource
                parts = ["\\"].concat(parts.slice(2));
            } else {
                parts = this.defaultRoot.concat(parts.slice(1));
            }
        } else {
            const c = firstPart.charCodeAt(0);
            if ((c >= 65 /*A*/ && c <= 90 /*Z*/) || (c >= 98/*a*/ && c <= 122/*z*/)) {
                if (firstPart.length === 2 && firstPart.charCodeAt(1) === 58) {
                    this.absolute = true;
                    parts = [firstPart].concat(parts.slice(1));
                }
            }
        }

        this.parts = parts;
    }

    _resolve() {
        this.path = this.fullPath();
    }

    static resolve(path) {
        if (std.path.isAbsolute(path)) {
            return new Path(path);
        }
        const cwd = process.cwd();
        return new Path(`${cwd}${sep}${path}`);
    }

    static configure({ root }) {
        class XPath extends Path {}
        XPath.prototype.defaultRoot = root;
        return XPath;
    }
}

Path.prototype.defaultRoot = defaultRoot;

const ENGINE = Symbol("ENGINE");
const LEVEL = Symbol("LEVEL");
const PARENT = Symbol("PARENT");

const methodsToMock = [
    "readFile",
    "stat",
    "lstat",
    "readdir",
    "realpath"
];

/**
 * Represents an abstact fs engine, must of the methods must be implemented in derived classes
 */
export class AbstractEngine {
    constructor() {
        this.structure = {};
        this.mount(this, "/");
    }

    readFile(path, options, callback) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else if (is.function(options)) {
            [options, callback] = [{}, options];
        }
        options.encoding = options.encoding || null;
        options.flag = options.flag || "r";
        return this._handlePath("_readFile", Path.resolve(path), [options, callback]);
    }

    stat(path, callback) {
        return this._handlePath("_stat", Path.resolve(path), [callback]);
    }

    lstat(path, callback) {
        return this._handlePath("_lstat", Path.resolve(path), [callback]);
    }

    readdir(path, options, callback) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else if (is.function(options)) {
            [options, callback] = [{}, options];
        }
        options.encoding = options.encoding || "utf8";


        path = Path.resolve(path);

        /**
         * If we readdir /, and we have mounted /tmp, tmp must be added to the list
         */
        const siblings = this._getSiblingMounts(path);

        return this._handlePath("_readdir", path, [options, (err, result) => {
            if (err) {
                return callback(err);
            }
            result.push(...siblings);
            result.sort();
            callback(null, result);
        }]);
    }

    realpath(path, options, callback) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else if (is.function(options)) {
            [options, callback] = [{}, options];
        }
        options.encoding = options.encoding || "utf8";

        return this._handlePath("_realpath", Path.resolve(path), [options, callback]);
    }

    _getSiblingMounts(path) {
        let node = this.structure;
        for (const part of path.parts) {
            if (!(part in node)) {
                node = null;
                break;
            }
            node = node[part];
        }
        if (node) {
            return Object.keys(node).sort();
        }
        return [];
    }

    _getEngineNode(path) {
        let node = this.structure;
        const { parts } = path;

        for (let i = 0; i < parts.length; ++i) {
            const part = parts[i];
            if (part === "." || (part === "" && (!path.absolute || i > 0))) {
                continue;
            }
            if (part === "..") {
                if (PARENT in node) {
                    node = node[PARENT];
                }
                continue;
            }
            if (!(part in node)) {
                break;
            }
            node = node[part];
        }
        return node;
    }

    _handlePath(method, path, args) {
        const node = this._getEngineNode(path);
        const engine = node[ENGINE];
        if (engine !== this) {
            path.strip(node[LEVEL]);
        }
        return engine[method](path, ...args);
    }

    mount(engine, path) {
        path = Path.resolve(path);
        let root = this.structure;
        let level = 1;
        for (let i = 0; i < path.parts.length; ++i) {
            const part = path.parts[i];
            if (!(part in root)) {
                root[part] = {
                    [LEVEL]: level,
                    [PARENT]: root
                };
            }
            root = root[part];
            ++level;
        }
        root[ENGINE] = engine;
        return this;
    }

    mock(obj) {
        const origMethods = {};
        for (const method of methodsToMock) {
            origMethods[method] = obj[method];
            obj[method] = (...args) => this[method](...args);
        }
        obj.restore = () => {
            for (const method of methodsToMock) {
                obj[method] = origMethods[method];
            }
            delete obj.restore;
        };
        return obj;
    }
}

AbstractEngine.prototype.constants = std.fs.constants; // provide the same constants
