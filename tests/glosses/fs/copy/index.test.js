const {
    assertion,
    is,
    fs: { copy },
    std: { fs, path }
} = adone;

assertion.use(assertion.extension.promise);

const slash = require("slash");
const readDirFiles = require("read-dir-files");
const through = require("through2");

const SOURCE_PATH = path.resolve(__dirname, "./fixtures/source");
const DESTINATION_PATH = path.resolve(__dirname, "./fixtures/destination");

const COPY_EVENTS = [
    "error",
    "complete",
    "createDirectoryStart",
    "createDirectoryError",
    "createDirectoryComplete",
    "createSymlinkStart",
    "createSymlinkError",
    "createSymlinkComplete",
    "copyFileStart",
    "copyFileError",
    "copyFileComplete"
];

describe("fs", "copy", () => {
    beforeEach(async () => {
        if (await adone.fs.exists(DESTINATION_PATH)) {
            await adone.fs.rm(DESTINATION_PATH);
        }
        await adone.fs.mkdirp(DESTINATION_PATH);
    });

    afterEach(async () => {
        await adone.fs.rm(DESTINATION_PATH);
    });

    const getSourcePath = (filename) => path.join(SOURCE_PATH, filename);

    const getDestinationPath = (filename) => {
        if (!filename) {
            return DESTINATION_PATH;
        }
        return path.join(DESTINATION_PATH, filename);
    };

    const getOutputFiles = () => {
        return new Promise(((resolve, reject) => {
            readDirFiles.read(DESTINATION_PATH, "utf8", (error, files) => {
                if (error) {
                    return reject(error);
                }
                return resolve(files);
            });
        }));
    };

    const checkResults = (results, expectedResults) => {
        let actual; let expected;
        actual = results.reduce((paths, copyOperation) => {
            paths[copyOperation.src] = copyOperation.dest;
            return paths;
        }, {});
        expected = Object.keys(expectedResults).map((filename) => {
            return {
                src: getSourcePath(filename),
                dest: getDestinationPath(filename)
            };
        }).reduce((paths, copyOperation) => {
            paths[copyOperation.src] = copyOperation.dest;
            return paths;
        }, {});
        expect(actual).to.eql(expected);

        actual = results.reduce((stats, copyOperation) => {
            stats[copyOperation.dest] = getFileType(copyOperation.stats);
            return stats;
        }, {});
        expected = Object.keys(expectedResults).map((filename) => {
            return {
                dest: getDestinationPath(filename),
                type: expectedResults[filename]
            };
        }).reduce((paths, copyOperation) => {
            paths[copyOperation.dest] = copyOperation.type;
            return paths;
        }, {});
        expect(actual).to.eql(expected);


        function getFileType(stats) {
            if (stats.isDirectory()) {
                return "dir";
            }
            if (stats.isSymbolicLink()) {
                return "symlink";
            }
            return "file";
        }
    };

    const createSymbolicLink = async (src, dest, type) => {
        let stats;
        try {
            stats = fs.lstatSync(dest);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
        if (!stats) {
            fs.symlinkSync(src, dest, type);
        } else if (!stats.isSymbolicLink()) {
            await adone.fs.rm(dest);
            fs.symlinkSync(src, dest, type);
        }
    };

    const listenTo = (emitter, eventNames) => {
        const events = [];
        eventNames.forEach((eventName) => {
            emitter.on(eventName, createListener(eventName));
        });
        return events;


        function createListener(eventName) {
            return function (args) {
                events.push({
                    name: eventName,
                    args: Array.prototype.slice.call(arguments)
                });
            };
        }
    };

    const mockMkdirp = (subject, errors) => {
        return subject.mkdirp = mkdirp;

        function mkdirp(path, mode, callback) {
            if ((arguments.length === 2) && (is.function(mode))) {
                callback = mode;
                mode = undefined;
            }
            setTimeout(() => {
                if (errors && errors[path]) {
                    callback(errors[path]);
                } else {
                    callback(null);
                }
            });
        }
    };

    const mockSymlink = (subject) => {
        if (!subject.fs) {
            subject.fs = {};
        }
        const originalSymlink = subject.fs.symlink;
        subject.fs.symlink = symlink;
        return function () {
            subject.fs.symlink = originalSymlink;
        };

        function symlink(srcPath, dstPath, type, callback) {
            if ((arguments.length === 3) && (is.function(type))) {
                callback = type;
                type = undefined;
            }
            setTimeout(() => {
                callback(new Error("Test error"));
            });
        }
    };

    describe("basic operation", () => {
        it("should copy single files", () => {
            return copy(
                getSourcePath("file"),
                getDestinationPath("file")
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            file: "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should return results for single files", () => {
            return copy(
                getSourcePath("file"),
                getDestinationPath("file")
            ).then((results) => {
                checkResults(results, {
                    file: "file"
                });
            });
        });

        it("should retain file modification dates", () => {
            // return new Promise((resolve) => {
            //     setTimeout(resolve, 1000);
            // }).then(() => {
            return copy(
                getSourcePath("file"),
                getDestinationPath("file")
            ).then((results) => {
                const actual = fs.statSync(getDestinationPath("file")).mtime;
                const expected = fs.statSync(getSourcePath("file")).mtime;
                actual.setMilliseconds(0);
                expected.setMilliseconds(0);
                expect(actual).to.eql(expected);
            });
        });

        it("should retain file permissions", () => {
            return copy(
                getSourcePath("executable"),
                getDestinationPath("executable")
            ).then((results) => {
                const actual = fs.statSync(getDestinationPath("executable")).mode;
                const expected = fs.statSync(getSourcePath("executable")).mode;
                expect(actual).to.equal(expected);
            });
        });

        it("should create parent directory if it does not exist", () => {
            return copy(
                getSourcePath("nested-file/file"),
                getDestinationPath("nested-file/file")
            ).then((results) => {
                checkResults(results, {
                    "nested-file/file": "file"
                });
            });
        });

        it("should copy empty directories", () => {
            return copy(
                getSourcePath("empty"),
                getDestinationPath("empty")
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            empty: {}
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should return results for empty directories", () => {
            return copy(
                getSourcePath("empty"),
                getDestinationPath("empty")
            ).then((results) => {
                checkResults(results, {
                    empty: "dir"
                });
            });
        });

        it("should copy directories", () => {
            return copy(
                getSourcePath("directory"),
                getDestinationPath("directory")
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            directory: {
                                a: "a\n",
                                b: "b\n",
                                c: "c\n"
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should return results for directories", () => {
            return copy(
                getSourcePath("directory"),
                getDestinationPath("directory")
            ).then((results) => {
                checkResults(results, {
                    directory: "dir",
                    "directory/a": "file",
                    "directory/b": "file",
                    "directory/c": "file"
                });
            });
        });

        it("should copy nested directories", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath("nested-directory")
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "nested-directory": {
                                1: {
                                    "1-1": {
                                        "1-1-a": "1-1-a\n",
                                        "1-1-b": "1-1-b\n"
                                    },
                                    "1-2": {
                                        "1-2-a": "1-2-a\n",
                                        "1-2-b": "1-2-b\n"
                                    },
                                    "1-a": "1-a\n",
                                    "1-b": "1-b\n"
                                },
                                2: {
                                    "2-1": {
                                        "2-1-a": "2-1-a\n",
                                        "2-1-b": "2-1-b\n"
                                    },
                                    "2-2": {
                                        "2-2-a": "2-2-a\n",
                                        "2-2-b": "2-2-b\n"
                                    },
                                    "2-a": "2-a\n",
                                    "2-b": "2-b\n"
                                },
                                a: "a\n",
                                b: "b\n"
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should return results for directories", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath("nested-directory")
            ).then((results) => {
                checkResults(results, {
                    "nested-directory": "dir",
                    "nested-directory/1": "dir",
                    "nested-directory/1/1-1": "dir",
                    "nested-directory/1/1-1/1-1-a": "file",
                    "nested-directory/1/1-1/1-1-b": "file",
                    "nested-directory/1/1-2": "dir",
                    "nested-directory/1/1-2/1-2-a": "file",
                    "nested-directory/1/1-2/1-2-b": "file",
                    "nested-directory/1/1-a": "file",
                    "nested-directory/1/1-b": "file",
                    "nested-directory/2": "dir",
                    "nested-directory/2/2-1": "dir",
                    "nested-directory/2/2-1/2-1-a": "file",
                    "nested-directory/2/2-1/2-1-b": "file",
                    "nested-directory/2/2-2": "dir",
                    "nested-directory/2/2-2/2-2-a": "file",
                    "nested-directory/2/2-2/2-2-b": "file",
                    "nested-directory/2/2-a": "file",
                    "nested-directory/2/2-b": "file",
                    "nested-directory/a": "file",
                    "nested-directory/b": "file"
                });
            });
        });

        it("should merge directories into existing directories", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath()
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            1: {
                                "1-1": {
                                    "1-1-a": "1-1-a\n",
                                    "1-1-b": "1-1-b\n"
                                },
                                "1-2": {
                                    "1-2-a": "1-2-a\n",
                                    "1-2-b": "1-2-b\n"
                                },
                                "1-a": "1-a\n",
                                "1-b": "1-b\n"
                            },
                            2: {
                                "2-1": {
                                    "2-1-a": "2-1-a\n",
                                    "2-1-b": "2-1-b\n"
                                },
                                "2-2": {
                                    "2-2-a": "2-2-a\n",
                                    "2-2-b": "2-2-b\n"
                                },
                                "2-a": "2-a\n",
                                "2-b": "2-b\n"
                            },
                            a: "a\n",
                            b: "b\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should copy symlinks", async () => {
            await createSymbolicLink(".", getSourcePath("symlink"), "dir");
            return copy(
                getSourcePath("symlink"),
                getDestinationPath("symlink")
            ).then((results) => {
                const actual = fs.readlinkSync(getDestinationPath("symlink"));
                const expected = ".";
                expect(actual).to.equal(expected);
            });
        });

        it("should return results for symlinks", async () => {
            await createSymbolicLink(".", getSourcePath("symlink"), "dir");
            return copy(
                getSourcePath("symlink"),
                getDestinationPath("symlink")
            ).then((results) => {
                checkResults(results, {
                    symlink: "symlink"
                });
            });
        });

        it("should copy nested symlinks", async () => {
            await createSymbolicLink("../file", getSourcePath("nested-symlinks/file"), "file");
            await createSymbolicLink("../directory", getSourcePath("nested-symlinks/directory"), "dir");
            await createSymbolicLink("../../directory", getSourcePath("nested-symlinks/nested/directory"), "dir");
            return copy(
                getSourcePath("nested-symlinks"),
                getDestinationPath("nested-symlinks")
            ).then((results) => {
                let actual; let expected;
                actual = slash(fs.readlinkSync(getDestinationPath("nested-symlinks/file")));
                expected = "../file";
                expect(actual).to.equal(expected);
                actual = slash(fs.readlinkSync(getDestinationPath("nested-symlinks/directory")));
                expected = "../directory";
                expect(actual).to.equal(expected);
                actual = slash(fs.readlinkSync(getDestinationPath("nested-symlinks/nested/directory")));
                expected = "../../directory";
                expect(actual).to.equal(expected);
            });
        });

        it("should return results for nested symlinks", async () => {
            await createSymbolicLink("../file", getSourcePath("nested-symlinks/file"), "file");
            await createSymbolicLink("../directory", getSourcePath("nested-symlinks/directory"), "dir");
            await createSymbolicLink("../../directory", getSourcePath("nested-symlinks/nested/directory"), "dir");
            return copy(
                getSourcePath("nested-symlinks"),
                getDestinationPath("nested-symlinks")
            ).then((results) => {
                checkResults(results, {
                    "nested-symlinks": "dir",
                    "nested-symlinks/file": "symlink",
                    "nested-symlinks/directory": "symlink",
                    "nested-symlinks/nested": "dir",
                    "nested-symlinks/nested/directory": "symlink"
                });
            });
        });
    });

    describe("options", () => {

        it("should overwrite destination file if overwrite is specified", () => {
            fs.writeFileSync(getDestinationPath("file"), "Goodbye, world!");

            return copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    overwrite: true
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            file: "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should overwrite destination symlink if overwrite is specified", () => {
            fs.symlinkSync("./symlink", getDestinationPath("file"), "file");

            return copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    overwrite: true
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            file: "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should overwrite destination directory if overwrite is specified", () => {
            fs.mkdirSync(getDestinationPath("file"));

            return copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    overwrite: true
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            file: "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should not copy dotfiles if dotfiles is not specified", () => {
            return copy(
                getSourcePath("dotfiles"),
                getDestinationPath()
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            a: "a\n",
                            b: "b\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should copy dotfiles if dotfiles is specified", () => {
            return copy(
                getSourcePath("dotfiles"),
                getDestinationPath(),
                {
                    dot: true
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            ".a": ".a\n",
                            ".b": ".b\n",
                            a: "a\n",
                            b: "b\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should not copy junk files if junk is not specified", () => {
            return copy(
                getSourcePath("junk"),
                getDestinationPath()
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            a: "a\n",
                            b: "b\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should copy junk files if junk is specified", () => {
            return copy(
                getSourcePath("junk"),
                getDestinationPath(),
                {
                    junk: true
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            a: "a\n",
                            b: "b\n",
                            "npm-debug.log": "npm-debug.log\n",
                            "Thumbs.db": "Thumbs.db\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should expand symlinked source files if expand is specified", async () => {
            await createSymbolicLink("./file", getSourcePath("file-symlink"), "file");
            return copy(
                getSourcePath("file-symlink"),
                getDestinationPath("expanded-file-symlink"),
                {
                    expand: true
                }
            ).then((results) => {
                const actual = fs.lstatSync(getDestinationPath("expanded-file-symlink")).isSymbolicLink();
                const expected = false;
                expect(actual).to.equal(expected);
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "expanded-file-symlink": "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should expand symlinked source directories if expand is specified", async () => {
            await createSymbolicLink("./directory", getSourcePath("directory-symlink"), "dir");
            return copy(
                getSourcePath("directory-symlink"),
                getDestinationPath("directory-symlink"),
                {
                    expand: true
                }
            ).then((results) => {
                const actual = fs.lstatSync(getDestinationPath("directory-symlink")).isSymbolicLink();
                const expected = false;
                expect(actual).to.equal(expected);
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "directory-symlink": {
                                a: "a\n",
                                b: "b\n",
                                c: "c\n"
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should expand nested symlinks if expand is specified", async () => {
            await createSymbolicLink("../file", getSourcePath("nested-symlinks/file"), "file");
            await createSymbolicLink("../directory", getSourcePath("nested-symlinks/directory"), "dir");
            await createSymbolicLink("../../directory", getSourcePath("nested-symlinks/nested/directory"), "dir");
            return copy(
                getSourcePath("nested-symlinks"),
                getDestinationPath("expanded-nested-symlinks"),
                {
                    expand: true
                }
            ).then((results) => {
                let actual; let expected;
                actual = fs.lstatSync(getDestinationPath("expanded-nested-symlinks")).isSymbolicLink();
                expected = false;
                expect(actual).to.equal(expected);
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "expanded-nested-symlinks": {
                                file: "Hello, world!\n",
                                directory: {
                                    a: "a\n",
                                    b: "b\n",
                                    c: "c\n"
                                },
                                nested: {
                                    directory: {
                                        a: "a\n",
                                        b: "b\n",
                                        c: "c\n"
                                    }
                                }
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });
    });

    describe("output transformation", () => {
        it("should filter output files via function", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    filter(filePath) {
                        const filename = path.basename(filePath);
                        return (filePath === "1") || (filename.charAt(0) !== "1");
                    }
                }
            );

            const files = await getOutputFiles();
            const actual = files;
            const expected = {
                1: {},
                2: {
                    "2-1": {
                        "2-1-a": "2-1-a\n",
                        "2-1-b": "2-1-b\n"
                    },
                    "2-2": {
                        "2-2-a": "2-2-a\n",
                        "2-2-b": "2-2-b\n"
                    },
                    "2-a": "2-a\n",
                    "2-b": "2-b\n"
                },
                a: "a\n",
                b: "b\n"
            };
            expect(actual).to.eql(expected);
        });

        it("should filter output files via regular expression", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    filter: /(^[^1].*$)|(^1$)/
                }
            );

            const files = await getOutputFiles();
            const actual = files;
            const expected = {
                1: {},
                2: {
                    "2-1": {
                        "2-1-a": "2-1-a\n",
                        "2-1-b": "2-1-b\n"
                    },
                    "2-2": {
                        "2-2-a": "2-2-a\n",
                        "2-2-b": "2-2-b\n"
                    },
                    "2-a": "2-a\n",
                    "2-b": "2-b\n"
                },
                a: "a\n",
                b: "b\n"
            };
            expect(actual).to.eql(expected);
        });

        it("should filter output files via glob", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    filter: "2/**/*"
                }
            );

            const files = await getOutputFiles();
            const actual = files;
            const expected = {
                2: {
                    "2-1": {
                        "2-1-a": "2-1-a\n",
                        "2-1-b": "2-1-b\n"
                    },
                    "2-2": {
                        "2-2-a": "2-2-a\n",
                        "2-2-b": "2-2-b\n"
                    },
                    "2-a": "2-a\n",
                    "2-b": "2-b\n"
                }
            };
            expect(actual).to.eql(expected);
        });

        it("should combine multiple filters from arrays", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    filter: [
                        "1/**/*",
                        "!1/1-1/**/*",
                        /^2\/(?!2-1\/).*$/,
                        function (filePath) {
                            return filePath === "a";
                        }
                    ]
                }
            );

            const files = await getOutputFiles();
            const actual = files;
            const expected = {
                1: {
                    "1-1": {},
                    "1-2": {
                        "1-2-a": "1-2-a\n",
                        "1-2-b": "1-2-b\n"
                    },
                    "1-a": "1-a\n",
                    "1-b": "1-b\n"
                },
                2: {
                    "2-1": {
                    },
                    "2-2": {
                        "2-2-a": "2-2-a\n",
                        "2-2-b": "2-2-b\n"
                    },
                    "2-a": "2-a\n",
                    "2-b": "2-b\n"
                },
                a: "a\n"
            };
            expect(actual).to.eql(expected);
        });

        it("should rename files", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    rename(path) {
                        if (path === "b") {
                            return "c";
                        }
                        return path;
                    }
                }
            );
            const files = await getOutputFiles();
            const actual = files;
            const expected = {
                1: {
                    "1-1": {
                        "1-1-a": "1-1-a\n",
                        "1-1-b": "1-1-b\n"
                    },
                    "1-2": {
                        "1-2-a": "1-2-a\n",
                        "1-2-b": "1-2-b\n"
                    },
                    "1-a": "1-a\n",
                    "1-b": "1-b\n"
                },
                2: {
                    "2-1": {
                        "2-1-a": "2-1-a\n",
                        "2-1-b": "2-1-b\n"
                    },
                    "2-2": {
                        "2-2-a": "2-2-a\n",
                        "2-2-b": "2-2-b\n"
                    },
                    "2-a": "2-a\n",
                    "2-b": "2-b\n"
                },
                a: "a\n",
                c: "b\n"
            };
            expect(actual).to.eql(expected);
        });

        it("should rename file paths", async () => {
            await copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    rename(path) {
                        return path.replace(/^2/, "3").replace(/[\/\\]2/g, "/3");
                    }
                }
            );

            const files = await getOutputFiles();
            let actual; let expected;
            actual = files;
            expected = {
                1: {
                    "1-1": {
                        "1-1-a": "1-1-a\n",
                        "1-1-b": "1-1-b\n"
                    },
                    "1-2": {
                        "1-2-a": "1-2-a\n",
                        "1-2-b": "1-2-b\n"
                    },
                    "1-a": "1-a\n",
                    "1-b": "1-b\n"
                },
                3: {
                    "3-1": {
                        "3-1-a": "2-1-a\n",
                        "3-1-b": "2-1-b\n"
                    },
                    "3-2": {
                        "3-2-a": "2-2-a\n",
                        "3-2-b": "2-2-b\n"
                    },
                    "3-a": "2-a\n",
                    "3-b": "2-b\n"
                },
                a: "a\n",
                b: "b\n"
            };
            expect(actual).to.eql(expected);
        });

        it("should rename files into parent paths", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath("parent"),
                {
                    rename(path) {
                        return path.replace(/^2/, "../3").replace(/[\/\\]2/g, "/3");
                    }
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            parent: {
                                1: {
                                    "1-1": {
                                        "1-1-a": "1-1-a\n",
                                        "1-1-b": "1-1-b\n"
                                    },
                                    "1-2": {
                                        "1-2-a": "1-2-a\n",
                                        "1-2-b": "1-2-b\n"
                                    },
                                    "1-a": "1-a\n",
                                    "1-b": "1-b\n"
                                },
                                a: "a\n",
                                b: "b\n"
                            },
                            3: {
                                "3-1": {
                                    "3-1-a": "2-1-a\n",
                                    "3-1-b": "2-1-b\n"
                                },
                                "3-2": {
                                    "3-2-a": "2-2-a\n",
                                    "3-2-b": "2-2-b\n"
                                },
                                "3-a": "2-a\n",
                                "3-b": "2-b\n"
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should rename files into child paths", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    rename(path) {
                        return path.replace(/^2/, "child/3").replace(/[\/\\]2/g, "/3");
                    }
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            1: {
                                "1-1": {
                                    "1-1-a": "1-1-a\n",
                                    "1-1-b": "1-1-b\n"
                                },
                                "1-2": {
                                    "1-2-a": "1-2-a\n",
                                    "1-2-b": "1-2-b\n"
                                },
                                "1-a": "1-a\n",
                                "1-b": "1-b\n"
                            },
                            a: "a\n",
                            b: "b\n",
                            child: {
                                3: {
                                    "3-1": {
                                        "3-1-a": "2-1-a\n",
                                        "3-1-b": "2-1-b\n"
                                    },
                                    "3-2": {
                                        "3-2-a": "2-2-a\n",
                                        "3-2-b": "2-2-b\n"
                                    },
                                    "3-a": "2-a\n",
                                    "3-b": "2-b\n"
                                }
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should filter files before renaming", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath(),
                {
                    filter(path) {
                        return path === "a";
                    },
                    rename(path) {
                        if (path === "a") {
                            return "b";
                        }
                        return path;
                    }
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            b: "a\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should transform files", () => {
            let transformArguments = null;
            return copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    transform(src, dest, stats) {
                        transformArguments = arguments;
                        return through((chunk, enc, done) => {
                            done(null, chunk.toString().toUpperCase());
                        });
                    }
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            file: "HELLO, WORLD!\n"
                        };
                        expect(actual).to.eql(expected);
                        expect(transformArguments).to.exist;
                        expect(transformArguments.length).to.eql(3);
                        expect(transformArguments[0]).to.equal(getSourcePath("file"));
                        expect(transformArguments[1]).to.equal(getDestinationPath("file"));
                        expect(transformArguments[2]).to.exist;
                        expect(transformArguments[2].isFile).to.exist;
                        expect(transformArguments[2].isFile()).to.be.true;
                    });
            });
        });

        it("should allow transform to be skipped", () => {
            return copy(
                getSourcePath("directory"),
                getDestinationPath("directory"),
                {
                    transform(src, dest, stats) {
                        if (path.basename(src) === "b") {
                            return null;
                        }
                        return through((chunk, enc, done) => {
                            done(null, chunk.toString().toUpperCase());
                        });
                    }
                }
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            directory: {
                                a: "A\n",
                                b: "b\n",
                                c: "C\n"
                            }
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should throw an error on a transform stream error", () => {
            let actual; let expected;
            expected = "Stream error";
            actual = copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    transform(src, dest, stats) {
                        return through((chunk, enc, done) => {
                            done(new Error("Stream error"));
                        });
                    }
                }
            );
            return expect(actual).to.be.rejectedWith(expected);
        });

        it("should throw the original error on nested file error", () => {
            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath("nested-directory"),
                {
                    transform(src, dest, stats) {
                        return through((chunk, enc, done) => {
                            if (src === getSourcePath("nested-directory/1/1-1/1-1-a")) {
                                done(new Error("Stream error"));
                            } else {
                                done(null, chunk);
                            }
                        });
                    }
                }
            ).then(() => {
                throw new Error("Should throw error");
            }).catch((error) => {
                let actual; let expected;

                actual = error.name;
                expected = "Error";
                expect(actual).to.equal(expected);

                actual = error.message;
                expected = "Stream error";
                expect(actual).to.equal(expected);
            });
        });
    });

    describe("argument validation", () => {

        it("should throw an error if the source path does not exist", () => {
            let actual; let expected;
            actual = copy(
                "nonexistent",
                getDestinationPath()
            );
            expected = "ENOENT";
            return expect(actual).to.be.rejectedWith(expected);
        });

        it("should throw an error if the destination path exists (single file)", () => {
            fs.writeFileSync(getDestinationPath("file"), "");

            let actual; let expected;
            actual = copy(
                getSourcePath("file"),
                getDestinationPath("file")
            );
            expected = "EEXIST";
            return expect(actual).to.be.rejectedWith(expected);
        });

        it("should not throw an error if an nonconflicting file exists within the destination path (single file)", () => {
            fs.writeFileSync(getDestinationPath("pre-existing"), "");

            return copy(
                getSourcePath("file"),
                getDestinationPath("file")
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "pre-existing": "",
                            file: "Hello, world!\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });

        it("should throw an error if a conflicting file exists within the destination path (directory)", () => {
            fs.writeFileSync(getDestinationPath("a"), "");

            let actual; let expected;
            actual = copy(
                getSourcePath("nested-directory"),
                getDestinationPath()
            );
            expected = "EEXIST";
            return expect(actual).to.be.rejectedWith(expected);
        });

        it("should not throw an error if an nonconflicting file exists within the destination path (directory)", () => {
            fs.writeFileSync(getDestinationPath("pre-existing"), "");

            return copy(
                getSourcePath("nested-directory"),
                getDestinationPath()
            ).then((results) => {
                return getOutputFiles()
                    .then((files) => {
                        let actual; let expected;
                        actual = files;
                        expected = {
                            "pre-existing": "",
                            1: {
                                "1-1": {
                                    "1-1-a": "1-1-a\n",
                                    "1-1-b": "1-1-b\n"
                                },
                                "1-2": {
                                    "1-2-a": "1-2-a\n",
                                    "1-2-b": "1-2-b\n"
                                },
                                "1-a": "1-a\n",
                                "1-b": "1-b\n"
                            },
                            2: {
                                "2-1": {
                                    "2-1-a": "2-1-a\n",
                                    "2-1-b": "2-1-b\n"
                                },
                                "2-2": {
                                    "2-2-a": "2-2-a\n",
                                    "2-2-b": "2-2-b\n"
                                },
                                "2-a": "2-a\n",
                                "2-b": "2-b\n"
                            },
                            a: "a\n",
                            b: "b\n"
                        };
                        expect(actual).to.eql(expected);
                    });
            });
        });
    });

    describe("events", () => {
        it("should allow event listeners to be chained", () => {
            const copier = copy(
                getSourcePath("file"),
                getDestinationPath("file")
            );
            const actual = copier.on("complete", () => { });
            const expected = copier;
            expect(actual).to.equal(expected);
            return copier;
        });

        it("should emit file copy events", () => {
            const copier = copy(
                getSourcePath("file"),
                getDestinationPath("file")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.then(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["copyFileStart", "copyFileComplete", "complete"];
                expect(actual).to.eql(expected);

                const completeEvent = events.filter((event) => {
                    return event.name === "complete";
                })[0];
                const eventArgs = completeEvent.args;

                actual = eventArgs.length;
                expected = 1;
                expect(actual).to.equal(expected);

                const results = eventArgs[0];
                checkResults(results, {
                    file: "file"
                });
            });
        });

        it("should emit error events", () => {
            fs.writeFileSync(getDestinationPath("file"), "");

            const copier = copy(
                getSourcePath("file"),
                getDestinationPath("file")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.catch(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["error"];
                expect(actual).to.eql(expected);

                const errorEvent = events.filter((event) => {
                    return event.name === "error";
                })[0];
                const eventArgs = errorEvent.args;

                actual = eventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const error = eventArgs[0];
                const copyOperation = eventArgs[1];

                actual = error.code;
                expected = "EEXIST";
                expect(actual).to.equal(expected);

                actual = copyOperation.src;
                expected = getSourcePath("file");
                expect(actual).to.equal(expected);

                actual = copyOperation.dest;
                expected = getDestinationPath("file");
                expect(actual).to.equal(expected);
            });
        });

        it("should emit file copy error events", () => {
            const copier = copy(
                getSourcePath("file"),
                getDestinationPath("file"),
                {
                    transform(src, dest, stats) {
                        return through((chunk, enc, done) => {
                            done(new Error("Stream error"));
                        });
                    }
                }
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.catch(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["copyFileStart", "copyFileError", "error"];
                expect(actual).to.eql(expected);


                const errorEvent = events.filter((event) => {
                    return event.name === "error";
                })[0];
                const eventArgs = errorEvent.args;

                actual = eventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const error = eventArgs[0];
                const copyOperation = eventArgs[1];

                actual = error.message;
                expected = "Stream error";
                expect(actual).to.equal(expected);

                actual = copyOperation.src;
                expected = getSourcePath("file");
                expect(actual).to.equal(expected);

                actual = copyOperation.dest;
                expected = getDestinationPath("file");
                expect(actual).to.equal(expected);


                const fileErrorEvent = events.filter((event) => {
                    return event.name === "copyFileError";
                })[0];
                const fileErrorEventArgs = fileErrorEvent.args;

                actual = fileErrorEventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const fileError = fileErrorEventArgs[0];
                const fileCopyOperation = fileErrorEventArgs[1];

                actual = fileError.message;
                expected = "Stream error";
                expect(actual).to.equal(expected);

                actual = fileCopyOperation.src;
                expected = getSourcePath("file");
                expect(actual).to.equal(expected);

                actual = fileCopyOperation.dest;
                expected = getDestinationPath("file");
                expect(actual).to.equal(expected);

                actual = fileCopyOperation.stats && fileCopyOperation.stats.isDirectory;
                expected = "function";
                expect(actual).to.be.a(expected);
            });
        });

        it("should emit directory copy events", () => {
            const copier = copy(
                getSourcePath("empty"),
                getDestinationPath("empty")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.then(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["createDirectoryStart", "createDirectoryComplete", "complete"];
                expect(actual).to.eql(expected);

                const completeEvent = events.filter((event) => {
                    return event.name === "complete";
                })[0];
                const eventArgs = completeEvent.args;

                actual = eventArgs.length;
                expected = 1;
                expect(actual).to.equal(expected);

                const results = eventArgs[0];
                checkResults(results, {
                    empty: "dir"
                });
            });
        });

        it.todo("should emit directory copy error events", () => {
            const errors = {};
            errors[getDestinationPath("empty")] = new Error("Test error");
            const unmockMkdirp = mockMkdirp(copy, errors);

            const copier = copy(
                getSourcePath("empty"),
                getDestinationPath("empty")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.catch(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["createDirectoryStart", "createDirectoryError", "error"];
                expect(actual).to.eql(expected);


                const errorEvent = events.filter((event) => {
                    return event.name === "error";
                })[0];
                const eventArgs = errorEvent.args;

                actual = eventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const error = eventArgs[0];
                const copyOperation = eventArgs[1];

                actual = error.message;
                expected = "Test error";
                expect(actual).to.equal(expected);

                actual = copyOperation.src;
                expected = getSourcePath("empty");
                expect(actual).to.equal(expected);

                actual = copyOperation.dest;
                expected = getDestinationPath("empty");
                expect(actual).to.equal(expected);


                const directoryErrorEvent = events.filter((event) => {
                    return event.name === "createDirectoryError";
                })[0];
                const directoryErrorEventArgs = directoryErrorEvent.args;

                actual = directoryErrorEventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const directoryError = directoryErrorEventArgs[0];
                const directoryCopyOperation = directoryErrorEventArgs[1];

                actual = directoryError.message;
                expected = "Test error";
                expect(actual).to.equal(expected);

                actual = directoryCopyOperation.src;
                expected = getSourcePath("empty");
                expect(actual).to.equal(expected);

                actual = directoryCopyOperation.dest;
                expected = getDestinationPath("empty");
                expect(actual).to.equal(expected);

                actual = directoryCopyOperation.stats && directoryCopyOperation.stats.isDirectory;
                expected = "function";
                expect(actual).to.be.a(expected);
            })
                .then(() => {
                    unmockMkdirp();
                })
                .catch(() => {
                    unmockMkdirp();
                });
        });

        it.todo("should emit symlink copy error events", async () => {
            await createSymbolicLink(".", getSourcePath("symlink"), "dir");
            const unmockSymlink = mockSymlink(copy);

            const copier = copy(
                getSourcePath("symlink"),
                getDestinationPath("symlink")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.catch(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["createSymlinkStart", "createSymlinkError", "error"];
                expect(actual).to.eql(expected);


                const errorEvent = events.filter((event) => {
                    return event.name === "error";
                })[0];
                const eventArgs = errorEvent.args;

                actual = eventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const error = eventArgs[0];
                const copyOperation = eventArgs[1];

                actual = error.message;
                expected = "Test error";
                expect(actual).to.equal(expected);

                actual = copyOperation.src;
                expected = getSourcePath("symlink");
                expect(actual).to.equal(expected);

                actual = copyOperation.dest;
                expected = getDestinationPath("symlink");
                expect(actual).to.equal(expected);


                const symlinkErrorEvent = events.filter((event) => {
                    return event.name === "createSymlinkError";
                })[0];
                const symlinkErrorEventArgs = symlinkErrorEvent.args;

                actual = symlinkErrorEventArgs.length;
                expected = 2;
                expect(actual).to.equal(expected);

                const symlinkError = symlinkErrorEventArgs[0];
                const symlinkCopyOperation = symlinkErrorEventArgs[1];

                actual = symlinkError.message;
                expected = "Test error";
                expect(actual).to.equal(expected);

                actual = symlinkCopyOperation.src;
                expected = getSourcePath("symlink");
                expect(actual).to.equal(expected);

                actual = symlinkCopyOperation.dest;
                expected = getDestinationPath("symlink");
                expect(actual).to.equal(expected);

                actual = symlinkCopyOperation.stats && symlinkCopyOperation.stats.isDirectory;
                expected = "function";
                expect(actual).to.be.a(expected);
            })
                .then(() => {
                    unmockSymlink();
                })
                .catch((error) => {
                    unmockSymlink();
                    throw error;
                });
        });

        it.todo("should emit symlink copy events", async () => {
            await createSymbolicLink(".", getSourcePath("symlink"), "dir");
            const copier = copy(
                getSourcePath("symlink"),
                getDestinationPath("symlink")
            );
            const events = listenTo(copier, COPY_EVENTS);
            return copier.then(() => {
                let actual; let expected;

                const eventNames = events.map((event) => {
                    return event.name;
                });

                actual = eventNames;
                expected = ["createSymlinkStart", "createSymlinkComplete", "complete"];
                expect(actual).to.eql(expected);

                const completeEvent = events.filter((event) => {
                    return event.name === "complete";
                })[0];
                const eventArgs = completeEvent.args;

                actual = eventArgs.length;
                expected = 1;
                expect(actual).to.equal(expected);

                const results = eventArgs[0];
                checkResults(results, {
                    symlink: "symlink"
                });
            });
        });
    });
});
