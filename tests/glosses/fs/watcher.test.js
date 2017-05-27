describe("glosses", "fs", "watcher", function watcherTests() {
    this.timeout(10000);

    const { is, fs: { Watcher, watch } } = adone;
    const { platform: os } = process;

    const usedWatchers = [];

    let watcher;
    let watcher2;
    let options;
    let osXFsWatch;
    let win32Polling;
    let slowerDelay;
    let rootFixtures = null;
    let fixtures = null;

    const originalcwd = process.cwd();

    const sleep = (to) => adone.promise.delay(to || slowerDelay || 100);

    const closeWatchers = () => {
        for (; ;) {
            const u = usedWatchers.pop();
            if (!u) {
                break;
            }
            u.close();
        }
    };

    const disposeWatcher = (watcher) => {
        if (!watcher || watcher.closed) {
            return;
        }
        if (osXFsWatch) {
            usedWatchers.push(watcher);
        } else {
            watcher.close();
        }
    };

    before(async () => {
        rootFixtures = await adone.fs.Directory.createTmp();
    });

    after("restroring the cwd", async () => {
        process.chdir(originalcwd);
        await rootFixtures.unlink();
    });

    beforeEach("preparing the fixtures directory for a test", async () => {
        fixtures = await adone.fs.Directory.createTmp({ dir: rootFixtures.path() });
        process.chdir(fixtures.path());
        await Promise.all([
            fixtures.addFile("change.txt", { content: "b" }),
            fixtures.addFile("unlink.txt", { content: "b" })
        ]);
        await sleep();
    });

    afterEach("cleaning the fixtures", () => {
        return fixtures.clean();
    });

    afterEach("dispatching all watchers", async () => {
        disposeWatcher(watcher);
        disposeWatcher(watcher2);
        await sleep();
    });

    this.timeout(120000);
    it("should expose public API methods", async () => {
        expect(Watcher).to.be.a("class");
        expect(watch).to.be.a("function");
        await sleep();
    });

    const runTests = (baseopts) => {
        baseopts.persistent = true;

        before(() => {
            // flags for bypassing special-case test failures on CI
            osXFsWatch = os === "darwin" && !baseopts.usePolling && !baseopts.useFsEvents;
            win32Polling = os === "win32" && baseopts.usePolling;

            if (osXFsWatch) {
                slowerDelay = 200;
            } else {
                slowerDelay = undefined;
            }
        });

        after("closing the watchers", closeWatchers);

        beforeEach("setiing up the options", function clean() {
            options = {};
            Object.keys(baseopts).forEach((key) => {
                options[key] = baseopts[key];
            });
        });

        const stdWatcher = () => watcher = watch(fixtures.path(), options);

        describe("watch a directory", () => {
            let readySpy;
            let rawSpy;
            beforeEach(() => {
                options.ignoreInitial = true;
                options.alwaysStat = true;
                readySpy = spy();
                rawSpy = spy();
                stdWatcher().on("ready", readySpy).on("raw", rawSpy);
            });

            afterEach(async () => {
                if (readySpy.callCount === 0) {
                    await readySpy.waitForCall();
                }
                rawSpy = undefined;
            });

            it("should produce an instance of fs.Watcher", async () => {
                expect(watcher).to.be.instanceof(Watcher);
                await sleep();
            });

            it("should expose public API methods", async () => {
                expect(watcher.on).to.be.a("function");
                expect(watcher.emit).to.be.a("function");
                expect(watcher.add).to.be.a("function");
                expect(watcher.close).to.be.a("function");
                expect(watcher.getWatched).to.be.a("function");
                await sleep();
            });

            it("should emit `add` event when file was added", async () => {
                const file = fixtures.getVirtualFile("add.txt");
                const testFile = fixtures.getVirtualFile("add.txt");
                const add = spy();
                watcher.on("add", add);
                if (readySpy.callCount === 0) {
                    await readySpy.waitForCall();
                }
                await sleep();
                const [, meta] = await Promise.all([
                    file.write(Date.now()),
                    add.waitForCall()
                ]);
                expect(meta.args[0]).to.be.equal(testFile.path());
                expect(meta.args[1]).to.be.ok;  // stats
                expect(rawSpy.callCount).not.to.be.equal(0);
            });

            it("should emit `addDir` event when directory was added", async () => {
                const dir = fixtures.getVirtualDirectory("subdir");
                const addDir = spy();
                watcher.on("addDir", addDir);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                expect(addDir.callCount).to.be.equal(0);
                const [, meta] = await Promise.all([
                    dir.create(),
                    addDir.waitForCall()
                ]);
                expect(meta.args[0]).to.be.equal(dir.path());
                expect(meta.args[1]).to.be.ok;  // stats
                expect(rawSpy.callCount).not.to.be.equal(0);
            });

            it("should emit `change` event when file was changed", async () => {
                const file = fixtures.getVirtualFile("change.txt");
                const change = spy();
                watcher.on("change", change);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();

                const [, meta] = await Promise.all([
                    file.write(Date.now()),
                    change.waitForCall()
                ]);
                expect(meta.args[0]).to.be.equal(file.path());
                expect(meta.args[1]).to.be.ok;  // stats
                expect(rawSpy.callCount).not.to.be.equal(0);
                expect(change.callCount).to.be.equal(1);
            });

            it("should emit `unlink` event when file was removed", async () => {
                const unlink = spy();
                const file = fixtures.getVirtualFile("unlink.txt");

                watcher.on("unlink", unlink);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                expect(unlink.callCount).to.be.equal(0);

                const [, meta] = await Promise.all([
                    file.unlink(),
                    unlink.waitForCall()
                ]);

                expect(meta.args[0]).to.be.equal(file.path());
                expect(meta.args[1]).not.to.be.ok;  // no stats
                expect(rawSpy.callCount).not.be.equal(0);
                expect(unlink.callCount).to.be.equal(1);
            });

            it("should emit `unlinkDir` event when a directory was removed", async () => {
                const testDir = await fixtures.addDirectory("subdir");
                const unlinkDir = spy();
                watcher.on("unlinkDir", unlinkDir);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                const [, meta] = await Promise.all([
                    testDir.unlink(),
                    unlinkDir.waitForCall()
                ]);
                expect(meta.args[0]).to.be.equal(testDir.path());
                expect(meta.args[1]).not.to.be.ok;  // no stats
                expect(rawSpy.callCount).not.to.be.equal(0);
                expect(unlinkDir.callCount).to.be.equal(1);
            });

            it("should emit `unlink` and `add` events when a file is renamed", async () => {
                const unlink = spy();
                const add = spy();
                const testFile = fixtures.getVirtualFile("change.txt");
                const newFile = fixtures.getVirtualFile("moved.txt");

                watcher.on("unlink", unlink).on("add", add);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                expect(unlink.callCount).to.be.equal(0);
                expect(add.callCount).to.be.equal(0);
                await sleep(1000);
                const testPath = testFile.path();
                const [, unlinkMeta, addMeta] = await Promise.all([
                    testFile.rename(newFile),
                    unlink.waitForCall(),
                    add.waitForCall()
                ]);
                expect(unlinkMeta.args[0]).to.be.equal(testPath);
                expect(unlinkMeta.args[1]).not.to.be.ok;  // no stats
                expect(add.callCount).to.be.equal(1);
                expect(addMeta.args[0]).to.be.equal(newFile.path());
                expect(addMeta.args[1]).to.be.ok;  // stats
                expect(rawSpy.callCount).not.to.be.equal(0);
                if (!osXFsWatch) {
                    expect(unlink.callCount).to.be.equal(1);
                }
            });

            it("should emit `add`, not `change`, when previously deleted file is re-added", async () => {
                const unlink = spy();
                const add = spy();
                const change = spy();
                const testFile = await fixtures.addFile("add.txt", { content: "hello" });
                watcher.on("unlink", unlink).on("add", add).on("change", change);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                expect(unlink.callCount).to.be.equal(0);
                expect(add.callCount).to.be.equal(0);
                expect(change.callCount).to.be.equal(0);
                const [, unlinkMeta] = await Promise.all([
                    testFile.unlink(),
                    unlink.waitForArgs(testFile.path())
                ]);
                expect(unlinkMeta.args[0]).to.be.equal(testFile.path());
                await sleep();
                const [, addMeta] = await Promise.all([
                    testFile.write(Date.now()),
                    add.waitForArg(0, testFile.path())
                ]);
                expect(addMeta.args[0]).to.be.equal(testFile.path());
                expect(change.callCount).to.be.equal(0);
            });

            it("should not emit `unlink` for previously moved files", async () => {
                const unlink = spy();
                const testFile = await fixtures.addFile("change.txt");
                const newFile1 = await fixtures.addFile("moved.txt");
                const newFile2 = await fixtures.addFile("moved-again.txt");
                watcher.on("unlink", unlink);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                const testPath = testFile.path();
                await Promise.all([
                    testFile.rename(newFile1)
                        .then(() => sleep(300))
                        .then(() => testFile.rename(newFile2)),
                    unlink.waitForArg(0, newFile1.path())
                ]);

                expect(unlink.callCount).to.be.equal(2);
                expect(unlink.getCall(0).args[0]).to.be.equal(testPath);
                expect(unlink.getCall(1).args[0]).to.be.equal(newFile1.path());
            });

            it("should survive ENOENT for missing subdirectories", async () => {
                const testDir = fixtures.getVirtualFile("notadir");
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                watcher.add(testDir.path());
                await sleep();
            });

            it("should notice when a file appears in a new directory", async () => {
                const add = spy();
                const testDir = fixtures.getVirtualDirectory("subdir");
                const testFile = fixtures.getVirtualFile("subdir", "add.txt");
                watcher.on("add", add);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                expect(add.callCount).to.be.equal(0);
                await sleep();
                await Promise.all([
                    testDir.create().then(() => testFile.write(Date.now())),
                    add.waitForCall()
                ]);
                expect(add.callCount).to.be.equal(1);
                expect(add.getCall(0).args[0]).to.be.equal(testFile.path());
                expect(add.getCall(0).args[1]).to.be.ok;  // stats
                expect(rawSpy.callCount).not.to.be.equal(0);
            });

            it("should watch removed and re-added directories", async () => {
                const unlinkDir = spy();
                const addDir = spy();
                const parentDir = fixtures.getVirtualDirectory("subdir2");
                const subDir = fixtures.getVirtualDirectory("subdir2", "subsub");
                watcher.on("unlinkDir", unlinkDir).on("addDir", addDir);
                if (!readySpy.callCount) {
                    await readySpy.waitForCall();
                }
                await sleep();
                await Promise.all([
                    parentDir.create()
                        .then(() => sleep(10000))
                        .then(() => parentDir.unlink()),
                    unlinkDir.waitForArg(0, parentDir.path())
                ]);
                expect(unlinkDir.callCount).to.be.equal(1);
                expect(unlinkDir.getCall(0).args[0]).to.be.equal(parentDir.path());
                await Promise.all([
                    parentDir.create()
                        .then(() => sleep(10000))
                        .then(() => subDir.create()),
                    addDir.waitForNCalls(2)
                ]);
                expect(addDir.getCall(1).args[0]).to.be.equal(parentDir.path());
                expect(addDir.getCall(2).args[0]).to.be.equal(subDir.path());
            });
        });

        describe("watch individual files", () => {
            before(closeWatchers);

            it("should detect changes", async () => {
                const testFile = fixtures.getVirtualFile("change.txt");
                const change = spy();
                const ready = spy();
                watcher = watch(testFile.path(), options)
                    .on("change", change)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    testFile.write(Date.now()),
                    change.waitForCall()
                ]);
                for (let i = 0; i < change.callCount; ++i) {
                    expect(change.getCall(i).args[0]).to.be.equal(testFile.path());
                }
            });

            it("should detect unlinks", async () => {
                const testFile = fixtures.getVirtualFile("unlink.txt");
                const unlink = spy();
                const ready = spy();
                watcher = watch(testFile.path(), options)
                    .on("unlink", unlink)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    sleep().then(() => testFile.unlink()),
                    unlink.waitForCall()
                ]);
                expect(unlink.callCount).to.be.equal(1);
                expect(unlink.getCall(0).args[0]).to.be.equal(testFile.path());
                await sleep();  // the directory is going to be watched
            });

            it("should detect unlink and re-add", async () => {
                options.ignoreInitial = true;
                const unlink = spy();
                const add = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("unlink.txt");
                watcher = watch(file.path(), options)
                    .on("unlink", unlink)
                    .on("add", add)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    sleep().then(() => file.unlink()),
                    unlink.waitForCall()
                ]);

                expect(unlink.callCount).to.be.equal(1);
                expect(unlink.getCall(0).args[0]).to.be.equal(file.path());
                await sleep();
                await Promise.all([
                    sleep().then(() => file.write("re-added")),
                    add.waitForCall()
                ]);

                expect(add.callCount).to.be.equal(1);
                expect(add.getCall(0).args[0]).to.be.equal(file.path());
            });

            it("should ignore unwatched siblings", async () => {
                const all = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("add.txt");
                const sibling = fixtures.getVirtualFile("change.txt");
                watcher = watch(file.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    sibling.write(Date.now()),
                    file.write(Date.now()),
                    all.waitForCall()
                ]);
                expect(all.callCount).to.be.equal(1);
                expect(all.getCall(0).args[0]).to.be.equal("add");
                expect(all.getCall(0).args[1]).to.be.equal(file.path());
            });
        });

        describe("renamed directory", () => {
            it("should emit `add` for a file in a renamed directory", async () => {
                options.ignoreInitial = true;
                const dir = await fixtures.addDirectory("subdir");
                await dir.addFile("add.txt", { content: Date.now() });
                const add = spy();
                const ready = spy();

                watcher = watch(fixtures.path(), options)
                    .on("add", add)
                    .on("ready", ready);

                await ready.waitForCall();
                await sleep();

                await Promise.all([
                    sleep(1000).then(() => dir.rename("subdir-renamed")),
                    add.waitForCall()
                ]);

                expect(add.callCount).to.be.equal(1);
                expect(add.getCall(0).args[0]).to.be.equal(dir.getVirtualFile("add.txt").path());
            });
        });

        describe("watch non-existent paths", () => {
            it("should watch non-existent file and detect add", async () => {
                const add = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("add.txt");
                watcher = watch(file.path(), options)
                    .on("add", add)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    sleep().then(() => file.write(Date.now())),
                    add.waitForCall()
                ]);
                expect(add.callCount).to.be.equal(1);
                expect(add.getCall(0).args[0]).to.be.equal(file.path());
            });

            it("should watch non-existent dir and detect addDir/add", async () => {
                const all = spy();
                const ready = spy();
                const dir = fixtures.getVirtualDirectory("subdir");
                const file = dir.getVirtualFile("add.txt");
                watcher = watch(dir.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(0);
                await Promise.all([
                    sleep()
                        .then(() => dir.create())
                        .then(() => sleep())
                        .then(() => file.write("hello"))
                        .then(() => sleep()),
                    all.waitForArg(0, "add")
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["addDir", dir.path()]);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["add", file.path()]);
            });
        });

        describe("watch glob patterns", () => {
            before(closeWatchers);

            it("should correctly watch and emit based on glob input", async () => {
                const all = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("*a*.txt");
                const addFile = fixtures.getVirtualFile("add.txt");
                const changeFile = fixtures.getVirtualFile("change.txt");
                watcher = watch(file.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(1);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", changeFile.path()]);
                await Promise.all([
                    sleep()
                        .then(() => addFile.write(Date.now()))
                        .then(() => sleep())
                        .then(() => changeFile.write(Date.now()))
                        .then(() => sleep()),
                    all.waitForNCalls(2)
                ]);
                expect(all.callCount).to.be.equal(3);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["add", addFile.path()]);
                expect(all.getCall(2).args.slice(0, 2)).to.be.deep.equal(["change", changeFile.path()]);
            });

            it("should respect negated glob patterns", async () => {
                const all = spy();
                const ready = spy();
                const test = fixtures.getVirtualFile("*");
                const negated = `!${fixtures.getVirtualFile("*a*.txt").path()}`;
                const unlink = fixtures.getVirtualFile("unlink.txt");
                watcher = watch([test.path(), negated], options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(1);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", unlink.path()]);
                await Promise.all([
                    sleep().then(() => unlink.unlink()).then(() => sleep()),
                    all.waitForArg(0, "unlink")
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["unlink", unlink.path()]);
            });

            it("should traverse subdirs to match globstar patterns", async () => {
                await fixtures.clean();
                await FS.createStructure(fixtures, [
                    ["inner", [
                        ["one_more", [
                            "change.txt",
                            "unlink.txt"
                        ]]
                    ]]
                ]);
                const fix = await fixtures.get("inner", "one_more");
                const watchPath = adone.std.path.join(
                    fixtures.path(), "inner", "one_more", "..", "..", "inn*", "*more", "**", "a*.txt"
                );
                const subdir = await fix.addDirectory("subdir");
                const subsub = await subdir.addDirectory("subsub");
                const a = await subdir.addFile("a.txt", { content: "b" });
                const b = await subdir.addFile("b.txt", { content: "b" });
                const ab = await subsub.addFile("ab.txt", { content: "b" });
                const add = fix.getVirtualFile("add.txt");

                const all = spy();
                const ready = spy();

                watcher = watch(watchPath, options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                all.reset();
                await Promise.all([
                    sleep(100)
                        .then(() => add.write(Date.now()))
                        .then(() => sleep(100))
                        .then(() => ab.write(Date.now()))
                        .then(() => sleep(100))
                        .then(() => a.unlink())
                        .then(() => sleep(100))
                        .then(() => b.unlink())
                        .then(() => sleep()),
                    all.waitForArg(0, "unlink"),
                    all.waitForArg(0, "change"),
                    all.waitFor(() => {
                        let i = 0;
                        return ({ args }) => {
                            console.log(args[0], args[1]);
                            if (args[0] === "add") {
                                ++i;
                            }
                            return i === 1;
                        };
                    })
                ]);
                expect(all.callCount).to.be.equal(3);  // add "add", change "ab", unlink "a"
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", add.path()]);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["change", ab.path()]);
                expect(all.getCall(2).args.slice(0, 2)).to.be.deep.equal(["unlink", a.path()]);
            });

            it("should resolve relative paths with glob patterns", async () => {
                await fixtures.clean();
                await FS.createStructure(fixtures, [
                    ["inner", [
                        ["one_more", [
                            "unlink.txt",
                            "change.txt"
                        ]]
                    ]]
                ]);
                const fix = await fixtures.get("inner", "one_more");

                const all = spy();
                const ready = spy();
                const watchPath = fix.getVirtualFile("*a*.txt").relativePath(fixtures);
                const add = fix.getVirtualFile("add.txt");
                const change = fix.getVirtualFile("change.txt");
                watcher = watch(watchPath, options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(1);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", change.relativePath(fixtures)]);
                all.reset();
                await Promise.all([
                    sleep()
                        .then(() => add.write(Date.now()))
                        .then(() => sleep())
                        .then(() => change.write(Date.now()))
                        .then(() => sleep()),
                    all.waitForNCalls(2),
                    all.waitFor(({ args }) => {
                        return args[0] === "add" && args[1] === add.relativePath(fixtures);
                    })
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", add.relativePath(fixtures)]);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["change", change.relativePath(fixtures)]);
            });

            it("should correctly handle conflicting glob patterns", async () => {
                const all = spy();
                const ready = spy();
                const change = fixtures.getVirtualFile("change.txt");
                const unlink = fixtures.getVirtualFile("unlink.txt");
                const add = fixtures.getVirtualFile("add.txt");
                const watchPaths = [
                    fixtures.getVirtualFile("change*").path(),
                    fixtures.getVirtualFile("unlink*").path()
                ];
                watcher = watch(watchPaths, options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(2);
                expect(all).to.have.been.calledWith("add", change.path());
                expect(all).to.have.been.calledWith("add", unlink.path());
                all.reset();
                await Promise.all([
                    sleep()
                        .then(() => add.write(Date.now()))
                        .then(() => sleep())
                        .then(() => change.write(Date.now()))
                        .then(() => sleep())
                        .then(() => unlink.unlink())
                        .then(() => sleep()),
                    all.waitForNCalls(2),
                    all.waitForArg(0, "unlink")
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["change", change.path()]);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["unlink", unlink.path()]);
            });

            it("should correctly handle intersecting glob patterns", async () => {
                const all = spy();
                const ready = spy();
                const change = fixtures.getVirtualFile("change.txt");
                const watchPaths = [
                    fixtures.getVirtualFile("cha*").path(),
                    fixtures.getVirtualFile("*nge.*").path()
                ];
                watcher = watch(watchPaths, options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all.callCount).to.be.equal(1);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", change.path()]);
                await Promise.all([
                    sleep().then(() => change.write(Date.now())).then(() => sleep()),
                    all.waitForCall()
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["change", change.path()]);
            });

            it("should not confuse glob-like filenames with globs", async () => {
                const all = spy();
                const ready = spy();
                const file = await fixtures.addFile("nota[glob].txt", { content: "b" });
                await sleep();
                stdWatcher()
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep(0);
                expect(all).to.have.been.calledWith("add", file.path());
                await Promise.all([
                    sleep().then(() => file.write(Date.now())).then(() => sleep()),
                    all.waitForArgs("change", file.path())
                ]);
            });

            it("should not prematurely filter dirs against complex globstar patterns", async () => {
                await fixtures.clean();
                await FS.createStructure(fixtures, [
                    ["inner", [
                        ["one_more", [
                            "unlink.txt",
                            "change.txt"
                        ]]
                    ]]
                ]);
                const fix = fixtures.getVirtualDirectory("inner", "one_more");
                const deepFile = await fix.addFile("sibdir", "subsub", "subsubsub", "a.txt", { content: "b" });
                const watchPath = adone.std.path.join(fix.path(), "..", "..", "in*er", "one*more", "**", "subsubsub", "*.txt");
                const all = spy();
                const ready = spy();
                watcher = watch(watchPath, options)
                    .on("all", all)
                    .on("ready", ready);

                await Promise.all([
                    sleep().then(() => deepFile.write(Date.now())).then(() => sleep()),
                    await all.waitForNCalls(2)
                ]);
                expect(all.callCount).to.be.equal(2);
                expect(all.getCall(0).args.slice(0, 2)).to.be.deep.equal(["add", deepFile.path()]);
                expect(all.getCall(1).args.slice(0, 2)).to.be.deep.equal(["change", deepFile.path()]);
            });

            it("should emit matching dir events", async () => {
                const watchPaths = [
                    fixtures.getVirtualFile("*").path(),
                    fixtures.getVirtualFile("subdir/subsub/**/*").path()
                ];
                await fixtures.addDirectory("subdir", "subsub");
                const deepDir = fixtures.getVirtualDirectory("subdir", "subsub", "subsubsub");
                const deepFile = deepDir.getVirtualFile("a.txt");
                const all = spy();
                const ready = spy();
                watcher = watch(watchPaths, options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all).to.have.been
                    .calledWith("addDir", fixtures.getVirtualDirectory("subdir").path());
                all.reset();
                await Promise.all([
                    sleep().then(() => deepDir.create())
                        .then(() => deepFile.write(Date.now()))
                        .then(() => sleep()),
                    all.waitForArgs("addDir", deepDir.path()),
                    all.waitForArgs("add", deepFile.path())
                ]);
                expect(all.callCount).to.be.equal(2);
                await Promise.all([
                    sleep().then(() => deepDir.unlink()),
                    all.waitForArgs("unlinkDir", deepDir.path())
                ]);
            });
        });

        describe("watch symlinks", () => {
            if (os === "win32") {
                return;  // have to have root permissions
            }

            before(closeWatchers);

            let linkedDir;
            let subdir;
            let addFile;

            beforeEach(async () => {
                linkedDir = await fixtures.symbolicLink(adone.std.path.resolve(fixtures.path(), "..", `${fixtures.filename()}-link`));
                subdir = await fixtures.addDirectory("subdir");
                addFile = await subdir.addFile("add.txt");
            });

            it("should watch symlinked dirs", async () => {
                const addDir = spy();
                const add = spy();
                const ready = spy();
                watcher = watch(linkedDir.path(), options)
                    .on("addDir", addDir)
                    .on("add", add)
                    .on("ready", ready);
                await ready.waitForCall();
                expect(addDir).to.have.been.calledWith(linkedDir.path());
                expect(add).to.have.been.calledWith(linkedDir.getVirtualFile("change.txt").path());
                expect(add).to.have.been.calledWith(linkedDir.getVirtualFile("unlink.txt").path());
            });

            it("should watch symlinked files", async () => {
                const all = spy();
                const ready = spy();
                const change = fixtures.getVirtualFile("change.txt");
                const link = await change.symbolicLink(fixtures.getVirtualFile("link.txt"));
                watcher = watch(link.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                expect(all).to.have.been.calledWith("add", link.path());
                await sleep();
                await Promise.all([
                    change.write(Date.now()),
                    all.waitForArgs("change", link.path())
                ]);
            });

            it("should follow symlinked files within a normal dir", async () => {
                const all = spy();
                const ready = spy();
                const change = fixtures.getVirtualFile("change.txt");
                const link = await change.symbolicLink(subdir.getVirtualFile("link.txt"));
                watcher = watch(subdir.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                expect(all).to.have.been.calledWith("add", link.path());
                await sleep();
                await Promise.resolve([
                    change.write(Date.now()),
                    all.waitForArgs("change", link.path())
                ]);
            });

            it("should watch paths with a symlinked parent", async () => {
                const all = spy();
                const ready = spy();
                const dir = linkedDir.getVirtualDirectory("subdir");
                const file = dir.getVirtualFile("add.txt");
                watcher = watch(dir.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                expect(all).to.have.been.calledWith("addDir", dir.path());
                expect(all).to.have.been.calledWith("add", file.path());
                await sleep();
                await Promise.all([
                    addFile.write(Date.now()),
                    all.waitForArgs("change", file.path())
                ]);
            });

            it("should not recurse indefinitely on circular symlinks", async () => {
                await fixtures.symbolicLink(fixtures.getVirtualDirectory("subdir", "circular"));
                const ready = spy();
                stdWatcher().on("ready", ready);
                await ready.waitForCall();
            });

            it("should recognize changes following symlinked dirs", async () => {
                const change = spy();
                const ready = spy();
                watcher = watch(linkedDir.path(), options)
                    .on("change", change)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                const linkedFile = linkedDir.getVirtualFile("change.txt");
                await Promise.all([
                    fixtures.getVirtualFile("change.txt").write(Date.now()),
                    change.waitForArgs(linkedFile.path())
                ]);
            });

            it("should follow newly created symlinks", async () => {
                options.ignoreInitial = true;
                const all = spy();
                const ready = spy();
                stdWatcher()
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                const sublink = fixtures.getVirtualDirectory("link");
                await Promise.all([
                    sleep().then(() => subdir.symbolicLink(sublink)),
                    all.waitForArgs("add", sublink.getVirtualFile("add.txt").path()),
                    all.waitForArgs("addDir", sublink.path())
                ]);
            });

            it("should watch symlinks as files when followSymlinks:false", async () => {
                options.followSymlinks = false;
                const all = spy();
                const ready = spy();
                watcher = watch(linkedDir.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                expect(all.callCount).to.be.equal(1);
                expect(all).not.to.have.been.calledWith("addDir");
                expect(all).to.have.been.calledWith("add", linkedDir.path());
            });

            it("should watch symlinks within a watched dir as files when followSymlinks:false", async () => {
                options.followSymlinks = false;
                const all = spy();
                const ready = spy();
                const link = await subdir.symbolicLink(fixtures.getVirtualDirectory("link"));
                stdWatcher().on("all", all).on("ready", ready);


                await Promise.all([
                    sleep(options.usePolling ? 1200 : 300).then(() => Promise.all([
                        addFile.write(Date.now()),
                        link.unlink().then(() => addFile.symbolicLink(link.path()))
                    ])).then(() => sleep()),
                    all.waitForArgs("change", link.path()),
                    all.waitForArgs("add", link.path())
                ]);
                expect(all).not.to.have.been.calledWith("addDir", link.path());
                expect(all).not.to.have.been.calledWith("add", link.getVirtualFile("add.txt").path());
            });

            it("should not reuse watcher when following a symlink to elsewhere", async () => {
                const linked = await fixtures.addDirectory("outside");
                const linkedFile = await linked.addFile("text.txt");
                const link = await linked.symbolicLink(subdir.getVirtualDirectory("subsub"));

                const ready2 = spy();
                watcher2 = watch(subdir.path(), options)
                    .on("ready", ready2);
                await ready2.waitForCall();
                await sleep(options.usePolling ? 900 : undefined);
                const watched = link.getVirtualFile("text.txt");
                const all = spy();
                const ready = spy();
                watcher = watch(watched.path(), options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep(options.usePolling ? 900 : undefined);
                await Promise.all([
                    linkedFile.write(Date.now()),
                    all.waitForArgs("change", watched.path())
                ]);
            });

            it("should properly match glob patterns that include a symlinked dir", async () => {
                const addDir = spy();
                const add = spy();
                const ready = spy();
                // test with relative path to ensure proper resolution
                const watchDir = adone.std.path.relative(process.cwd(), linkedDir.path());
                watcher = watch(adone.std.path.join(watchDir, "**/*"), options)
                    .on("addDir", addDir)
                    .on("add", add)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                // only the children are matched by the glob pattern, not the link itself
                expect(add).to.have.been.calledWith(adone.std.path.join(watchDir, "change.txt"));
                expect(add.callCount).to.be.equal(3);  // also unlink.txt & subdir/add.txt
                expect(addDir).to.have.been.calledWith(adone.std.path.join(watchDir, "subdir"));
                const addFile = linkedDir.getVirtualFile("add.txt");
                await Promise.all([
                    addFile.write(Date.now()),
                    add.waitForArgs(addFile.relativePath(process.cwd()))
                ]);
            });
        });

        describe("watch arrays of paths/globs", () => {
            before(closeWatchers);

            it("should watch all paths in an array", async () => {
                const all = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("change.txt");
                const dir = await fixtures.addDirectory("subdir");
                watcher = watch([dir.path(), file.path()], options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all).to.have.been.calledWith("add", file.path());
                expect(all).to.have.been.calledWith("add", file.path());
                expect(all).to.have.been.calledWith("addDir", dir.path());
                expect(all).not.to.have.been.calledWith("add", fixtures.getVirtualFile("unlink.txt").path());

                await Promise.all([
                    file.write(Date.now()),
                    all.waitForArgs("change", file.path())
                ]);
            });

            it("should accommodate nested arrays in input", async () => {
                const all = spy();
                const ready = spy();
                const file = fixtures.getVirtualFile("change.txt");
                const dir = await fixtures.addDirectory("subdir");

                watcher = watch([[dir.path()], [file.path()]], options)
                    .on("all", all)
                    .on("ready", ready);
                await ready.waitForCall();
                await sleep();
                expect(all).to.have.been.calledWith("add", file.path());
                expect(all).to.have.been.calledWith("addDir", dir.path());
                expect(all).not.to.have.been.calledWith("add", fixtures.getVirtualFile("unlink.txt").path());

                await Promise.all([
                    file.write(Date.now()).then(() => sleep()),
                    all.waitForArgs("change", file.path())
                ]);
            });

            it("should throw if provided any non-string paths", async () => {
                expect(watch.bind(null, [[fixtures.path()], /notastring/])).to.throw(TypeError, /non-string/i);
                await sleep();
            });
        });

        describe("watch options", () => {
            before(closeWatchers);

            describe("ignoreInitial", () => {
                describe("false", () => {
                    beforeEach(() => {
                        options.ignoreInitial = false;
                    });

                    it("should emit `add` events for preexisting files", async () => {
                        const add = spy();
                        const ready = spy();
                        watcher = watch(fixtures.path(), options)
                            .on("add", add)
                            .on("ready", ready);
                        await ready.waitForCall();
                        expect(add.callCount).to.be.equal(2);
                    });

                    it("should emit `addDir` event for watched dir", async () => {
                        const addDir = spy();
                        const ready = spy();
                        watcher = watch(fixtures.path(), options)
                            .on("addDir", addDir)
                            .on("ready", ready);
                        await ready.waitForCall();
                        expect(addDir.callCount).to.be.equal(1);
                        expect(addDir.getCall(0).args[0]).to.be.equal(fixtures.path());
                    });

                    it("should emit `addDir` events for preexisting dirs", async () => {
                        const addDir = spy();
                        const ready = spy();
                        const subdir = await fixtures.addDirectory("subdir");
                        const subsub = await subdir.addDirectory("subsub");
                        watcher = watch(fixtures.path(), options)
                            .on("addDir", addDir)
                            .on("ready", ready);
                        await ready.waitForCall();
                        expect(addDir.callCount).to.be.equal(3);
                        expect(addDir).to.have.been.calledWith(fixtures.path());
                        expect(addDir).to.have.been.calledWith(subdir.path());
                        expect(addDir).to.have.been.calledWith(subsub.path());
                    });
                });

                describe("true", () => {
                    beforeEach(() => {
                        options.ignoreInitial = true;
                    });
                    it("should ignore inital add events", async () => {
                        const add = spy();
                        const ready = spy();
                        stdWatcher()
                            .on("add", add)
                            .on("ready", ready);
                        await ready.waitForCall();
                        expect(add.callCount).to.be.equal(0);
                    });
                    it("should ignore add events on a subsequent .add()", async () => {
                        const add = spy();
                        const ready = spy();

                        watcher = watch(fixtures.getVirtualDirectory("subdir").path(), options)
                            .on("add", add)
                            .on("ready", ready);
                        watcher.add(fixtures.path());
                        await sleep(1000);
                        expect(add.callCount).to.be.equal(0);
                    });
                    it("should notice when a file appears in an empty directory", async () => {
                        const add = spy();
                        const ready = spy();
                        const dir = fixtures.getVirtualDirectory("subdir");
                        const file = fixtures.getVirtualFile("subdir", "add.txt");
                        stdWatcher().on("add", add).on("ready", ready);
                        await ready.waitForCall();
                        await sleep();
                        expect(add.callCount).to.be.equal(0);
                        await Promise.all([
                            dir.create().then(() => file.write(Date.now())).then(() => sleep()),
                            add.waitForCall()
                        ]);
                        expect(add.callCount).to.be.equal(1);
                        expect(add.getCall(0).args[0]).to.be.equal(file.path());
                    });
                    it("should emit a change on a preexisting file as a change", async () => {
                        const all = spy();
                        const ready = spy();
                        const file = fixtures.getVirtualFile("change.txt");

                        stdWatcher().on("all", all).on("ready", ready);
                        await ready.waitForCall();
                        expect(all.callCount).to.be.equal(0);
                        await Promise.all([
                            file.write(Date.now()),
                            all.waitForArgs("change", file.path())
                        ]);
                        expect(all).not.to.have.been.calledWith("add");
                    });
                    it("should not emit for preexisting dirs when depth is 0", async () => {
                        options.depth = 0;
                        const all = spy();
                        const ready = spy();
                        const file = fixtures.getVirtualFile("add.txt");
                        await fixtures.addDirectory("subdir");
                        stdWatcher().on("all", all).on("ready", ready);
                        await ready.waitForCall();
                        await sleep(200);
                        await Promise.all([
                            file.write(Date.now()).then(() => sleep()),
                            all.waitForCall()
                        ]);
                        expect(all).to.have.been.calledWith("add", file.path());
                        expect(all).not.to.have.been.calledWith("addDir");
                    });
                });
            });

            describe("ignored", () => {
                it("should check ignore after stating", async () => {
                    const subdir = await fixtures.addDirectory("subdir");
                    options.ignored = (path, stats) => {
                        if (subdir.normalizedPath() === path ||
                            subdir.path() === path || !stats) {
                            return false;
                        }
                        return stats.isDirectory();
                    };
                    const file = await subdir.addFile("add.txt");
                    const subsub = await subdir.addDirectory("subsub");
                    await subsub.addFile("ab.txt");
                    const add = spy();
                    const ready = spy();
                    watcher = watch(subdir.path(), options)
                        .on("add", add)
                        .on("ready", ready);
                    await ready.waitForCall();
                    expect(add.callCount).to.be.equal(1);
                    expect(add.getCall(0).args[0]).to.be.equal(file.path());
                });

                it("should not choke on an ignored watch path", (done) => {
                    options.ignored = function () {
                        return true;
                    };
                    stdWatcher().on("ready", done);
                });

                it("should ignore the contents of ignored dirs", async () => {
                    const all = spy();
                    const ready = spy();
                    const dir = await fixtures.addDirectory("subdir");
                    const file = await dir.addFile("add.txt");
                    options.ignored = dir.path();
                    watcher = watch(fixtures.path(), options)
                        .on("all", all)
                        .on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await file.write(Date.now());
                    await sleep(300);
                    expect(all).not.to.have.been.calledWith("addDir", dir.path());
                    expect(all).not.to.have.been.calledWith("add", file.path());
                    expect(all).not.to.have.been.calledWith("change", file.path());
                });

                it("should allow regex/fn ignores", async () => {
                    options.cwd = fixtures.path();
                    options.ignored = /add/;
                    const all = spy();
                    const ready = spy();
                    await fixtures.addFile("add.txt");
                    watcher = watch(fixtures.path(), options)
                        .on("all", all)
                        .on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        fixtures.getVirtualFile("add.txt").write(Date.now()).then(() => sleep()),
                        fixtures.getVirtualFile("change.txt").write(Date.now()).then(() => sleep()),
                        all.waitForArgs("change", "change.txt")
                    ]);
                    expect(all).not.to.have.been.calledWith("add", "add.txt");
                    expect(all).not.to.have.been.calledWith("change", "add.txt");
                    expect(all).to.have.been.calledWith("add", "change.txt");
                    expect(all).to.have.been.calledWith("change", "change.txt");
                });
            });

            describe("depth", () => {
                let subdir;
                let addFile;
                let subsub;

                beforeEach(async () => {
                    subdir = await fixtures.addDirectory("subdir");
                    addFile = await subdir.addFile("add.txt");
                    subsub = await subdir.addDirectory("subsub");
                    await subsub.addFile("ab.txt");
                    await sleep(300);
                });

                it("should not recurse if depth is 0", async () => {
                    options.depth = 0;
                    const all = spy();
                    const ready = spy();
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await addFile.write(Date.now());
                    await sleep();
                    if (!osXFsWatch) {
                        expect(all.callCount).to.be.equal(4);
                    }
                    expect(all).to.have.been.calledWith("addDir", fixtures.path());
                    expect(all).to.have.been.calledWith("addDir", subdir.path());
                    expect(all).to.have.been.calledWith("add", fixtures.getVirtualFile("change.txt").path());
                    expect(all).to.have.been.calledWith("add", fixtures.getVirtualFile("unlink.txt").path());
                    expect(all).not.to.have.been.calledWith("change");
                });

                it("should recurse to specified depth", async () => {
                    options.depth = 1;
                    const all = spy();
                    const ready = spy();
                    const add = fixtures.getVirtualFile("subdir", "add.txt");
                    const change = fixtures.getVirtualFile("change.txt");
                    const ignored = fixtures.getVirtualFile("subdir", "subsub", "ab.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await Promise.all([
                        sleep().then(() => Promise.all([
                            change.write(Date.now()),
                            add.write(Date.now()),
                            ignored.write(Date.now())
                        ])),
                        all.waitForArgs("change", add.path()),
                        all.waitForArgs("change", change.path())
                    ]);
                    expect(all).to.have.been.calledWith("addDir", subsub.path());
                    expect(all).not.to.have.been.calledWith("add", ignored.path());
                    expect(all).not.to.have.been.calledWith("change", ignored.path());
                    if (!osXFsWatch) {
                        expect(all.callCount).to.be.equal(8);
                    }
                });

                it("should respect depth setting when following symlinks", async () => {
                    if (is.windows) {
                        return; // skip on windows
                    }
                    options.depth = 1;
                    const all = spy();
                    const ready = spy();
                    const link = await subdir.symbolicLink(fixtures.getVirtualDirectory("link"));
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    expect(all).to.have.been.calledWith("addDir", link.path());
                    expect(all).to.have.been.calledWith("addDir", link.getVirtualDirectory("subsub").path());
                    expect(all).to.have.been.calledWith("add", link.getVirtualFile("add.txt").path());
                    expect(all).not.to.have.been.calledWith("add", link.getVirtualFile("subsub", "ab.txt").path());
                });

                it("should respect depth setting when following a new symlink", async () => {
                    if (is.windows) {
                        return; // skip on windows
                    }
                    options.depth = 1;
                    options.ignoreInitial = true;
                    const all = spy();
                    const ready = spy();
                    const link = fixtures.getVirtualDirectory("link");
                    const dir = link.getVirtualDirectory("subsub");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        subdir.symbolicLink(link),
                        all.waitForArgs("addDir", link.path()),
                        all.waitForArgs("addDir", dir.path()),
                        all.waitForArgs("add", link.getVirtualFile("add.txt").path())
                    ]);
                    await sleep();
                    expect(all.callCount).to.be.equal(3);
                });

                it("should correctly handle dir events when depth is 0", async () => {
                    options.depth = 0;
                    const all = spy();
                    const ready = spy();
                    const subdir2 = fixtures.getVirtualDirectory("subdir2");

                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();

                    expect(all).to.have.been.calledWith("addDir", fixtures.path());
                    expect(all).to.have.been.calledWith("addDir", subdir.path());
                    await sleep();

                    await Promise.all([
                        subdir2.create(),
                        all.waitForArgs("addDir", subdir2.path())
                    ]);
                    await sleep();
                    await Promise.all([
                        subdir2.unlink(),
                        all.waitForArgs("unlinkDir", subdir2.path())
                    ]);
                });
            });

            describe("atomic", () => {
                beforeEach(() => {
                    options.atomic = true;
                    options.ignoreInitial = true;
                });

                it("should ignore vim/emacs/Sublime swapfiles", async () => {
                    const all = spy();
                    const ready = spy();
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();

                    const vim = await fixtures.addFile(".change.txt.swp", { content: "a" });  // vim
                    const emacs = await fixtures.addFile("add.txt\~", { content: "a" });  // vim/emacs
                    const sublime = await fixtures.addFile(".subl5f4.tmp", { content: "a" });  // sublime

                    await sleep(300);

                    await vim.write("c");
                    await emacs.write("c");
                    await sublime.write("c");

                    await sleep(300);

                    await vim.unlink();
                    await emacs.unlink();
                    await sublime.unlink();

                    await sleep(300);

                    expect(all.callCount).to.be.equal(0);
                });

                it("should ignore stale tilde files", async () => {
                    options.ignoreInitial = false;
                    const all = spy();
                    const ready = spy();
                    const file = await fixtures.addFile("old.txt~", { content: "a" });
                    await sleep();

                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();

                    expect(all).not.to.have.been.calledWith(match.any, file.path());
                    expect(all).not.to.have.been.calledWith(match.any, file.path().slice(0, -1));
                });
            });

            describe("cwd", () => {
                it("should emit relative paths based on cwd", async () => {
                    options.cwd = fixtures.path();
                    const all = spy();
                    const ready = spy();
                    const change = fixtures.getVirtualFile("change.txt");
                    const unlink = fixtures.getVirtualFile("unlink.txt");
                    watcher = watch("**", options).on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    expect(all).to.have.been.calledWith("add", "change.txt");
                    expect(all).to.have.been.calledWith("add", "unlink.txt");
                    await sleep();
                    await Promise.all([
                        change.write(Date.now()).then(() => unlink.unlink()),
                        all.waitForArgs("change", "change.txt"),
                        all.waitForArgs("unlink", "unlink.txt")
                    ]);
                });

                it("should emit `addDir` with alwaysStat for renamed directory", async () => {
                    options.cwd = fixtures.path();
                    options.alwaysStat = true;
                    options.ignoreInitial = true;
                    const subdir = await fixtures.addDirectory("subdir");
                    const ready = spy();
                    watcher = watch(".", options).on("ready", ready);
                    await ready.waitForCall();
                    await sleep(1000);
                    const addDir = spy();
                    watcher.on("addDir", addDir);
                    await Promise.all([
                        subdir.rename("subdir-renamed"),
                        addDir.waitForArgs("subdir-renamed")
                    ]);
                    expect(addDir.callCount).to.be.equal(1);
                    expect(addDir.getCall(0).args[1]).to.be.ok;  // stats
                });

                it("should allow separate watchers to have different cwds", async () => {
                    options.cwd = fixtures.path();
                    const options2 = {};
                    Object.keys(options).forEach((key) => {
                        options2[key] = options[key];
                    });
                    options2.cwd = fixtures.getVirtualDirectory("subdir").path();
                    const all1 = spy();
                    const ready1 = spy();
                    watcher = watch(fixtures.getVirtualDirectory("**").path(), options)
                        .on("all", all1)
                        .on("ready", ready1);
                    await ready1.waitForCall();
                    await sleep();
                    const all2 = spy();
                    const ready2 = spy();
                    watcher2 = watch(fixtures.path(), options2)
                        .on("all", all2)
                        .on("ready", ready2);
                    await ready2.waitForCall();
                    await sleep();
                    const change = fixtures.getVirtualFile("change.txt");
                    const unlink = fixtures.getVirtualFile("unlink.txt");
                    await Promise.all([
                        change.write(Date.now()).then(() => unlink.unlink()).then(() => sleep()),
                        all1.waitForArgs("unlink"),
                        all2.waitForArgs("unlink")
                    ]);
                    expect(all1).to.have.been.calledWith("change", "change.txt");
                    expect(all1).to.have.been.calledWith("unlink", "unlink.txt");
                    expect(all2).to.have.been.calledWith("add", adone.std.path.join("..", "change.txt"));
                    expect(all2).to.have.been.calledWith("add", adone.std.path.join("..", "unlink.txt"));
                    expect(all2).to.have.been.calledWith("change", adone.std.path.join("..", "change.txt"));
                    expect(all2).to.have.been.calledWith("unlink", adone.std.path.join("..", "unlink.txt"));
                });

                it("should ignore files even with cwd", async () => {
                    options.cwd = fixtures.path();
                    options.ignored = "ignored-option.txt";
                    const files = ["*.txt", "!ignored.txt"];
                    const change = fixtures.getVirtualFile("change.txt");
                    const ignored = await fixtures.addFile("ignored.txt");
                    const ignoredOption = await fixtures.addFile("ignored-option.txt");
                    const all = spy();
                    const ready = spy();
                    watcher = watch(files, options).on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();

                    await Promise.all([
                        ignored.write(Date.now()).then(() => ignored.unlink()),
                        ignoredOption.write(Date.now()).then(() => ignoredOption.unlink()),
                        sleep().then(() => change.write("change")).then(() => sleep()),
                        all.waitForArgs("change", "change.txt")
                    ]);
                    expect(all).to.have.been.calledWith("add", "change.txt");
                    expect(all).not.to.have.been.calledWith("add", "ignored.txt");
                    expect(all).not.to.have.been.calledWith("add", "ignored-output.txt");
                    expect(all).not.to.have.been.calledWith("change", "ignored.txt");
                    expect(all).not.to.have.been.calledWith("change", "ignored-output.txt");
                    expect(all).not.to.have.been.calledWith("unlink", "ignored.txt");
                    expect(all).not.to.have.been.calledWith("unlink", "ignored-output.txt");
                });
            });

            describe("ignorePermissionErrors", () => {
                let file;
                beforeEach(async () => {
                    file = await fixtures.addFile("add.txt", { mode: 0o200 });  // owner writing
                    await sleep();
                });

                describe("false", () => {
                    beforeEach(() => {
                        options.ignorePermissionErrors = false;
                    });
                    it("should not watch files without read permissions", async () => {
                        if (is.windows) {
                            return;
                        }
                        const all = spy();
                        const ready = spy();
                        stdWatcher().on("all", all).on("ready", ready);
                        await ready.waitForCall();
                        expect(all).not.to.have.been.calledWith("add", file.path());
                        await sleep(500);
                        await file.write(Date.now());
                        expect(all).not.to.have.been.calledWith("change", file.path());
                    });
                });

                describe("true", () => {
                    beforeEach(() => {
                        options.ignorePermissionErrors = true;
                    });
                    it("should watch unreadable files if possible", async () => {
                        const all = spy();
                        const ready = spy();
                        stdWatcher().on("all", all).on("ready", ready);
                        await ready.waitForCall();
                        expect(all).to.have.been.calledWith("add", file.path());
                        if (!options.useFsEvents) {
                            return;
                        }
                        await sleep();
                        await Promise.all([
                            file.write(Date.now()),
                            all.waitForArgs("change", file.path())
                        ]);
                    });
                    it("should not choke on non-existent files", async () => {
                        const ready = spy();
                        const watcher = watch(fixtures.getVirtualFile("nope.txt").path(), options)
                            .on("ready", ready);
                        await ready.waitForCall();
                        await sleep();
                        watcher.close();
                    });
                });
            });

            describe("awaitWriteFinish", () => {
                beforeEach(() => {
                    options.awaitWriteFinish = { stabilityThreshold: 500 };
                    options.ignoreInitial = true;
                });

                it("should use default options if none given", async () => {
                    options.awaitWriteFinish = true;
                    watcher = stdWatcher();
                    expect(watcher.options.awaitWriteFinish.pollInterval).to.equal(100);
                    expect(watcher.options.awaitWriteFinish.stabilityThreshold).to.equal(2000);
                    await sleep();
                });

                it("should not emit add event before a file is fully written", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        file.write("hello"),
                        all.waitForArgs("add", file.path())
                    ]);
                });

                it("should wait for the file to be fully written before emitting the add event", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await file.write("hello");
                    expect(all.callCount).to.be.equal(0);
                    await all.waitForCall();
                    expect(all).to.have.been.calledWith("add", file.path());
                });

                it("should emit with the final stats", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        file.write("hello ").then(() => adone.std.fs.appendFileSync(file.path(), "world!")).then(() => sleep()),
                        all.waitForCall()
                    ]);
                    expect(all).to.have.been.calledWith("add", file.path(), match((stat) => stat.size === 12));
                });

                it("should not emit change event while a file has not been fully written", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        file.write("hello"),
                        sleep(100)
                            .then(() => file.write("edit"))
                            .then(() => sleep(200))
                    ]);
                    expect(all).not.to.have.been.calledWith("change", file.path());
                });

                it("should not emit change event before an existing file is fully updated", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("change.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await file.write("hello");
                    await sleep(300);
                    expect(all).not.to.have.been.calledWith("change", file.path());
                });

                it("should wait for an existing file to be fully updated before emitting the change event", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("change.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await file.write("hello");
                    await sleep(300);
                    expect(all.callCount).to.be.equal(0);
                    await all.waitForArgs("change", file.path());
                });

                it("should emit change event after the file is fully written", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        sleep().then(() => file.write("hello")),
                        all.waitForArgs("add", file.path())
                    ]);
                    await Promise.all([
                        file.write("edit"),
                        all.waitForArgs("change", file.path())
                    ]);
                });

                it("should not raise any event for a file that was deleted before fully written", async () => {
                    const all = spy();
                    const ready = spy();
                    const file = fixtures.getVirtualFile("add.txt");
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    all.reset();
                    await Promise.all([
                        file.write("hello"),
                        sleep(400)
                            .then(() => Promise.all([
                                file.unlink(),
                                sleep(400)
                            ]))
                    ]);
                    expect(all.callCount).to.be.equal(0);
                });

                it("should be compatible with the cwd option", async () => {
                    const all = spy();
                    const ready = spy();
                    const subdir = await fixtures.addDirectory("subdir");
                    const file = subdir.getVirtualFile("add.txt");
                    options.cwd = file.dirname();
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await Promise.all([
                        sleep(400).then(() => file.write("hello")),
                        all.waitForArgs("add", file.filename())
                    ]);
                });

                it("should still emit initial add events", async () => {
                    options.ignoreInitial = false;
                    const all = spy();
                    const ready = spy();
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    expect(all).to.have.been.calledWith("add");
                    expect(all).to.have.been.calledWith("addDir");
                });

                it("should emit an unlink event when a file is updated and deleted just after that", async () => {
                    const all = spy();
                    const ready = spy();
                    const subdir = await fixtures.addDirectory("subdir");
                    const file = await subdir.addFile("add.txt", { content: "hello" });
                    options.cwd = file.dirname();
                    stdWatcher().on("all", all).on("ready", ready);
                    await ready.waitForCall();
                    await sleep();
                    await file.write("edit");
                    await sleep();
                    await Promise.all([
                        file.unlink(),
                        all.waitForArgs("unlink", file.filename())
                    ]);
                    expect(all).not.to.have.been.calledWith("change", file.filename());
                });
            });
        });

        describe("getWatched", () => {
            before(closeWatchers);

            it("should return the watched paths", async () => {
                const expected = {};
                expected[fixtures.dirname()] = [fixtures.filename()];
                expected[fixtures.path()] = ["change.txt", "unlink.txt"];
                const ready = spy();
                stdWatcher().on("ready", ready);
                await ready.waitForCall();
                expect(watcher.getWatched()).to.deep.equal(expected);
            });

            it("should set keys relative to cwd & include added paths", async () => {
                options.cwd = fixtures.path();
                const expected = {
                    ".": ["change.txt", "subdir", "unlink.txt"],
                    "..": [fixtures.filename()],
                    subdir: []
                };
                await fixtures.addDirectory("subdir");
                const ready = spy();
                stdWatcher().on("ready", ready);
                await ready.waitForCall();
                expect(watcher.getWatched()).to.deep.equal(expected);
            });
        });

        describe("unwatch", () => {
            before(closeWatchers);

            let subdir;

            beforeEach(async () => {
                options.ignoreInitial = true;
                subdir = await fixtures.addDirectory("subdir");
                await sleep();
            });

            it("should stop watching unwatched paths", async () => {
                const all = spy();
                const ready = spy();
                const change = fixtures.getVirtualFile("change.txt");
                const watchPaths = [subdir.path(), change.path()];

                watcher = watch(watchPaths, options).on("all", all).on("ready", ready);
                await ready.waitForCall();
                await sleep();
                watcher.unwatch(subdir.path());
                await Promise.all([
                    sleep().then(() => Promise.all([
                        subdir.getVirtualFile("add.txt").write(Date.now()),
                        change.write("change.txt")
                    ])).then(() => sleep()),
                    all.waitForArgs("change", change.path())
                ]);
                expect(all).not.to.have.been.calledWith("add");
                if (!osXFsWatch) {
                    expect(all.callCount).to.be.equal(1);
                }
            });

            it("should ignore unwatched paths that are a subset of watched paths", async () => {
                const all = spy();
                const ready = spy();
                watcher = watch(fixtures.path(), options).on("all", all).on("ready", ready);
                await ready.waitForCall();
                await sleep();
                // test with both relative and absolute paths
                watcher.unwatch([subdir.relativePath(process.cwd()), fixtures.getVirtualFile("unl*").path()]);
                const change = fixtures.getVirtualFile("change.txt");
                const add = subdir.getVirtualFile("add.txt");
                await Promise.all([
                    sleep().then(() => Promise.all([
                        fixtures.getVirtualFile("unlink.txt").unlink(),
                        add.write(Date.now()),
                        change.write(Date.now())
                    ])),
                    all.waitForArgs("change")
                ]);
                await sleep();
                expect(all).to.have.been.calledWith("change", change.path());
                expect(all).not.to.have.been.calledWith("add", add.path());
                expect(all).not.to.have.been.calledWith("unlink");
                if (!osXFsWatch) {
                    expect(all.callCount).to.be.equal(1);
                }
            });

            it("should unwatch relative paths", async () => {
                const all = spy();
                const ready = spy();
                const subdirPath = subdir.relativePath(process.cwd());
                const change = fixtures.getVirtualFile("change.txt");
                const changePath = change.relativePath(process.cwd());
                const watchPaths = [subdirPath, changePath];
                watcher = watch(watchPaths, options).on("all", all).on("ready", ready);
                await ready.waitForCall();
                await sleep(300);
                watcher.unwatch(subdirPath);
                const add = subdir.getVirtualFile("add.txt");
                await Promise.all([
                    add.write(Date.now()),
                    change.write(Date.now()),
                    all.waitForCall()
                ]);
                await sleep(300);
                expect(all).to.have.been.calledWith("change", changePath);
                expect(all).not.to.have.been.calledWith("add");
                if (!osXFsWatch) {
                    expect(all.callCount).to.be.equal(1);
                }
            });

            it("should watch paths that were unwatched and added again", async () => {
                const change = fixtures.getVirtualFile("change.txt");
                const watchPaths = [change.path()];
                const ready = spy();
                watcher = watch(watchPaths, options).on("ready", ready);
                await ready.waitForCall();
                await sleep();
                watcher.unwatch(change.path());
                await sleep();
                const all = spy();
                watcher.on("all", all).add(change.path());
                await sleep();
                await Promise.all([
                    change.write(Date.now()),
                    all.waitForArgs("change", change.path())
                ]);
                if (!osXFsWatch) {
                    expect(all.callCount).to.be.equal(1);
                }
            });

            it("should unwatch paths that are relative to options.cwd", async () => {
                options.cwd = fixtures.path();
                const all = spy();
                const ready = spy();
                watcher = watch(".", options).on("all", all).on("ready", ready);
                await ready.waitForCall();
                await sleep();
                const unlink = fixtures.getVirtualFile("unlink.txt");
                const add = subdir.getVirtualFile("add.txt");
                const change = fixtures.getVirtualFile("change.txt");
                watcher.unwatch(["subdir", unlink.path()]);
                await Promise.all([
                    sleep().then(() => Promise.all([
                        unlink.unlink(),
                        add.write(Date.now()),
                        change.write(Date.now())
                    ])),
                    all.waitForCall()
                ]);
                await sleep();
                expect(all).to.have.been.calledWith("change", "change.txt");
                expect(all).not.to.have.been.calledWith("add");
                expect(all).not.to.have.been.calledWith("unlink");
                if (!osXFsWatch) {
                    expect(all.callCount).to.be.equal(1);
                }
            });
        });

        describe("close", () => {
            it("should ignore further events on close", async () => {
                const add = spy();
                const ready = spy();
                const addFile = fixtures.getVirtualFile("add.txt");
                watcher = watch(fixtures.path(), options).on("add", add).on("ready", ready);
                await ready.waitForCall();
                await sleep();
                add.reset();
                watcher.close();
                await addFile.write("hello");
                await sleep(900);
                expect(add.callCount).to.be.equal(0);
            });
        });

        describe("runtime", () => {
            it("should correcly process removing a directory", async () => {
                let watcher;
                try {
                    const ready = spy();
                    const addDir = spy();
                    const unlinkDir = spy();
                    watcher = watch(fixtures.path())
                        .on("ready", ready)
                        .on("addDir", addDir)
                        .on("unlinkDir", unlinkDir);
                    await ready.waitForCall();
                    await sleep();
                    addDir.reset();
                    const [dir] = await Promise.all([
                        fixtures.addDirectory("testing_directory"),
                        addDir.waitForCall()
                    ]);
                    await sleep();
                    await Promise.all([
                        dir.unlink(),
                        unlinkDir.waitForCall()
                    ]);
                    await sleep();
                    await Promise.all([
                        dir.create(),
                        addDir.waitForCall()
                    ]);
                    await sleep();
                    await Promise.all([
                        dir.unlink(),
                        unlinkDir.waitForCall()
                    ]);
                } finally {
                    watcher.close();
                }
            });
        });
    };

    if (os === "darwin") {
        describe("fsevents (native extension)", runTests.bind(this, { useFsEvents: true }));
    }
    if (os !== "darwin") {
        describe("fs.watch (non-polling)", runTests.bind(this, { usePolling: false, useFsEvents: false }));
    }

    describe("fs.watchFile (polling)", runTests.bind(this, { usePolling: true, interval: 10 }));
});
