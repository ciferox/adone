import { isAbsolute, normalize, resolve, sep } from "../../path";
import { isWindows } from "../../../common";

export default class Path {
    constructor(path, root = sep) {
        if (!path) {
            // custom initialization
            return;
        }

        this.path = normalize(path);

        this.absolute = false;

        this.rootLevel = 0;

        this._split(this.path, root);
    }

    _split(path, root) {
        const c = path.charCodeAt(0);
        if (c === 47/* '/' */) {
            this.absolute = true;
            if (isWindows && path.charCodeAt(1) === 92) {
                // network resource
                // but for some reason node.js do not handle it
                this.root = "\\\\";

                if (path.length > 2) {
                    this.parts = path.slice(2).split("\\");
                } else {
                    this.parts = [];
                }
            } else {
                if (root && root.length > 1) {
                    // this must be a windows case, when a user use paths with leading /
                    // we resolve it

                    this._split(`${root}${path.slice(1)}`);
                    return;
                }

                this.root = path[0];
                this.parts = (path.length > 1)
                    ? path.slice(1).split(sep)
                    : [];
            }
            return;
        } else if (isWindows && ((c >= 65/*A*/ && c <= 90/*Z*/) || (c >= 98/*a*/ && c <= 122/*z*/))) {
            const c = path.charCodeAt(1);
            if (c === 58/* ':' */) {
                // absolute, [A-Za-z]:[\\/]
                this.absolute = true;
                this.root = path.slice(0, 3);
                this.parts = path.slice(3).split("\\");
                return;
            }
        }
        // relative
        this.root = "";
        this.parts = path.split(sep);
    }

    mount(p) {
        const newPath = this.clone();
        for (const part of p.parts) {
            newPath.parts.push(part);
        }
        return newPath;
    }

    get fullPath() {
        // root inludes sep
        return `${this.root}${this.parts.join(sep)}`;
    }

    extend(parts) {
        for (const p of parts) {
            this.parts.push(p);
        }
    }

    replaceParts(parts) {
        const path = this.clone();
        path.parts = parts;
        return path;
    }

    clone() {
        const path = new Path();
        path.absolute = this.absolute;
        path.parts = this.parts.slice();
        path.root = this.root;
        return path;
    }

    join(part) {
        const p = this.clone();
        p.parts.push(part);
        return p;
    }

    filename() {
        return this.parts[this.parts.length - 1];
    }

    static resolve(p, root) {
        return (p instanceof Path)
            ? p
            : (isAbsolute(p))
                ? new Path(p, root)
                : new Path(resolve(p), root);
    }

    static wrap(path, root) {
        return (path instanceof Path)
            ? path
            : new Path(path, root);
    }

    static fromParts(parts, root) {
        const path = new Path();
        path.absolute = true;
        path.parts = parts;
        path.root = root;
        return path;
    }
}
