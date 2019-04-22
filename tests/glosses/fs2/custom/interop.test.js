const {
    fs2: { custom: { BaseFileSystem, StandardFileSystem, MemoryFileSystem } }
} = adone;

describe("fs2", "custom", "interoperability", () => {
    describe("interface", () => {
        const methods = [
            "access",
            "accessSync",
            "appendFile",
            "appendFileSync",
            "chmod",
            "chmodSync",
            "chown",
            "chownSync",
            "close",
            "closeSync",
            "copyFile",
            "copyFileSync",
            "createReadStream",
            "createWriteStream",
            "exists",
            "existsSync",
            "fchmod",
            "fchmodSync",
            "fchown",
            "fchownSync",
            "fdatasync",
            "fdatasyncSync",
            "fstat",
            "fstatSync",
            "fsync",
            "fsyncSync",
            "ftruncate",
            "ftruncateSync",
            "futimes",
            "futimesSync",
            "lchmod",
            "lchmodSync",
            "lchown",
            "lchownSync",
            "link",
            "linkSync",
            "lstat",
            "lstatSync",
            "mkdir",
            "mkdirSync",
            "mkdtemp",
            "mkdtempSync",
            "open",
            "openSync",
            "read",
            "readdir",
            "readdirSync",
            "readFile",
            "readFileSync",
            "readlink",
            "readlinkSync",
            "readSync",
            "realpath",
            "realpathSync",
            "rename",
            "renameSync",
            "rmdir",
            "rmdirSync",
            "stat",
            "statSync",
            "symlink",
            "symlinkSync",
            "truncate",
            "truncateSync",
            "unlink",
            "unlinkSync",
            // "unwatchFile",
            "utimes",
            "utimesSync",
            // "watch",
            // "watchFile",
            "write",
            "writeFile",
            "writeFileSync",
            "writeSync",

            // extra
            // "cwd"
        ];

        const customFses = [
            BaseFileSystem,
            StandardFileSystem,
            MemoryFileSystem
        ];

        for (const CFS of customFses) {
            describe(`${CFS.name} commons`, () => {
                for (const method of methods) {
                    it(`${method}() method defined`, () => {
                        assert.isFunction(CFS.prototype[method]);
                    });
                }

                it("constants should be defined and be superset of native one", () => {
                    if (CFS !== BaseFileSystem) {
                        const cfs = new CFS();
                        assert.isObject(cfs.constants);
                        assert.containsAllKeys(cfs.constants, adone.std.fs.constants);
                    }
                });

                it("should define ReadStream and WriteStream", () => {
                    if (CFS !== BaseFileSystem) {
                        const cfs = new CFS();
                        assert.isTrue(typeof cfs.ReadStream === "function");
                        assert.isTrue(typeof cfs.WriteStream === "function");
                    }
                });
            });
        }
    });
});
