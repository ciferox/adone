import Filter from "adone/glosses/fast/transforms/filter";

const { fast, std: { path } } = adone;

function write(stream, iterable) {
    for (const i of iterable) {
        stream.write(i);
    }
    stream.end();
}

async function fetch(stream) {
    const p = Promise.resolve(stream);
    stream.end();
    return p;
}

describe("Fast", () => {
    describe("transforms", () => {
        describe("filter", () => {
            it("should stash elements", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                write(ss, [0, 1, 2, 3, 4, 5]);
                expect(await ss).to.be.deep.equal([0, 2, 4]);
            });

            it("should unstash elements", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                const us = filter.unstash();
                write(ss, [0, 1, 2, 3, 4, 5]);
                adone.promise.delay(100).then(() => us.end());
                expect(await us).to.be.deep.equal([1, 3, 5]);
            });

            it("should use named stream", async () => {
                const filter = new Filter();
                const ess = filter.stash("even", (x) => !(x % 2));
                const oss = filter.stash("odd", (x) => x % 2);
                write(ess, [0, 1, 2, 3, 4, 5]);
                write(oss, [0, 1, 2, 3, 4, 5]);
                expect(await fetch(ess)).to.be.deep.equal([1, 3, 5]);
                expect(await fetch(oss)).to.be.deep.equal([0, 2, 4]);
                const esu = filter.unstash("even");
                const osu = filter.unstash("odd");
                expect(await fetch(esu)).to.be.deep.equal([0, 2, 4]);
                expect(await fetch(osu)).to.be.deep.equal([1, 3, 5]);
            });

            it("should support back pressure", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                let i;
                for (i = 0; ss.write(i); i += 2);
                const us = filter.unstash();
                expect(i >> 1).to.be.equal(us._readableState.highWaterMark);
                us.resume();
                await adone.promise.delay(1);
                us.pause();
                expect(ss.write(100)).to.be.true;
            });

            it("should unstash all the streams", async () => {
                const filter = new Filter();
                const named1 = filter.stash("hello", (x) => x === "hello");
                const named2 = filter.stash("world", (x) => x === "world");
                const unnamed1 = filter.stash((x) => x % 2);
                const unnamed2 = filter.stash((x) => !(x % 2));
                write(named1, ["hello", "world"]);
                write(named2, ["hello", "world"]);
                write(unnamed1, [0, 1, 2, 3, 4, 5]);
                write(unnamed2, [0, 1, 2, 3, 4, 5]);
                adone.promise.delay(100).then(() => {
                    us.end();
                    filter.unstash("hello").end();
                    filter.unstash("world").end();
                    for (const x of filter.unnamed) {
                        x.end();
                    }
                });
                const us = filter.unstash();
                const result = await us;
                expect(result.sort()).to.be.deep.equal([0, 1, 2, 3, 4, 5, "hello", "world"]);
            });

            it("should return a pass through core stream if there is no streams", async () => {
                const filter = new Filter();
                expect(filter.unstash()).to.be.instanceof(adone.core.Core);
                expect(filter.unstash("hello")).to.be.instanceof(adone.core.Core);
            });

            describe("integration", () => {
                let fromdir;
                let root;
                let srcPath;

                before(async () => {
                    root = await adone.fs.Directory.createTmp();
                });

                after(async () => {
                    await root.unlink();
                });

                beforeEach(async () => {
                    fromdir = await root.addDirectory("from");
                    srcPath = path.join(fromdir.path(), "**", "*");
                });

                afterEach(async () => {
                    await root.clean();
                });

                it("should stash js files", async () => {
                    fromdir.addFile("hello.js");
                    fromdir.addFile("hello2.js");
                    fromdir.addFile("hello3.css");
                    const files = await fast.src(srcPath)
                        .stash("js", (x) => x.extname === ".js")
                        .map((x) => {
                            expect(x.extname).not.to.be.equal(".js");
                            return x;
                        });
                    expect(files).to.have.lengthOf(1);
                });

                it("should unstash js files", async () => {
                    fromdir.addFile("hello.js");
                    fromdir.addFile("hello2.js");
                    fromdir.addFile("hello3.css");

                    const files = await fast.src(srcPath)
                        .stash("js", (x) => x.extname === ".js")
                        .map((x) => {
                            x.extname += ".noo";
                            return x;
                        })
                        .unstash("js")
                        .map((x) => {
                            x.extname = ".yees";
                            return x;
                        })
                        .map((x) => {
                            expect(x.extname).to.be.equal(".yees");
                        });
                    expect(files).to.have.lengthOf(3);
                });

                it("should unstash everything", async () => {
                    await FS.createStructure(fromdir, [
                        "hello.js", "hello2.js", "style.css", "index.html"
                    ]);
                    const files = await fast.src(srcPath)
                        .stash("html", (x) => x.extname === ".html")
                        .stash("css", (x) => x.extname === ".css")
                        .stash(() => true)
                        .unstash();
                    expect(files).to.have.lengthOf(4);
                });

                it("should correctly handle multiple stashes", async () => {
                    await FS.createStructure(fromdir, [
                        "hello.js", "hello2.js", "style.css", "index.html"
                    ]);
                    const files = await fast.src(srcPath)
                        .stash("html", (x) => x.extname === ".html")
                        .stash("css", (x) => x.extname === ".css")
                        .map((x) => {
                            expect(x.extname).to.be.equal(".js");
                            x.js = true;
                            return x;
                        })
                        .stash("js", (x) => x.extname === ".js")
                        .unstash("css")
                        .map((x) => {
                            expect(x.extname).to.be.equal(".css");
                            x.css = true;
                            return x;
                        })
                        .unstash()
                        .map((x) => {
                            if (x.extname === ".js") {
                                expect(x.js).to.be.true;
                                expect(x.css).not.to.be.ok;
                            }
                            if (x.extname === ".css") {
                                expect(x.css).to.be.true;
                                expect(x.js).not.to.be.ok;
                            }
                            if (x.extname === ".html") {
                                expect(x.css).not.to.be.ok;
                                expect(x.js).not.to.be.ok;
                            }
                            return x;
                        });
                    expect(files).to.have.lengthOf(4);
                });
            });
        });
    });
});
