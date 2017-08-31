import generateFixtures from "./generate_fixtures";

describe("fast", "transform", "sourcemaps", "write", () => {
    const { fast, std: { stream: { Readable } } } = adone;
    const { File, transform: { sourcemaps: { write: sourcemapsWrite, __: { util } } } } = fast;

    let sourceContent;
    let mappedContent;
    let root;
    let fromdir;

    const makeSourceMap = (custom) => {
        const obj = {
            version: 3,
            file: "helloworld.js",
            names: [],
            mappings: "",
            sources: ["helloworld.js"],
            sourcesContent: [sourceContent]
        };

        if (custom) {
            Object.assign(obj, custom);
        }
        return obj;
    };

    const base64JSON = (object) => {
        return `data:application/json;charset=utf8;base64,${Buffer.from(JSON.stringify(object)).toString("base64")}`;
    };

    const makeFile = (custom) => {
        const file = new File({
            cwd: root.path(),
            base: fromdir.path(),
            path: fromdir.getFile("helloworld.js").path(),
            contents: Buffer.from(sourceContent)
        });
        file.sourceMap = makeSourceMap(custom);
        return file;
    };

    const makeNestedFile = () => {
        const file = new File({
            cwd: root.path(),
            base: fromdir.path(),
            path: fromdir.getFile("dir1", "dir2", "helloworld.js").path(),
            contents: Buffer.from(sourceContent)
        });
        file.sourceMap = makeSourceMap();
        return file;
    };

    const makeMappedFile = () => {
        const file = new File({
            cwd: root.path(),
            base: fromdir.path(),
            path: fromdir.getFile("helloworld.map.js").path(),
            contents: Buffer.from(mappedContent)
        });
        file.sourceMap = makeSourceMap({ preExisting: util.getInlinePreExisting(mappedContent) });
        return file;
    };

    const makeStreamFile = () => {
        const file = new File({
            cwd: root.path(),
            base: fromdir.path(),
            path: fromdir.getFile("helloworld.js").path(),
            contents: new Readable()
        });
        file.sourceMap = {};
        return file;
    };

    before(async () => {
        root = await adone.fs.Directory.createTmp();
        fromdir = await root.addDirectory("from");
        await generateFixtures(fromdir);
        sourceContent = await fromdir.getFile("helloworld.js").contents();
        mappedContent = await fromdir.getFile("helloworld.map.js").contents();
    });

    after(async () => {
        await root.unlink();
    });

    it("should pass through when file is null", (done) => {
        const file = new File();
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data).to.be.ok;
            expect(data instanceof File).to.be.ok;
            expect(data).to.be.deep.equal(file);
            expect(data.contents).to.be.equal(null);
            done();
        }).on("error", done).resume().write(file);
    });

    it("should pass through when file has no source map", (done) => {
        const file = makeFile();
        delete file.sourceMap;
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data).to.be.ok;
            expect(data instanceof File).to.be.ok;
            expect(data).to.be.deep.equal(file);
            expect(String(data.contents)).to.be.equal(sourceContent);
            done();
        }).on("error", done).resume().write(file);
    });

    it("should emit an error if file content is a stream", (done) => {
        const pipeline = sourcemapsWrite();
        pipeline.on("data", () => {
            done(new Error("should emit an error"));
        }).on("error", () => done()).resume().write(makeStreamFile());
    });

    it("should write an inline source map", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data).to.be.ok;
            expect(data instanceof File).to.be.ok;
            expect(data).to.be.deep.equal(file);
            expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# ${"sourceMappingURL"}=${base64JSON(data.sourceMap)}\n`);
            done();
        }).on("error", done).resume().write(file);
    });

    it.skip("should use CSS comments if CSS file", (done) => {
        const file = makeFile();
        file.path = file.path.replace(".js", ".css");
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(String(data.contents)).to.be.equal(`${sourceContent}\n/*# sourceMappingURL=${base64JSON(data.sourceMap)} */\n`);
            done();
        }).resume().write(file);
    });

    it.skip("should write no comment if not JS or CSS file", (done) => {
        const file = makeFile();
        file.path = file.path.replace(".js", ".txt");
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(String(data.contents)).to.be.equal(sourceContent);
            done();
        }).resume().write(file);
    });

    it("hould detect whether a file uses \\n or \\r\\n and follow the existing style", (done) => {
        const file = makeFile();
        file.contents = Buffer.from(file.contents.toString().replace(/\n/g, "\r\n"));
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data).to.be.ok;
            expect(String(data.contents)).to.be.equal(`${sourceContent.replace(/\n/g, "\r\n")}\r\n//# ${"sourceMappingURL"}=${base64JSON(data.sourceMap)}\r\n`, "should add source map as comment");
            done();
        }).on("error", done).resume().write(file);
    });

    it("preExisting", (done) => {
        const file = makeMappedFile();
        file.contents = Buffer.from(adone.sourcemap.convert.removeComments(file.contents.toString()).trim());

        sourcemapsWrite({ preExisting: true })
            .on("data", (data) => {
                expect(data).to.be.ok;
                expect(Boolean(data.sourceMap.preExisting)).to.be.ok;
                expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# ${"sourceMappingURL"}=${base64JSON(data.sourceMap)}\n`);
                done();
            }).on("error", done).resume().write(file);
    });

    it("should write external map files", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite("../maps", { destPath: "dist" });
        let fileCount = 0;
        const outFiles = [];
        let sourceMap;
        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === fromdir.getFile("helloworld.js").path()) {
                        sourceMap = data.sourceMap;
                        expect(data instanceof File).to.be.ok;
                        expect(data).to.be.deep.equal(file);
                        expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# ${"sourceMappingURL"}=../maps/helloworld.js.map\n`);
                        expect(sourceMap.file).to.be.equal("../dist/helloworld.js");
                    } else {
                        expect(data instanceof File).to.be.ok;
                        expect(data.path).to.be.equal(root.getFile("maps", "helloworld.js.map").path());
                        expect(JSON.parse(data.contents)).to.be.deep.equal(sourceMap);
                        expect(data.stat.isFile()).to.be.equal(true);
                        expect(data.stat.isDirectory()).to.be.equal(false);
                        expect(data.stat.isBlockDevice()).to.be.equal(false);
                        expect(data.stat.isCharacterDevice()).to.be.equal(false);
                        expect(data.stat.isSymbolicLink()).to.be.equal(false);
                        expect(data.stat.isFIFO()).to.be.equal(false);
                        expect(data.stat.isSocket()).to.be.equal(false);
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should keep original file history", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite("../maps", { destPath: "dist" });
        const outFiles = [];
        let fileCount = 0;
        pipeline
            .on("data", (data) => {
                outFiles.push(data);
                fileCount++;
                if (fileCount === 2) {
                    outFiles.reverse().map((data) => {
                        if (data.path === root.getFile("maps", "helloworld.js.map").path()) {
                            expect(data.history[0]).to.be.equal(fromdir.getFile("helloworld.js").path());
                        }
                        return data;
                    });
                    done();
                }
            }).on("error", done).resume().write(file);
    });

    it("should allow to rename map file", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite("../maps", {
            mapFile: (mapFile) => mapFile.replace(".js.map", ".map"),
            destPath: "dist"
        });
        let fileCount = 0;
        const outFiles = [];
        let sourceMap;
        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === fromdir.getFile("helloworld.js").path()) {
                        sourceMap = data.sourceMap;
                        expect(data).to.be.instanceof(File);
                        expect(data).to.be.deep.equal(file);
                        expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# sourceMappingURL=../maps/helloworld.map\n`, "should add a comment referencing the source map file");
                        expect(sourceMap.file).to.be.equal("../dist/helloworld.js");
                    } else {
                        expect(data).to.be.instanceof(File);
                        expect(data.path).to.be.equal(root.getFile("maps", "helloworld.map").path());
                        expect(JSON.parse(data.contents)).to.be.deep.equal(sourceMap);
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should create shortest path to map in file comment", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite("dir1/maps");
        let fileCount = 0;
        const outFiles = [];
        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === fromdir.getFile("dir1", "dir2", "helloworld.js").path()) {
                        expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# ${"sourceMappingURL"}=../maps/dir1/dir2/helloworld.js.map\n`);
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should write no comment with option addComment=false", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ addComment: false });
        pipeline.on("data", (data) => {
            expect(String(data.contents)).to.be.equal(sourceContent);
            done();
        }).resume().write(file);
    });

    it("should not include source content with option includeContent=false", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ includeContent: false });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourcesContent).to.be.equal(undefined);
            done();
        }).resume().write(file);
    });

    it("should fetch missing sourceContent", (done) => {
        const file = makeFile();
        delete file.sourceMap.sourcesContent;
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourcesContent).not.to.be.equal(undefined);
            expect(data.sourceMap.sourcesContent).to.be.deep.equal([sourceContent]);
            done();
        }).resume().write(file);
    });

    it("should not throw when unable to fetch missing sourceContent", (done) => {
        const file = makeFile();
        file.sourceMap.sources[0] += ".invalid";
        delete file.sourceMap.sourcesContent;
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourcesContent).not.to.be.equal(undefined);
            expect(data.sourceMap.sourcesContent).to.be.deep.equal([]);
            done();
        }).resume().write(file);
    });

    it("should not throw when unable to fetch missing sourceContent", (done) => {
        const file = makeFile();
        file.sourceMap.sources[0] += ".invalid";
        delete file.sourceMap.sourcesContent;
        const pipeline = sourcemapsWrite();
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourcesContent).not.to.be.undefined;
            expect(data.sourceMap.sourcesContent).to.be.empty;
            done();
        }).resume().write(file);
    });

    it("should set the sourceRoot by option sourceRoot", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ sourceRoot: "/testSourceRoot" });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourceRoot).to.be.equal("/testSourceRoot");
            done();
        }).resume().write(file);
    });

    it("should set the mapSourcesAbsolute by option mapSourcesAbsolute", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ sourceRoot: "/testSourceRoot", mapSourcesAbsolute: true });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sources).to.be.deep.equal(["/from/helloworld.js"]);
            expect(data.sourceMap.sourceRoot).to.be.equal("/testSourceRoot");
            done();
        }).resume().write(file);
    });

    it("should set the sourceRoot by option sourceRoot, as a function", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({
            sourceRoot: () => "/testSourceRoot"
        });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourceRoot).to.be.equal("/testSourceRoot");
            done();
        }).resume().write(file);
    });

    it("should automatically determine sourceRoot if destPath is set", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite(".", {
            destPath: "dist",
            includeContent: false
        });
        let fileCount = 0;
        const outFiles = [];

        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === root.getFile("from", "dir1", "dir2", "helloworld.js").path()) {
                        expect(data.sourceMap.sourceRoot).to.be.equal("../../../from", "should set correct sourceRoot");
                        expect(data.sourceMap.file).to.be.equal("helloworld.js");
                    } else {
                        expect(data.path).to.be.equal(root.getFile("from", "dir1", "dir2", "helloworld.js.map").path());
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should interpret relative path in sourceRoot as relative to destination", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite(".", { sourceRoot: "../src" });
        let fileCount = 0;
        const outFiles = [];

        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === root.getFile("from", "dir1", "dir2", "helloworld.js").path()) {
                        expect(data.sourceMap.sourceRoot).to.be.equal("../../../src");
                        expect(data.sourceMap.file).to.be.equal("helloworld.js");
                    } else {
                        expect(data.path).to.be.equal(root.getFile("from", "dir1", "dir2", "helloworld.js.map").path());
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should interpret relative path in sourceRoot as relative to destination (part 2)", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite(".", { sourceRoot: "" });
        let fileCount = 0;
        const outFiles = [];

        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === root.getFile("from", "dir1", "dir2", "helloworld.js").path()) {
                        expect(data.sourceMap.sourceRoot).to.be.equal("../..");
                        expect(data.sourceMap.file).to.be.equal("helloworld.js");
                    } else {
                        expect(data.path).to.be.equal(root.getFile("from", "dir1", "dir2", "helloworld.js.map").path());
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should interpret relative path in sourceRoot as relative to destination (part 3)", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite("maps", { sourceRoot: "../src" });
        let fileCount = 0;
        const outFiles = [];

        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === root.getFile("from", "dir1", "dir2", "helloworld.js").path()) {
                        expect(data.sourceMap.sourceRoot).to.be.equal("../../../../src");
                        expect(data.sourceMap.file).to.be.equal("../../../dir1/dir2/helloworld.js");
                    } else {
                        expect(data.path).to.be.equal(root.getFile("from", "maps", "dir1", "dir2", "helloworld.js.map").path());
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should interpret relative path in sourceRoot as relative to destination (part 4)", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite("../maps", {
            sourceRoot: "../src",
            destPath: "dist"
        });
        let fileCount = 0;
        const outFiles = [];

        pipeline.on("data", (data) => {
            outFiles.push(data);
            fileCount++;
            if (fileCount === 2) {
                outFiles.reverse().map((data) => {
                    if (data.path === root.getFile("from", "dir1", "dir2", "helloworld.js").path()) {
                        expect(data.sourceMap.sourceRoot).to.be.equal("../../../src");
                        expect(data.sourceMap.file).to.be.equal("../../../dist/dir1/dir2/helloworld.js");
                    } else {
                        expect(data.path).to.be.equal(root.getFile("maps", "dir1", "dir2", "helloworld.js.map").path());
                    }
                    return data;
                });
                done();
            }
        }).on("error", done).resume().write(file);
    });

    it("should accept a sourceMappingURLPrefix", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite("../maps", { sourceMappingURLPrefix: "https://asset-host.example.com" });
        pipeline.on("data", (data) => {
            if (/helloworld\.js$/.test(data.path)) {
                expect(String(data.contents).match(/sourceMappingURL.*\n$/)[0]).to.be.equal("sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n");
                done();
            }
        }).resume().write(file);
    });

    it("should accept a sourceMappingURLPrefix, as a function", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite("../maps", {
            sourceMappingURLPrefix: () => "https://asset-host.example.com"
        });
        pipeline.on("data", (data) => {
            if (/helloworld\.js$/.test(data.path)) {
                expect(String(data.contents).match(/sourceMappingURL.*\n$/)[0]).to.be.equal("sourceMappingURL=https://asset-host.example.com/maps/helloworld.js.map\n");
                done();
            }
        }).resume().write(file);
    });

    it("should invoke sourceMappingURLPrefix every time", (done) => {
        let times = 0;
        const pipeline = sourcemapsWrite("../maps", {
            sourceMappingURLPrefix() {
                ++times;
                return `https://asset-host.example.com/${times}`;
            }
        });

        pipeline.on("data", (data) => {
            if (/helloworld\.js$/.test(data.path)) {
                expect(String(data.contents).match(/sourceMappingURL.*\n$/)[0]).to.be.equal(`sourceMappingURL=https://asset-host.example.com/${times}/maps/helloworld.js.map\n`);
                if (times >= 3) {
                    done();
                    return;
                }
                pipeline.write(makeFile());
            }
        }).resume().write(makeFile());
    });

    it("null as sourceRoot should not set the sourceRoot", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ sourceRoot: null });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourceRoot).to.be.equal(undefined);
            done();
        }).resume().write(file);
    });

    it("function returning null as sourceRoot should not set the sourceRoot", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({
            sourceRoot: () => null
        });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourceRoot).to.be.equal(undefined);
            done();
        }).resume().write(file);
    });

    it("empty string as sourceRoot should be kept", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({ sourceRoot: "" });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sourceRoot).to.be.equal("");
            done();
        }).resume().write(file);
    });

    it("should be able to fully control sourceMappingURL by the option sourceMappingURL", (done) => {
        const file = makeNestedFile();
        const pipeline = sourcemapsWrite("../aaa/bbb/", {
            sourceMappingURL: (file) => `http://maps.example.com/${file.relative.replace(/\\/g, "/")}.map`
        });
        pipeline.on("data", (data) => {
            if (/helloworld\.js$/.test(data.path)) {
                expect(String(data.contents)).to.be.equal(`${sourceContent}\n//# ${"sourceMappingURL"}=http://maps.example.com/dir1/dir2/helloworld.js.map\n`);
                done();
            }
        }).resume().write(file);
    });

    it("should allow to change sources", (done) => {
        const file = makeFile();
        const pipeline = sourcemapsWrite({
            mapSources: (sourcePath) => `../src/${sourcePath}`
        });
        pipeline.on("data", (data) => {
            expect(data.sourceMap.sources).to.be.deep.equal(["../src/helloworld.js"]);
            done();
        }).on("error", done).resume().write(file);
    });
});
