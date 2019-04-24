import { code as errno } from "../../errors/errno";

const syscallMap = {
    lstat: "lstat",
    stat: "stat",
    readdir: "scandir",
    readlink: "readlink",
    open: "open",
    close: "close",
    read: "read",
    fchmod: "fchmod",
    fchown: "fchown",
    fdatasync: "fdatasync",
    fstat: "fstat",
    fsync: "fsync",
    ftruncate: "ftruncate",
    futimes: "futime" // node throws futime
};

export class FSException extends Error {
    constructor(errnoObj, path, dest, syscall) {
        super();
        Object.defineProperties(this, {
            code: {
                value: errnoObj.code,
                enumerable: false
            },
            description: {
                value: errnoObj.description,
                enumerable: false
            },
            message: {
                enumerable: false,
                writable: true
            },
            _path: {
                value: path,
                enumerable: false,
                writable: true
            },
            _syscall: {
                value: syscallMap[syscall],
                enumerable: false,
                writable: true
            },
            _dest: {
                value: dest,
                enumerable: false,
                writable: true
            }
        });
        this._updateMessage();
    }

    get path() {
        return this._path;
    }

    set path(v) {
        this._path = v;
        this._updateMessage();
    }

    get dest() {
        return this._dest;
    }

    set dest(v) {
        this._dest = v;
        this._updateMessage();
    }

    get syscall() {
        return this._syscall;
    }

    set syscall(v) {
        this._syscall = syscallMap[v];
        this._updateMessage();
    }

    _updateMessage() {
        let message = `${this.code}: ${this.description}`;
        if (this._syscall) {
            message += `, ${this._syscall}`;
        }

        if (this._path) {
            if (!this._syscall) {
                message += ",";
            }
            message += ` '${this._path}'`;
            if (this._dest) {
                message += ` -> '${this._dest}'`;
            }
        }

        this.message = message;
    }

    /**
     * @param {Path} path
     */
    mount(path) {
        this.path = path.mount(this.path);
    }
}

const createError = (code, path, dest, syscall) => new FSException(errno[code], path, dest, syscall);

export default createError;

