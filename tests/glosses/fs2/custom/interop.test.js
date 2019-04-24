const {
    fs2: { custom: { BaseFileSystem, StdFileSystem, MemoryFileSystem } }
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
            StdFileSystem,
            MemoryFileSystem
        ];

        for (const CFS of customFses) {
            describe(`${CFS.name} commons`, () => {
                for (const method of methods) {
                    it(`${method}() method defined`, () => {
                        assert.isFunction(CFS.prototype[method]);
                    });
                }

                it("constants should be defined and be superset of native one", {
                    skip: CFS === BaseFileSystem
                }, () => {
                    const cfs = new CFS();
                    assert.isObject(cfs.constants);
                    assert.containsAllKeys(cfs.constants, adone.std.fs.constants);
                });

                it("ReadStream and WriteStream should be defined", {
                    skip: CFS === BaseFileSystem
                }, () => {
                    const cfs = new CFS();
                    assert.isTrue(typeof cfs.ReadStream === "function");
                    assert.isTrue(typeof cfs.WriteStream === "function");
                });

                it("cwd() should be defined", {
                    skip: CFS === BaseFileSystem
                }, () => {
                    const cfs = new CFS();
                    assert.isFunction(cfs.cwd);
                });

                it.todo("own 'path' object with complete native interface shoul be defined", {
                    skip: CFS === BaseFileSystem
                }, () => {
                    // const cfs = new CFS();
                    // assert.isTrue(typeof cfs.WriteStream === "cwd");
                });
            });
        }
    });
});
