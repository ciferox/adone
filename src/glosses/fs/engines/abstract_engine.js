const {
    x,
    is,
    std
} = adone;

export class Path {
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
        const path = new Path(this.path);
        path.strip(this.startIndex);
        return path;
    }

    join(part) {
        const p = this.clone();
        p.path = `${p.path}/${part}`;
        p.parts.push(part);
        return p;
    }

    nonRelativeJoin(path) {
        return ["", ...this.parts.slice(0, this.startIndex), ...path.parts].join("/");
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
        return `${this.absolute ? "/" : ""}${this.parts.join("/")}`;
    }

    // non relative join

    /**
     * relative to the target engine
     */
    relativePath() {
        return `${this.absolute ? "/" : ""}${this.relativeParts.join("/")}`;
    }

    filename() {
        return this.parts[this.parts.length - 1] || "";
    }

    _normalize() {
        this.path = this.path.replace(/\/+/, "/");
        if (this.path[this.path.length - 1] === "/") {
            this.trailingSlash = true;
            this.path = this.path.slice(0, -1);
        } else {
            this.trailingSlash = false;
        }
    }

    _parse() {
        const parts = this.path.split(/\//);
        if (parts[0] === "") { // starts with /
            parts.shift();
            this.absolute = true;
        } else {
            this.absolute = false;
        }
        this.parts = parts;
    }

    _resolve() {
        const parts = [];
        for (let i = 0; i < this.parts.length; ++i) {
            const part = this.parts[i];
            // if (part === ".") {
            //     continue;
            // }
            // if (part === ".." && (this.absolute || (parts.length > 0 && parts[parts.length - 1] !== ".."))) {
            //     parts.pop();
            //     continue;
            // }
            parts.push(part);
        }
        this.parts = parts;
        this.path = this.fullPath();
    }
}

const ENGINE = Symbol("ENGINE");
const LEVEL = Symbol("LEVEL");

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
        return this._handlePath("_readFile", new Path(path), [options, callback]);
    }

    stat(path, callback) {
        return this._handlePath("_stat", new Path(path), [callback]);
    }

    lstat(path, callback) {
        return this._handlePath("_lstat", new Path(path), [callback]);
    }

    readdir(path, options, callback) {
        if (!is.object(options)) {
            options = { encoding: options };
        } else if (is.function(options)) {
            [options, callback] = [{}, options];
        }
        options.encoding = options.encoding || "utf8";


        path = new Path(path);

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

        return this._handlePath("_realpath", new Path(path), [options, callback]);
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
        for (const part of path.parts) {
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
        path = new Path(path);
        let root = this.structure;
        let level = 1;
        for (let i = 0; i < path.parts.length; ++i) {
            const part = path.parts[i];
            if (!(part in root)) {
                root[part] = {
                    [LEVEL]: level
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
