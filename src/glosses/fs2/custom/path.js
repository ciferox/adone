import path from "../../path";
import { isWindows } from "../../../common";

export default class Path {
    /**
     * @param {string} [path]
     */
    constructor(path, { sep = "/", root = "/" } = {}) {
        if (!path) {
            // custom initialization
            return;
        }

        path = path.replace(/[\\/]/g, sep);

        /**
         * @type {string}
         */
        this.path = path;

        this.sep = sep;

        this.absolute = false;

        this.rootLevel = 0;

        this._split(path, root);
    }

    _split(path, root) {
        const c = path.charCodeAt(0);
        if (c === 47/*/*/ || c === 92/*\*/) {
            // absolute
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

                    return this._split(`${root}${path.slice(1)}`);
                }
                this.root = path[0];
                if (path.length > 1) {
                    this.parts = path.slice(1).split(this.sep);
                } else {
                    this.parts = [];
                }
            }
        } else if (isWindows && ((c >= 65/*A*/ && c <= 90/*Z*/) || (c >= 98/*a*/ && c <= 122/*z*/))) {
            const c = path.charCodeAt(1);
            if (c === 58) {
                // absolute, [A-Za-z]:[\\/]
                this.absolute = true;
                this.root = path.slice(0, 3);
                this.parts = path.slice(3).split("\\");
            } else {
                // relative
                this.root = "";
                this.parts = path.split("\\");
            }
        } else {
            // relative
            this.root = "";
            this.parts = path.split(this.sep);
        }
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
        return `${this.root}${this.parts.join(this.sep)}`;
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
        path.sep = this.sep;
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

    static resolve(p, { sep, root }) {
        if (p instanceof Path) {
            return p;
        }
        if (path.isAbsolute(p)) {
            return new Path(p, { sep, root });
        }
        return new Path(path.resolve(p), { sep, root });
    }

    static wrap(path, { sep, root }) {
        if (path instanceof Path) {
            return path;
        }
        return new Path(path, { sep, root });
    }

    static fromParts(parts, { root, sep }) {
        const path = new Path();
        path.absolute = true;
        path.parts = parts;
        path.root = root;
        path.sep = sep;
        return path;
    }
}
