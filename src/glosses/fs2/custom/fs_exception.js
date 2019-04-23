import { code as errno } from "../../errors/errno";

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
                value: syscall,
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
        this._syscall = v;
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

const error = {
    ENOENT: (path, dest, syscall) => new FSException(errno.ENOENT, path, dest, syscall),
    EISDIR: (path, dest, syscall) => new FSException(errno.EISDIR, path, dest, syscall),
    ENOTDIR: (path, dest, syscall) => new FSException(errno.ENOTDIR, path, dest, syscall),
    ELOOP: (path, dest, syscall) => new FSException(errno.ELOOP, path, dest, syscall),
    EINVAL: (path, dest, syscall) => new FSException(errno.EINVAL, path, dest, syscall),
    EBADF: (path, dest, syscall) => new FSException(errno.EBADF, path, dest, syscall),
    EEXIST: (path, dest, syscall) => new FSException(errno.EEXIST, path, dest, syscall),
    ENOTEMPTY: (path, dest, syscall) => new FSException(errno.ENOTEMPTY, path, dest, syscall),
    EACCES: (path, dest, syscall) => new FSException(errno.EACCES, path, dest, syscall),
    EPERM: (path, dest, syscall) => new FSException(errno.EPERM, path, dest, syscall),
    ENOSYS: (syscall) => new FSException(errno.ENOSYS, null, null, syscall),
    ENXIO: () => new FSException(errno.ENXIO),
    ESPIPE: () => new FSException(errno.ESPIPE),
    EFBIG: (path, dest, syscall) => new FSException(errno.EFBIG, path, dest, syscall),
    ENODEV: (path, dest, syscall) => new FSException(errno.ENODEV, path, dest, syscall),
    EBUSY: (path, dest, syscall) => new FSException(errno.EBUSY, path, dest, syscall),
    ENOSPC: (path, dest, syscall) => new FSException(errno.ENOSPC, path, dest, syscall)
};

export const createError = (code, path, dest, syscall) => error[code](path, dest, syscall);
