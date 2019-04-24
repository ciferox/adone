const {
    fs2: { constants, custom: { AsyncFileSystem } }
} = adone;

export const fsCalls = [
    {
        method: "access",
        args: ["access_path", constants.R_OK],
        validArgs: ["access_path", constants.R_OK],
    },
    {
        method: "access",
        args: ["access_path"],
        validArgs: ["access_path", constants.F_OK],
    },
    {
        method: "accessSync",
        args: ["accessSync_path", constants.W_OK],
        validArgs: ["accessSync_path", constants.W_OK],
    },
    {
        method: "accessSync",
        args: ["accessSync_path"],
        validArgs: ["accessSync_path", constants.F_OK],
    },
    {
        method: "appendFile",
        args: ["appendFile_path", "somedata", {
            encoding: null,
            mode: 0x777,
            flag: "w"
        }],
        validArgs: ["appendFile_path", "somedata", {
            encoding: null,
            mode: 0x777,
            flag: "w"
        }]
    },
    {
        method: "appendFile",
        args: ["appendFile_path", "somedata", "binary"],
        validArgs: ["appendFile_path", "somedata", {
            encoding: "binary",
            mode: 0o666,
            flag: "a"
        }]
    },
    {
        method: "appendFile",
        args: ["appendFile_path", "somedata", {
            encoding: "ucs2",
            flag: "r"
        }],
        validArgs: ["appendFile_path", "somedata", {
            encoding: "ucs2",
            mode: 0o666,
            flag: "r"
        }]
    },
    {
        method: "appendFileSync",
        args: ["appendFileSync_path", "somedata", {
            encoding: null,
            mode: 0x777,
            flag: "w"
        }],
        validArgs: ["appendFileSync_path", "somedata", {
            encoding: null,
            mode: 0x777,
            flag: "w"
        }]
    },
    {
        method: "appendFileSync",
        args: ["appendFileSync_path", "somedata", "binary"],
        validArgs: ["appendFileSync_path", "somedata", {
            encoding: "binary",
            mode: 0o666,
            flag: "a"
        }]
    },
    {
        method: "chmod",
        args: ["chmod_path", constants.S_IWUSR],
        validArgs: ["chmod_path", constants.S_IWUSR]
    },
    {
        method: "chmodSync",
        args: ["chmodSync_path", constants.S_IROTH],
        validArgs: ["chmodSync_path", constants.S_IROTH]
    },
    {
        method: "chown",
        args: ["chown_path", 1, 2],
        validArgs: ["chown_path", 1, 2]
    },
    {
        method: "chownSync",
        args: ["chownSync_path", 3, 4],
        validArgs: ["chownSync_path", 3, 4]
    },
    {
        method: "chownr",
        args: ["chownr_path", 1, 2],
        validArgs: ["chownr_path", 1, 2]
    },
    {
        method: "chownrSync",
        args: ["chownrSync_path", 3, 4],
        validArgs: ["chownrSync_path", 3, 4]
    },
    {
        method: "mkdir",
        args: ["mkdir_path", 0o775],
        validArgs: ["mkdir_path", 0o775]
    },
    {
        method: "mkdir",
        args: ["mkdir_path"],
        validArgs: ["mkdir_path", 0o777]
    },
    {
        method: "mkdirSync",
        args: ["mkdirSync_path", 0o775],
        validArgs: ["mkdirSync_path", 0o775]
    },
    {
        method: "mkdirSync",
        args: ["mkdirSync_path"],
        validArgs: ["mkdirSync_path", 0o777]
    },
    // {
    //     method: "open",
    //     args: ["open_path", "w", 0o777],
    //     // validArgs: [777]
    // },

    // {
    //     method: "close",
    //     args: ["close_path", 1],
    //     validArgs: ["close_path", 1]
    // },
    // {
    //     method: "openSync",
    //     args: ["openSync_path", "w", 0o667],
    //     validArgs: ["w", 0o667]
    // },
    // {
    //     method: "closeSync",
    //     args: ["closeSync_path", 3],
    //     validArgs: ["closeSync_path", 3]
    // },
    // "close",
    // "closeSync",
    // "copyFile",
    // "copyFileSync",
    // "createReadStream",
    // "createWriteStream",
    // "exists", // deprecated
    // "existsSync",
    // "fchmod",
    // "fchmodSync",
    // "fchown",
    // "fchownSync",
    // "fdatasync",
    // "fdatasyncSync",
    // "fstat",
    // "fstatSync",
    // "fsync",
    // "fsyncSync",
    // "ftruncate",
    // "ftruncateSync",
    // "futimes",
    // "futimesSync",
    // "lchmod",
    // "lchmodSync",
    // "lchown",
    // "lchownSync",
    // "link",
    // "linkSync",
    // "lstat",
    // "lstatSync",
    // "mkdir",
    // "mkdirSync",
    // "mkdtemp",
    // "mkdtempSync",
    // "open",
    // "openSync",
    // "read",
    {
        method: "readdir",
        args: ["readdir_path", "binary"],
        validArgs: ["readdir_path", {
            encoding: "binary"
        }]
    },
    // "readdir",
    // "readdirSync",
    // "readFile",
    // "readFileSync",
    {
        method: "readlink",
        args: ["readlink_path"],
        validArgs: ["readlink_path", {
            encoding: "utf8"
        }]
    },
    {
        method: "readlink",
        args: ["readlink_path", null],
        validArgs: ["readlink_path", {
            encoding: null
        }]
    },
    {
        method: "readlinkSync",
        args: ["readlinkSync_path"],
        validArgs: ["readlinkSync_path", {
            encoding: "utf8"
        }]
    },
    {
        method: "readlink",
        args: ["readlinkSync_path", null],
        validArgs: ["readlinkSync_path", {
            encoding: null
        }]
    },
    // "readlinkSync",
    // "readSync",
    // "realpath",
    // "realpathSync",
    // "rename",
    // "renameSync",
    {
        method: "rmdir",
        args: ["rmdir_path"],
        validArgs: ["rmdir_path"]
    },
    {
        method: "rmdirSync",
        args: ["rmdirSync_path"],
        validArgs: ["rmdirSync_path"]
    },
    // "rmdir",
    // "rmdirSync",
    // "stat",
    // "statSync",
    // "symlink",
    // "symlinkSync",
    // "truncate",
    // "truncateSync",

    {
        method: "unlink",
        args: ["unlink_path"],
        validArgs: ["unlink_path"]
    },
    {
        method: "unlinkSync",
        args: ["unlinkSync_path"],
        validArgs: ["unlinkSync_path"]
    },

    // "utimes",
    // "utimesSync",
    // "write",
    {
        method: "writeFile",
        args: ["writeFile_path", "adone", "binary"],
        validArgs: ["writeFile_path", "adone", {
            encoding: "binary",
            mode: 0o666,
            flag: "w"
        }]
    },
    {
        method: "writeFile",
        args: ["writeFile_path", "adone", {
            mode: 0o777,
            flag: "w+"
        }],
        validArgs: ["writeFile_path", "adone", {
            encoding: "utf8",
            mode: 0o777,
            flag: "w+"
        }]
    },
    {
        method: "writeFileSync",
        args: ["writeFileSync_path", "adone", "binary"],
        validArgs: ["writeFileSync_path", "adone", {
            encoding: "binary",
            mode: 0o666,
            flag: "w"
        }]
    },
    {
        method: "writeFileSync",
        args: ["writeFileSync_path", "adone", {
            mode: 0o777,
            flag: "w+"
        }],
        validArgs: ["writeFileSync_path", "adone", {
            encoding: "utf8",
            mode: 0o777,
            flag: "w+"
        }]
    },
    // "writeFile",
    // "writeFileSync",
    // "writeSync",
    // "watch",
    // "watchFile",
    // "unwatchFile"
];

class SuccessCustomFs extends AsyncFileSystem {
    _accessSync(path, mode) {
        return [path, mode];
    }

    _appendFileSync(path, data, options) {
        return [path, data, options];
    }

    _chmodSync(path, mode) {
        return [path, mode];
    }

    _chownSync(path, uid, gid) {
        return [path, uid, gid];
    }

    _chownrSync(path, uid, gid) {
        return [path, uid, gid];
    }

    _closeSync(fd) {
        return [fd];
    }

    // "copyFile",
    // "copyFileSync",
    // "createReadStream",
    // "createWriteStream",
    // "exists", // deprecated
    // "existsSync",
    // "fchmod",
    // "fchmodSync",
    // "fchown",
    // "fchownSync",
    // "fdatasync",
    // "fdatasyncSync",
    // "fstat",
    // "fstatSync",
    // "fsync",
    // "fsyncSync",
    // "ftruncate",
    // "ftruncateSync",
    // "futimes",
    // "futimesSync",
    // "lchmod",
    // "lchmodSync",
    // "lchown",
    // "lchownSync",
    // "link",
    // "linkSync",
    // "lstat",
    // "lstatSync",
    _mkdirSync(path, mode) {
        return [path, mode];
    }
    // "mkdtemp",
    // "mkdtempSync",

    _openSync(path, flags, mode) {
        return 777;
    }

    // "read",

    _readdirSync(path, options) {
        return [path, options];
    }

    // "readFile",
    // "readFileSync",

    _readlinkSync(path, options) {
        return [path, options];
    }

    // "readSync",
    // "realpath",
    // "realpathSync",
    // "rename",
    // "renameSync",

    _rmdirSync(path) {
        return [path];
    }

    // "stat",
    // "statSync",
    // "symlink",
    // "symlinkSync",
    // "truncate",
    // "truncateSync",

    _unlinkSync(path) {
        return [path];
    }

    // "utimes",
    // "utimesSync",
    // "write",

    _writeFileSync(path, data, options) {
        return [path, data, options];
    }
    // "writeSync",
    // "watch",
    // "watchFile",
    // "unwatchFile"
}

const throwError = (...args) => {
    const err = new adone.error.Exception();
    err.args = args;
    throw err;
};

class FailCustomFs extends AsyncFileSystem {
    _accessSync(path, mode) {
        throwError(path, mode);
    }

    _appendFileSync(path, data, options) {
        throwError(path, data, options);
    }

    _chmodSync(path, mode) {
        throwError(path, mode);
    }

    _chownSync(path, uid, gid) {
        throwError(path, uid, gid);
    }

    _chownrSync(path, uid, gid) {
        throwError(path, uid, gid);
    }

    _closeSync(fd) {
        throwError(fd);
    }

    // "copyFile",
    // "copyFileSync",
    // "createReadStream",
    // "createWriteStream",
    // "exists", // deprecated
    // "existsSync",
    // "fchmod",
    // "fchmodSync",
    // "fchown",
    // "fchownSync",
    // "fdatasync",
    // "fdatasyncSync",
    // "fstat",
    // "fstatSync",
    // "fsync",
    // "fsyncSync",
    // "ftruncate",
    // "ftruncateSync",
    // "futimes",
    // "futimesSync",
    // "lchmod",
    // "lchmodSync",
    // "lchown",
    // "lchownSync",
    // "link",
    // "linkSync",
    // "lstat",
    // "lstatSync",

    _mkdirSync(path, mode) {
        throwError(path, mode);
    }

    // "mkdtemp",
    // "mkdtempSync",


    _openSync(path, flags, mode) {
        throwError(path, flags, mode);
    }
    // "read",

    _readdirSync(path, options) {
        throwError(path, options);
    }

    // "readFile",
    // "readFileSync",

    _readlinkSync(path, options) {
        throwError(path, options);
    }

    // "readSync",
    // "realpath",
    // "realpathSync",
    // "rename",
    // "renameSync",

    _rmdirSync(path) {
        throwError(path);
    }

    // "stat",
    // "statSync",
    // "symlink",
    // "symlinkSync",
    // "truncate",
    // "truncateSync",

    _unlinkSync(path) {
        throwError(path);
    }

    // "utimes",
    // "utimesSync",
    // "write",
    _writeFileSync(path, data, options) {
        throwError(path, data, options);
    }
    // "writeSync",
    // "watch",
    // "watchFile",
    // "unwatchFile"
}


export const cases = [
    {
        name: "SuccessCustomFs",
        type: "success",
        fs: new SuccessCustomFs()
    },
    {
        name: "FailCustomFs",
        type: "fail",
        fs: new FailCustomFs()
    }
];
