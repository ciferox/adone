import Dummy from "../../helpers/spy";

const { is } = adone;
const fswatcher = adone.FSWatcher;
const os = process.platform;

let watcher;
let watcher2;
const usedWatchers = [];
let options;
let osXFsWatch;
let win32Polling;
let slowerDelay;

const originalcwd = process.cwd();
let rootFixtures = null;
let fixtures = null;

before(async () => {
    rootFixtures = await FS.createTempDirectory();
});

after("restroring the cwd", async () => {
    process.chdir(originalcwd);
    await rootFixtures.unlink();
});

beforeEach("preparing the fixtures directory for a test", async () => {
    fixtures = await FS.createTempDirectory(adone.std.path.join(rootFixtures.path(), adone.std.path.sep));
    process.chdir(fixtures.path());
    await Promise.all([
        fixtures.addFile("change.txt", { content: "b" }),
        fixtures.addFile("unlink.txt", { content: "b" })
    ]);
    await sleep();
});

// afterEach(() => {
//     return fixtures.unlink();
// });

function closeWatchers() {
    for (; ;) {
        const u = usedWatchers.pop();
        if (!u) {
            break;
        }
        u.close();
    }
}
function disposeWatcher(watcher) {
    if (!watcher || watcher.closed) return;
    if (osXFsWatch) {
        usedWatchers.push(watcher);
    } else {
        watcher.close();
    }
}
afterEach("dispatching all watchers", async () => {
    disposeWatcher(watcher);
    disposeWatcher(watcher2);
    await sleep();
});

describe("fswatcher", function () {
    this.timeout(6000);

    it("should expose public API methods", async () => {
        expect(fswatcher).to.be.a("function");
        expect(fswatcher.watch).to.be.a("function");
        await sleep();
    });

    if (os === "darwin") {
        // describe("fsevents (native extension)", runTests.bind(this, { useFsEvents: true }));
    }
    if (os !== "darwin") {
        describe("fs.watch (non-polling)", runTests.bind(this, { usePolling: false, useFsEvents: false }));
    }
    describe("fs.watchFile (polling)", runTests.bind(this, { usePolling: true, interval: 10 }));
});

const sleep = (to) => adone.promise.delay(to || slowerDelay || 100);

function runTests(baseopts) {
    baseopts.persistent = true;

    before(function () {
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
        Object.keys(baseopts).forEach(function (key) {
            options[key] = baseopts[key];
        });
    });

    function stdWatcher() {
        return watcher = fswatcher.watch(fixtures.path(), options);
    }

    describe("watch a directory", function () {
        let readySpy;
        let rawSpy;
        beforeEach(() => {
            options.ignoreInitial = true;
            options.alwaysStat = true;
            readySpy = new Dummy();
            rawSpy = new Dummy();
            stdWatcher().on("ready", readySpy.callback).on("raw", rawSpy.callback);
        });
        afterEach(async () => {
            if (readySpy.calls === 0) {
                await readySpy.waitForCall();
            }
            rawSpy = undefined;
        });
        it("should produce an instance of fswatcher.FSWatcher", async () => {
            expect(watcher).to.be.instanceof(fswatcher);
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
            const add = new Dummy();
            watcher.on("add", add.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            const [, [meta]] = await Promise.all([
                file.write(Date.now()),
                add.waitForCall()
            ]);
            expect(meta.args[0]).to.be.equal(testFile.path());
            expect(meta.args[1]).to.be.ok;  // stats
            expect(rawSpy.calls).not.to.be.equal(0);
        });
        it("should emit `addDir` event when directory was added", async () => {
            const dir = fixtures.getVirtualDirectory("subdir");
            const addDir = new Dummy();
            watcher.on("addDir", addDir.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            expect(addDir.calls).to.be.equal(0);
            const [, [meta]] = await Promise.all([
                dir.create(),
                addDir.waitForCall()
            ]);
            expect(meta.args[0]).to.be.equal(dir.path());
            expect(meta.args[1]).to.be.ok;  // stats
            expect(rawSpy).not.to.be.equal(0);
        });
        it("should emit `change` event when file was changed", async () => {
            const file = fixtures.getVirtualFile("change.txt");
            const change = new Dummy();
            watcher.on("change", change.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();

            const [, [meta]] = await Promise.all([
                file.write(Date.now()),
                change.waitForCall()
            ]);
            expect(meta.args[0]).to.be.equal(file.path());
            expect(meta.args[1]).to.be.ok;  // stats
            expect(rawSpy.calls).not.to.be.equal(0);
            expect(change.calls).to.be.equal(1);
        });
        it("should emit `unlink` event when file was removed", async () => {
            const unlink = new Dummy();
            const file = fixtures.getVirtualFile("unlink.txt");

            watcher.on("unlink", unlink.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            expect(unlink.calls).to.be.equal(0);

            const [, [meta]] = await Promise.all([
                file.unlink(),
                unlink.waitForCall()
            ]);

            expect(meta.args[0]).to.be.equal(file.path());
            expect(meta.args[1]).not.to.be.ok;  // no stats
            expect(rawSpy.calls).not.be.equal(0);
            expect(unlink.calls).to.be.equal(1);
        });
        it("should emit `unlinkDir` event when a directory was removed", async () => {
            const testDir = await fixtures.addDirectory("subdir");
            const unlinkDir = new Dummy();
            watcher.on("unlinkDir", unlinkDir.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            const [, [meta]] = await Promise.all([
                testDir.unlink(),
                unlinkDir.waitForCall()
            ]);
            expect(meta.args[0]).to.be.equal(testDir.path());
            expect(meta.args[1]).not.to.be.ok;  // no stats
            expect(rawSpy.calls).not.to.be.equal(0);
            expect(unlinkDir.calls).to.be.equal(1);
        });
        it("should emit `unlink` and `add` events when a file is renamed", async () => {
            const unlink = new Dummy();
            const add = new Dummy();
            const testFile = fixtures.getVirtualFile("change.txt");
            const newFile = fixtures.getVirtualFile("moved.txt");

            watcher.on("unlink", unlink.callback).on("add", add.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            expect(unlink.calls).to.be.equal(0);
            expect(add.calls).to.be.equal(0);
            await sleep(1000);
            const testPath = testFile.path();
            const [, [unlinkMeta], [addMeta]] = await Promise.all([
                testFile.rename(newFile),
                unlink.waitForCall(),
                add.waitForCall()
            ]);
            expect(unlinkMeta.args[0]).to.be.equal(testPath);
            expect(unlinkMeta.args[1]).not.to.be.ok;  // no stats
            expect(add.calls).to.be.equal(1);
            expect(addMeta.args[0]).to.be.equal(newFile.path());
            expect(addMeta.args[1]).to.be.ok;  // stats
            expect(rawSpy.calls).not.to.be.equal(0);
            if (!osXFsWatch) {
                expect(unlink.calls).to.be.equal(1);
            }
        });
        it("should emit `add`, not `change`, when previously deleted file is re-added", async () => {
            const unlink = new Dummy();
            const add = new Dummy();
            const change = new Dummy();
            const testFile = await fixtures.addFile("add.txt", { content: "hello" });
            watcher.on("unlink", unlink.callback).on("add", add.callback).on("change", change.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            expect(unlink.calls).to.be.equal(0);
            expect(add.calls).to.be.equal(0);
            expect(change.calls).to.be.equal(0);
            const [, [unlinkMeta]] = await Promise.all([
                testFile.unlink(),
                unlink.waitForArgs(testFile.path())
            ]);
            expect(unlinkMeta.args[0]).to.be.equal(testFile.path());
            await sleep();
            const [, [addMeta]] = await Promise.all([
                testFile.write(Date.now()),
                add.waitForArg(0, testFile.path())
            ]);
            expect(addMeta.args[0]).to.be.equal(testFile.path());
            expect(change.calls).to.be.equal(0);
        });
        it("should not emit `unlink` for previously moved files", async () => {
            const unlink = new Dummy();
            const testFile = await fixtures.addFile("change.txt");
            const newFile1 = await fixtures.addFile("moved.txt");
            const newFile2 = await fixtures.addFile("moved-again.txt");
            watcher.on("unlink", unlink.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            const testPath = testFile.path();
            await Promise.all([
                testFile.rename(newFile1).then(() => sleep(300)).then(() => testFile.rename(newFile2)),
                unlink.waitForArg(0, newFile1.path())
            ]);

            expect(unlink.calls).to.be.equal(2);
            expect(unlink.get(0).args[0]).to.be.equal(testPath);
            expect(unlink.get(1).args[0]).to.be.equal(newFile1.path());
        });
        it("should survive ENOENT for missing subdirectories", async () => {
            const testDir = fixtures.getVirtualFile("notadir");
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            watcher.add(testDir.path());
            await sleep();
        });
        it("should notice when a file appears in a new directory", async () => {
            const add = new Dummy();
            const testDir = fixtures.getVirtualDirectory("subdir");
            const testFile = fixtures.getVirtualFile("subdir", "add.txt");
            watcher.on("add", add.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            expect(add.calls).to.be.equal(0);
            await sleep();
            await Promise.all([
                testDir.create().then(() => testFile.write(Date.now())),
                add.waitForCall()
            ]);
            expect(add.calls).to.be.equal(1);
            expect(add.get(0).args[0]).to.be.equal(testFile.path());
            expect(add.get(0).args[1]).to.be.ok;  // stats
            expect(rawSpy).not.to.be.equal(0);
        });
        it("should watch removed and re-added directories", async function () {
            this.timeout(10000);
            const unlinkDir = new Dummy();
            const addDir = new Dummy();
            const parentDir = fixtures.getVirtualDirectory("subdir2");
            const subDir = fixtures.getVirtualDirectory("subdir2", "subsub");
            watcher.on("unlinkDir", unlinkDir.callback).on("addDir", addDir.callback);
            if (!readySpy.calls) {
                await readySpy.waitForCall();
            }
            await sleep();
            await Promise.all([
                parentDir.create().then(() => sleep(win32Polling ? 900 : 300)).then(() => parentDir.unlink()),
                unlinkDir.waitForArg(0, parentDir.path())
            ]);
            expect(unlinkDir.calls).to.be.equal(1);
            expect(unlinkDir.get(0).args[0]).to.be.equal(parentDir.path());
            await Promise.all([
                parentDir.create().then(() => sleep(win32Polling ? 4600 : 1200)).then(() => subDir.create()),
                addDir.waitForNCalls(2)
            ]);
            expect(addDir.get(1).args[0]).to.be.equal(parentDir.path());
            expect(addDir.get(2).args[0]).to.be.equal(subDir.path());
        });
    });
    describe("watch individual files", function () {
        before(closeWatchers);
        it("should detect changes", async () => {
            const testFile = fixtures.getVirtualFile("change.txt");
            const change = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(testFile.path(), options)
                .on("change", change.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            await Promise.all([
                testFile.write(Date.now()),
                change.waitForCall()
            ]);
            for (let i = 0; i < change.calls; ++i) {
                expect(change.get(i).args[0]).to.be.equal(testFile.path());
            }
        });
        it("should detect unlinks", async () => {
            const testFile = fixtures.getVirtualFile("unlink.txt");
            const unlink = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(testFile.path(), options)
                .on("unlink", unlink.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            await Promise.all([
                sleep().then(() => testFile.unlink()),
                unlink.waitForCall()
            ]);
            expect(unlink.calls).to.be.equal(1);
            expect(unlink.get(0).args[0]).to.be.equal(testFile.path());
        });
        it("should detect unlink and re-add", async () => {
            options.ignoreInitial = true;
            const unlink = new Dummy();
            const add = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("unlink.txt");
            watcher = fswatcher.watch(file.path(), options)
                .on("unlink", unlink.callback)
                .on("add", add.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            await Promise.all([
                sleep().then(() => file.unlink()),
                unlink.waitForCall()
            ]);

            expect(unlink.calls).to.be.equal(1);
            expect(unlink.get(0).args[0]).to.be.equal(file.path());
            await sleep();
            await Promise.all([
                sleep().then(() => file.write("re-added")),
                add.waitForCall()
            ]);

            expect(add.calls).to.be.equal(1);
            expect(add.get(0).args[0]).to.be.equal(file.path());
        });
        it("should ignore unwatched siblings", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("add.txt");
            const sibling = fixtures.getVirtualFile("change.txt");
            watcher = fswatcher.watch(file.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            await Promise.all([
                sibling.write(Date.now()),
                file.write(Date.now()),
                all.waitForCall()
            ]);
            expect(all.calls).to.be.equal(1);
            expect(all.get(0).args[0]).to.be.equal("add");
            expect(all.get(0).args[1]).to.be.equal(file.path());
        });
    });
    describe("renamed directory", function () {
        it("should emit `add` for a file in a renamed directory", async () => {
            options.ignoreInitial = true;
            const dir = await fixtures.addDirectory("subdir");
            await dir.addFile("add.txt", { content: Date.now() });
            const add = new Dummy();
            const ready = new Dummy();

            watcher = fswatcher.watch(fixtures.path(), options)
                .on("add", add.callback)
                .on("ready", ready.callback);

            await ready.waitForCall();
            await sleep();

            await Promise.all([
                sleep(1000).then(() => dir.rename("subdir-renamed")),
                add.waitForCall()
            ]);

            expect(add.calls).to.be.equal(1);
            expect(add.get(0).args[0]).to.be.equal(dir.getVirtualFile("add.txt").path());
        });
    });
    describe("watch non-existent paths", function () {
        it("should watch non-existent file and detect add", async () => {
            const add = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("add.txt");
            watcher = fswatcher.watch(file.path(), options)
                .on("add", add.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            await Promise.all([
                sleep().then(() => file.write(Date.now())),
                add.waitForCall()
            ]);
            expect(add.calls).to.be.equal(1);
            expect(add.get(0).args[0]).to.be.equal(file.path());
        });
        it("should watch non-existent dir and detect addDir/add", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const dir = fixtures.getVirtualDirectory("subdir");
            const file = dir.getVirtualFile("add.txt");
            watcher = fswatcher.watch(dir.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(0);
            await Promise.all([
                sleep()
                    .then(() => dir.create())
                    .then(() => sleep())
                    .then(() => file.write("hello"))
                    .then(() => sleep()),
                all.waitForArg(0, "add"),
            ]);
            expect(all.calls).to.be.equal(2);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["addDir", dir.path()]);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["add", file.path()]);
        });
    });
    describe("watch glob patterns", function () {
        before(closeWatchers);
        it("should correctly watch and emit based on glob input", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("*a*.txt");
            const addFile = fixtures.getVirtualFile("add.txt");
            const changeFile = fixtures.getVirtualFile("change.txt");
            watcher = fswatcher.watch(file.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(1);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", changeFile.path()]);
            await Promise.all([
                sleep()
                    .then(() => addFile.write(Date.now()))
                    .then(() => sleep())
                    .then(() => changeFile.write(Date.now()))
                    .then(() => sleep()),
                all.waitForNCalls(2)
            ]);
            expect(all.calls).to.be.equal(3);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["add", addFile.path()]);
            expect(all.get(2).args.slice(0, 2)).to.be.deep.equal(["change", changeFile.path()]);
        });
        it("should respect negated glob patterns", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const test = fixtures.getVirtualFile("*");
            const negated = `!${fixtures.getVirtualFile("*a*.txt").path()}`;
            const unlink = fixtures.getVirtualFile("unlink.txt");
            watcher = fswatcher.watch([test.path(), negated], options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(1);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", unlink.path()]);
            await Promise.all([
                sleep().then(() => unlink.unlink()).then(() => sleep()),
                all.waitForArg(0, "unlink"),
            ]);
            expect(all.calls).to.be.equal(2);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["unlink", unlink.path()]);
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

            const all = new Dummy();
            const ready = new Dummy();

            watcher = fswatcher.watch(watchPath, options)
                .on("all", all.callback)
                .on("ready", ready.callback);
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
            expect(all.calls).to.be.equal(3);  // add "add", change "ab", unlink "a"
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", add.path()]);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["change", ab.path()]);
            expect(all.get(2).args.slice(0, 2)).to.be.deep.equal(["unlink", a.path()]);
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

            const all = new Dummy();
            const ready = new Dummy();
            const watchPath = fix.getVirtualFile("*a*.txt").relativePath(fixtures);
            const add = fix.getVirtualFile("add.txt");
            const change = fix.getVirtualFile("change.txt");
            watcher = fswatcher.watch(watchPath, options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(1);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", change.relativePath(fixtures)]);
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
            expect(all.calls).to.be.equal(2);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", add.relativePath(fixtures)]);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["change", change.relativePath(fixtures)]);
        });
        it("should correctly handle conflicting glob patterns", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const change = fixtures.getVirtualFile("change.txt");
            const unlink = fixtures.getVirtualFile("unlink.txt");
            const add = fixtures.getVirtualFile("add.txt");
            const watchPaths = [
                fixtures.getVirtualFile("change*").path(),
                fixtures.getVirtualFile("unlink*").path()
            ];
            watcher = fswatcher.watch(watchPaths, options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(2);
            const [a] = all.find(({ args }) => args[0] === "add" && args[1] === change.path());
            const [b] = all.find(({ args }) => args[0] === "add" && args[1] === unlink.path());
            expect(a).to.be.ok;
            expect(b).to.be.ok;
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
            expect(all.calls).to.be.equal(2);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["change", change.path()]);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["unlink", unlink.path()]);
        });
        it("should correctly handle intersecting glob patterns", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const change = fixtures.getVirtualFile("change.txt");
            const watchPaths = [
                fixtures.getVirtualFile("cha*").path(),
                fixtures.getVirtualFile("*nge.*").path()
            ];
            watcher = fswatcher.watch(watchPaths, options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.calls).to.be.equal(1);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", change.path()]);
            await Promise.all([
                sleep().then(() => change.write(Date.now())).then(() => sleep()),
                all.waitForCall()
            ]);
            expect(all.calls).to.be.equal(2);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["change", change.path()]);
        });
        it("should not confuse glob-like filenames with globs", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const file = await fixtures.addFile("nota[glob].txt", { content: "b" });
            await sleep();
            stdWatcher()
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep(0);
            const [a] = all.find(({ args }) => args[0] === "add" && args[1] === file.path());
            expect(a).to.be.ok;
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
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(watchPath, options)
                .on("all", all.callback)
                .on("ready", ready.callback);

            await Promise.all([
                sleep().then(() => deepFile.write(Date.now())).then(() => sleep()),
                await all.waitForNCalls(2)
            ]);
            expect(all.calls).to.be.equal(2);
            expect(all.get(0).args.slice(0, 2)).to.be.deep.equal(["add", deepFile.path()]);
            expect(all.get(1).args.slice(0, 2)).to.be.deep.equal(["change", deepFile.path()]);
        });
        it("should emit matching dir events", async () => {
            const watchPaths = [
                fixtures.getVirtualFile("*").path(),
                fixtures.getVirtualFile("subdir/subsub/**/*").path()
            ];
            await fixtures.addDirectory("subdir", "subsub");
            const deepDir = fixtures.getVirtualDirectory("subdir", "subsub", "subsubsub");
            const deepFile = deepDir.getVirtualFile("a.txt");
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(watchPaths, options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            const [a] = all.find(({ args }) => args[0] === "addDir" && args[1] === fixtures.getVirtualDirectory("subdir").path());
            expect(a).to.be.ok;
            all.reset();
            await Promise.all([
                sleep().then(() => deepDir.create()).then(() => deepFile.write(Date.now())).then(() => sleep()),
                all.waitForArgs("addDir", deepDir.path()),
                all.waitForArgs("add", deepFile.path())
            ]);
            expect(all.calls).to.be.equal(2);
            await Promise.all([
                sleep().then(() => deepDir.unlink()),
                all.waitForArgs("unlinkDir", deepDir.path())
            ]);
        });
    });
    describe("watch symlinks", function () {
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
        afterEach(async () => {
            await linkedDir.unlink();
        });
        it("should watch symlinked dirs", async () => {
            const addDir = new Dummy();
            const add = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(linkedDir.path(), options)
                .on("addDir", addDir.callback)
                .on("add", add.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            expect(addDir.findByArgs(linkedDir.path())).to.be.ok;
            expect(add.findByArgs(linkedDir.getVirtualFile("change.txt").path()));
            expect(add.findByArgs(linkedDir.getVirtualFile("unlink.txt").path()));
        });
        it("should watch symlinked files", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const change = fixtures.getVirtualFile("change.txt");
            const link = await change.symbolicLink(fixtures.getVirtualFile("link.txt"));
            watcher = fswatcher.watch(link.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            expect(all.findByArgs("add", link.path())).to.be.ok;
            await sleep();
            await Promise.all([
                change.write(Date.now()),
                all.waitForArgs("change", link.path())
            ]);
        });
        it("should follow symlinked files within a normal dir", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const change = fixtures.getVirtualFile("change.txt");
            const link = await change.symbolicLink(subdir.getVirtualFile("link.txt"));
            watcher = fswatcher.watch(subdir.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            expect(all.findByArgs("add", link.path())).to.be.ok;
            await sleep();
            await Promise.resolve([
                change.write(Date.now()),
                all.waitForArgs("change", link.path())
            ]);
        });
        it("should watch paths with a symlinked parent", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const dir = linkedDir.getVirtualDirectory("subdir");
            const file = dir.getVirtualFile("add.txt");
            watcher = fswatcher.watch(dir.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            expect(all.findByArgs("addDir", dir.path())).to.be.ok;
            expect(all.findByArgs("add", file.path())).to.be.ok;
            await sleep();
            await Promise.all([
                addFile.write(Date.now()),
                all.waitForArgs("change", file.path())
            ]);
        });
        it("should not recurse indefinitely on circular symlinks", async () => {
            await fixtures.symbolicLink(fixtures.getVirtualDirectory("subdir", "circular"));
            const ready = new Dummy();
            stdWatcher().on("ready", ready.callback);
            await ready.waitForCall();
        });
        it("should recognize changes following symlinked dirs", async () => {
            const change = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(linkedDir.path(), options)
                .on("change", change.callback)
                .on("ready", ready.callback);
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
            const all = new Dummy();
            const ready = new Dummy();
            stdWatcher()
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            const sublink = fixtures.getVirtualDirectory("link");
            await Promise.all([
                sleep().then(() => subdir.symbolicLink(sublink)),
                all.waitForArgs("add", sublink.getVirtualFile("add.txt").path()),
                all.waitForArgs("addDir", sublink.path()),
            ]);
        });
        it("should watch symlinks as files when followSymlinks:false", async () => {
            options.followSymlinks = false;
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(linkedDir.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            expect(all.calls).to.be.equal(1);
            expect(all.findByArgs("addDir")).not.to.be.ok;
            expect(all.findByArgs("add", linkedDir.path())).to.be.ok;
        });
        it("should watch symlinks within a watched dir as files when followSymlinks:false", async () => {
            options.followSymlinks = false;
            const all = new Dummy();
            const ready = new Dummy();
            const link = await subdir.symbolicLink(fixtures.getVirtualDirectory("link"));
            stdWatcher().on("all", all.callback).on("ready", ready.callback);


            await Promise.all([
                sleep(options.usePolling ? 1200 : 300).then(() => Promise.all([
                    addFile.write(Date.now()),
                    link.unlink().then(() => addFile.symbolicLink(link.path()))
                ])).then(() => sleep()),
                all.waitForArgs("change", link.path()),
                all.waitForArgs("add", link.path())
            ]);
            expect(all.findByArgs("addDir", link.path())).not.to.be.ok;
            expect(all.findByArgs("add", link.getVirtualFile("add.txt").path())).not.to.be.ok;
        });

        it("should not reuse watcher when following a symlink to elsewhere", async () => {
            const linked = await fixtures.addDirectory("outside");
            const linkedFile = await linked.addFile("text.txt");
            const link = await linked.symbolicLink(subdir.getVirtualDirectory("subsub"));

            const ready2 = new Dummy();
            watcher2 = fswatcher.watch(subdir.path(), options)
                .on("ready", ready2.callback);
            await ready2.waitForCall();
            await sleep(options.usePolling ? 900 : undefined);
            const watched = link.getVirtualFile("text.txt");
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(watched.path(), options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep(options.usePolling ? 900 : undefined);
            await Promise.all([
                linkedFile.write(Date.now()),
                all.waitForArgs("change", watched.path())
            ]);
        });
        it("should properly match glob patterns that include a symlinked dir", async () => {
            const addDir = new Dummy();
            const add = new Dummy();
            const ready = new Dummy();
            // test with relative path to ensure proper resolution
            const watchDir = adone.std.path.relative(process.cwd(), linkedDir.path());
            watcher = fswatcher.watch(adone.std.path.join(watchDir, "**/*"), options)
                .on("addDir", addDir.callback)
                .on("add", add.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            // only the children are matched by the glob pattern, not the link itself
            expect(add.findByArgs(adone.std.path.join(watchDir, "change.txt"))).to.be.ok;
            expect(add.calls).to.be.equal(3);  // also unlink.txt & subdir/add.txt
            expect(addDir.findByArgs(adone.std.path.join(watchDir, "subdir"))).to.be.ok;
            const addFile = linkedDir.getVirtualFile("add.txt");
            await Promise.all([
                addFile.write(Date.now()),
                add.waitForArgs(addFile.relativePath(process.cwd()))
            ]);
        });
    });
    describe("watch arrays of paths/globs", function () {
        before(closeWatchers);
        it("should watch all paths in an array", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("change.txt");
            const dir = await fixtures.addDirectory("subdir");
            watcher = fswatcher.watch([dir.path(), file.path()], options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.findByArgs("add", file.path())).to.be.ok;
            expect(all.findByArgs("addDir", dir.path())).to.be.ok;
            expect(all.findByArgs("add", fixtures.getVirtualFile("unlink.txt").path())).not.to.be.ok;

            await Promise.all([
                file.write(Date.now()),
                all.waitForArgs("change", file.path())
            ]);
        });
        it("should accommodate nested arrays in input", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const file = fixtures.getVirtualFile("change.txt");
            const dir = await fixtures.addDirectory("subdir");

            watcher = fswatcher.watch([[dir.path()], [file.path()]], options)
                .on("all", all.callback)
                .on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            expect(all.findByArgs("add", file.path())).to.be.ok;
            expect(all.findByArgs("addDir", dir.path())).to.be.ok;
            expect(all.findByArgs("add", fixtures.getVirtualFile("unlink.txt").path())).not.to.be.ok;

            await Promise.all([
                file.write(Date.now()).then(() => sleep()),
                all.waitForArgs("change", file.path())
            ]);
        });
        it("should throw if provided any non-string paths", async () => {
            expect(fswatcher.watch.bind(null, [[fixtures.path()], /notastring/])).to.throw(TypeError, /non-string/i);
            await sleep();
        });
    });
    describe("watch options", function () {
        before(closeWatchers);
        describe("ignoreInitial", function () {
            describe("false", function () {
                beforeEach(function () {
                    options.ignoreInitial = false;
                });
                it("should emit `add` events for preexisting files", async () => {
                    const add = new Dummy();
                    const ready = new Dummy();
                    watcher = fswatcher.watch(fixtures.path(), options)
                        .on("add", add.callback)
                        .on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(add.calls).to.be.equal(2);
                });
                it("should emit `addDir` event for watched dir", async () => {
                    const addDir = new Dummy();
                    const ready = new Dummy();
                    watcher = fswatcher.watch(fixtures.path(), options)
                        .on("addDir", addDir.callback)
                        .on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(addDir.calls).to.be.equal(1);
                    expect(addDir.get(0).args[0]).to.be.equal(fixtures.path());
                });
                it("should emit `addDir` events for preexisting dirs", async () => {
                    const addDir = new Dummy();
                    const ready = new Dummy();
                    const subdir = await fixtures.addDirectory("subdir");
                    const subsub = await subdir.addDirectory("subsub");
                    watcher = fswatcher.watch(fixtures.path(), options)
                        .on("addDir", addDir.callback)
                        .on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(addDir.calls).to.be.equal(3);
                    expect(addDir.findByArgs(fixtures.path())).to.be.ok;
                    expect(addDir.findByArgs(subdir.path())).to.be.ok;
                    expect(addDir.findByArgs(subsub.path())).to.be.ok;
                });
            });
            describe("true", function () {
                beforeEach(function () {
                    options.ignoreInitial = true;
                });
                it("should ignore inital add events", async () => {
                    const add = new Dummy();
                    const ready = new Dummy();
                    stdWatcher()
                        .on("add", add.callback)
                        .on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(add.calls).to.be.equal(0);
                });
                it("should ignore add events on a subsequent .add()", async () => {
                    const add = new Dummy();
                    const ready = new Dummy();

                    watcher = fswatcher.watch(fixtures.getVirtualDirectory("subdir").path(), options)
                        .on("add", add.callback)
                        .on("ready", ready.callback);
                    watcher.add(fixtures.path());
                    await sleep(1000);
                    expect(add.calls).to.be.equal(0);
                });
                it("should notice when a file appears in an empty directory", async () => {
                    const add = new Dummy();
                    const ready = new Dummy();
                    const dir = fixtures.getVirtualDirectory("subdir");
                    const file = fixtures.getVirtualFile("subdir", "add.txt");
                    stdWatcher().on("add", add.callback).on("ready", ready.callback);
                    await ready.waitForCall();
                    await sleep();
                    expect(add.calls).to.be.equal(0);
                    await Promise.all([
                        dir.create().then(() => file.write(Date.now())).then(() => sleep()),
                        add.waitForCall()
                    ]);
                    expect(add.calls).to.be.equal(1);
                    expect(add.get(0).args[0]).to.be.equal(file.path());
                });
                it("should emit a change on a preexisting file as a change", async () => {
                    const all = new Dummy();
                    const ready = new Dummy();
                    const file = fixtures.getVirtualFile("change.txt");

                    stdWatcher().on("all", all.callback).on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(all.calls).to.be.equal(0);
                    await Promise.all([
                        file.write(Date.now()),
                        all.waitForArgs("change", file.path())
                    ]);
                    expect(all.findByArgs("add")).not.to.be.ok;
                });
                it("should not emit for preexisting dirs when depth is 0", async () => {
                    options.depth = 0;
                    const all = new Dummy();
                    const ready = new Dummy();
                    const file = fixtures.getVirtualFile("add.txt");
                    await fixtures.addDirectory("subdir");
                    stdWatcher().on("all", all.callback).on("ready", ready.callback);
                    await ready.waitForCall();
                    await sleep(200);
                    await Promise.all([
                        file.write(Date.now()).then(() => sleep()),
                        all.waitForCall()
                    ]);
                    expect(all.findByArgs("add", file.path())).to.be.ok;
                    expect(all.findByArgs("addDir")).not.to.be.ok;
                });
            });
        });
        describe("ignored", function () {
            it("should check ignore after stating", async () => {
                options.ignored = (path, stats) => {
                    if (subdir.normalizedPath() === path || subdir.path() === path || !stats) {
                        return false;
                    }
                    return stats.isDirectory();
                };
                const subdir = await fixtures.addDirectory("subdir");
                const file = await subdir.addFile("add.txt");
                const subsub = await subdir.addDirectory("subsub");
                await subsub.addFile("ab.txt");
                const add = new Dummy();
                const ready = new Dummy();
                watcher = fswatcher.watch(subdir.path(), options)
                    .on("add", add.callback)
                    .on("ready", ready.callback);
                await ready.waitForCall();
                expect(add.calls).to.be.equal(1);
                expect(add.get(0).args[0]).to.be.equal(file.path());
            });
            it("should not choke on an ignored watch path", function (done) {
                options.ignored = function () {
                    return true;
                };
                stdWatcher().on("ready", done);
            });
            it("should ignore the contents of ignored dirs", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const dir = await fixtures.addDirectory("subdir");
                const file = await dir.addFile("add.txt");
                options.ignored = dir.path();
                watcher = fswatcher.watch(fixtures.path(), options)
                    .on("all", all.callback)
                    .on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await file.write(Date.now());
                await sleep(300);
                expect(all.findByArgs("addDir", dir.path())).not.to.be.ok;
                expect(all.findByArgs("add", file.path())).not.to.be.ok;
                expect(all.findByArgs("change", file.path())).not.to.be.ok;
            });
            it("should allow regex/fn ignores", async () => {
                options.cwd = fixtures.path();
                options.ignored = /add/;
                const all = new Dummy();
                const ready = new Dummy();
                await fixtures.addFile("add.txt");
                watcher = fswatcher.watch(fixtures.path(), options)
                    .on("all", all.callback)
                    .on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    fixtures.getVirtualFile("add.txt").write(Date.now()).then(() => sleep()),
                    fixtures.getVirtualFile("change.txt").write(Date.now()).then(() => sleep()),
                    all.waitForArgs("change", "change.txt")
                ]);
                expect(all.findByArgs("add", "add.txt")).not.to.be.ok;
                expect(all.findByArgs("change", "add.txt")).not.to.be.ok;
                expect(all.findByArgs("add", "change.txt")).to.be.ok;
                expect(all.findByArgs("change", "change.txt")).to.be.ok;
            });
        });
        describe("depth", function () {
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
                const all = new Dummy();
                const ready = new Dummy();
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await addFile.write(Date.now());
                await sleep();
                if (!osXFsWatch) {
                    expect(all.calls).to.be.equal(4);
                }
                expect(all.findByArgs("addDir", fixtures.path())).to.be.ok;
                expect(all.findByArgs("addDir", subdir.path())).to.be.ok;
                expect(all.findByArgs("add", fixtures.getVirtualFile("change.txt").path())).to.be.ok;
                expect(all.findByArgs("add", fixtures.getVirtualFile("unlink.txt").path())).to.be.ok;
                expect(all.findByArgs("change")).not.to.be.ok;
            });
            it("should recurse to specified depth", async () => {
                options.depth = 1;
                const all = new Dummy();
                const ready = new Dummy();
                const add = fixtures.getVirtualFile("subdir", "add.txt");
                const change = fixtures.getVirtualFile("change.txt");
                const ignored = fixtures.getVirtualFile("subdir", "subsub", "ab.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await Promise.all([
                    sleep().then(() => Promise.all([
                        change.write(Date.now()),
                        add.write(Date.now()),
                        ignored.write(Date.now())
                    ])),
                    all.waitForArgs("change", add.path()),
                    all.waitForArgs("change", change.path())
                ]);
                expect(all.findByArgs("addDir", subsub.path())).to.be.ok;
                expect(all.findByArgs("add", ignored.path())).not.to.be.ok;
                expect(all.findByArgs("change", ignored.path())).not.to.be.ok;
                if (!osXFsWatch) {
                    expect(all.calls).to.be.equal(8);
                }
            });
            it("should respect depth setting when following symlinks", async () => {
                if (is.win32) {
                    return; // skip on windows
                }
                options.depth = 1;
                const all = new Dummy();
                const ready = new Dummy();
                const link = await subdir.symbolicLink(fixtures.getVirtualDirectory("link"));
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                expect(all.findByArgs("addDir", link.path())).to.be.ok;
                expect(all.findByArgs("addDir", link.getVirtualDirectory("subsub").path())).to.be.ok;
                expect(all.findByArgs("add", link.getVirtualFile("add.txt").path())).to.be.ok;
                expect(all.findByArgs("add", link.getVirtualFile("subsub", "ab.txt").path())).not.to.be.ok;
            });
            it("should respect depth setting when following a new symlink", async () => {
                if (is.win32) {
                    return; // skip on windows
                }
                options.depth = 1;
                options.ignoreInitial = true;
                const all = new Dummy();
                const ready = new Dummy();
                const link = fixtures.getVirtualDirectory("link");
                const dir = link.getVirtualDirectory("subsub");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    subdir.symbolicLink(link),
                    all.waitForArgs("addDir", link.path()),
                    all.waitForArgs("addDir", dir.path()),
                    all.waitForArgs("add", link.getVirtualFile("add.txt").path())
                ]);
                await sleep();
                expect(all.calls).to.be.equal(3);
            });
            it("should correctly handle dir events when depth is 0", async () => {
                options.depth = 0;
                const all = new Dummy();
                const ready = new Dummy();
                const subdir2 = fixtures.getVirtualDirectory("subdir2");

                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();

                expect(all.findByArgs("addDir", fixtures.path())).to.be.ok;
                expect(all.findByArgs("addDir", subdir.path())).to.be.ok;
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
        describe("atomic", function () {
            beforeEach(function () {
                options.atomic = true;
                options.ignoreInitial = true;
            });
            it("should ignore vim/emacs/Sublime swapfiles", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
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

                expect(all.calls).to.be.equal(0);
            });
            it("should ignore stale tilde files", async () => {
                options.ignoreInitial = false;
                const all = new Dummy();
                const ready = new Dummy();
                const file = await fixtures.addFile("old.txt~", { content: "a" });
                await sleep();

                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();

                expect(all.find(({ args }) => args[1] === file.path())).not.to.be.ok;
                expect(all.find(({ args }) => args[1] === file.path().slice(0, -1))).not.to.be.ok;
            });
        });
        describe("cwd", function () {
            it("should emit relative paths based on cwd", async () => {
                options.cwd = fixtures.path();
                const all = new Dummy();
                const ready = new Dummy();
                const change = fixtures.getVirtualFile("change.txt");
                const unlink = fixtures.getVirtualFile("unlink.txt");
                watcher = fswatcher.watch("**", options).on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                expect(all.findByArgs("add", "change.txt")).to.be.ok;
                expect(all.findByArgs("add", "unlink.txt")).to.be.ok;
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
                const ready = new Dummy();
                watcher = fswatcher.watch(".", options).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep(1000);
                const addDir = new Dummy();
                watcher.on("addDir", addDir.callback);
                await Promise.all([
                    subdir.rename("subdir-renamed"),
                    addDir.waitForArgs("subdir-renamed")
                ]);
                expect(addDir.calls).to.be.equal(1);
                expect(addDir.get(0).args[1]).to.be.ok;  // stats
            });
            it("should allow separate watchers to have different cwds", async () => {
                options.cwd = fixtures.path();
                const options2 = {};
                Object.keys(options).forEach(function (key) {
                    options2[key] = options[key];
                });
                options2.cwd = fixtures.getVirtualDirectory("subdir").path();
                const all1 = new Dummy();
                const ready1 = new Dummy();
                watcher = fswatcher.watch(fixtures.getVirtualDirectory("**").path(), options)
                    .on("all", all1.callback)
                    .on("ready", ready1.callback);
                await ready1.waitForCall();
                await sleep();
                const all2 = new Dummy();
                const ready2 = new Dummy();
                watcher2 = fswatcher.watch(fixtures.path(), options2)
                    .on("all", all2.callback)
                    .on("ready", ready2.callback);
                await ready2.waitForCall();
                await sleep();
                const change = fixtures.getVirtualFile("change.txt");
                const unlink = fixtures.getVirtualFile("unlink.txt");
                await Promise.all([
                    change.write(Date.now()).then(() => unlink.unlink()).then(() => sleep()),
                    all1.waitForArgs("unlink"),
                    all2.waitForArgs("unlink")
                ]);
                expect(all1.findByArgs("change", "change.txt")).to.be.ok;
                expect(all1.findByArgs("unlink", "unlink.txt")).to.be.ok;
                expect(all2.findByArgs("add", adone.std.path.join("..", "change.txt"))).to.be.ok;
                expect(all2.findByArgs("add", adone.std.path.join("..", "unlink.txt"))).to.be.ok;
                expect(all2.findByArgs("change", adone.std.path.join("..", "change.txt"))).to.be.ok;
                expect(all2.findByArgs("unlink", adone.std.path.join("..", "unlink.txt"))).to.be.ok;
            });
            it("should ignore files even with cwd", async () => {
                options.cwd = fixtures.path();
                options.ignored = "ignored-option.txt";
                const files = ["*.txt", "!ignored.txt"];
                const change = fixtures.getVirtualFile("change.txt");
                const ignored = await fixtures.addFile("ignored.txt");
                const ignoredOption = await fixtures.addFile("ignored-option.txt");
                const all = new Dummy();
                const ready = new Dummy();
                watcher = fswatcher.watch(files, options).on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();

                await Promise.all([
                    ignored.write(Date.now()).then(() => ignored.unlink()),
                    ignoredOption.write(Date.now()).then(() => ignoredOption.unlink()),
                    sleep().then(() => change.write("change")).then(() => sleep()),
                    all.waitForArgs("change", "change.txt")
                ]);
                expect(all.findByArgs("add", "change.txt")).to.be.ok;
                expect(all.findByArgs("add", "ignored.txt")).not.to.be.ok;
                expect(all.findByArgs("add", "ignored-output.txt")).not.to.be.ok;
                expect(all.findByArgs("change", "ignored.txt")).not.to.be.ok;
                expect(all.findByArgs("change", "ignored-output.txt")).not.to.be.ok;
                expect(all.findByArgs("unlink", "ignored.txt")).not.to.be.ok;
                expect(all.findByArgs("unlink", "ignored-output.txt")).not.to.be.ok;
            });
        });
        describe("ignorePermissionErrors", function () {
            let file;
            beforeEach(async () => {
                file = await fixtures.addFile("add.txt", { mode: 0o200 });  // owner writing
                await sleep();
            });
            describe("false", function () {
                beforeEach(function () {
                    options.ignorePermissionErrors = false;
                });
                it("should not watch files without read permissions", async () => {
                    if (is.win32) {
                        return;
                    }
                    const all = new Dummy();
                    const ready = new Dummy();
                    stdWatcher().on("all", all.callback).on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(all.findByArgs("add", file.path())).not.to.be.ok;
                    await sleep(500);
                    await file.write(Date.now());
                    expect(all.findByArgs("change", file.path())).not.to.be.ok;
                });
            });
            describe("true", function () {
                beforeEach(function () {
                    options.ignorePermissionErrors = true;
                });
                it("should watch unreadable files if possible", async () => {
                    const all = new Dummy();
                    const ready = new Dummy();
                    stdWatcher().on("all", all.callback).on("ready", ready.callback);
                    await ready.waitForCall();
                    expect(all.findByArgs("add", file.path())).to.be.ok;
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
                    const ready = new Dummy();
                    const watcher = fswatcher.watch(fixtures.getVirtualFile("nope.txt").path(), options)
                        .on("ready", ready.callback);
                    await ready.waitForCall();
                    await sleep();
                    watcher.close();
                });
            });
        });
        describe("awaitWriteFinish", function () {
            beforeEach(function () {
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
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    file.write("hello"),
                    all.waitForArgs("add", file.path())
                ]);
            });
            it("should wait for the file to be fully written before emitting the add event", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await file.write("hello");
                expect(all.calls).to.be.equal(0);
                await sleep(300);
                expect(all.findByArgs("add", file.path()));
            });
            it("should emit with the final stats", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    file.write("hello ").then(() => adone.std.fs.appendFileSync(file.path(), "world!")).then(() => sleep()),
                    all.waitForCall()
                ]);
                const [a] = all.findByArgs("add", file.path());
                expect(a).to.be.ok;
                expect(a.args[2].size).to.be.equal(12);
            });
            it("should not emit change event while a file has not been fully written", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    file.write("hello"),
                    sleep(100)
                        .then(() => file.write("edit"))
                        .then(() => sleep(200))
                ]);
                expect(all.findByArgs("change", file.path())).not.to.be.ok;
            });
            it("should not emit change event before an existing file is fully updated", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("change.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await file.write("hello");
                await sleep(300);
                expect(all.findByArgs("change", file.path())).not.to.be.ok;
            });
            it("should wait for an existing file to be fully updated before emitting the change event", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("change.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await file.write("hello");
                await sleep(300);
                expect(all.calls).to.be.equal(0);
                await all.waitForArgs("change", file.path());
            });
            it("should emit change event after the file is fully written", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
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
                const all = new Dummy();
                const ready = new Dummy();
                const file = fixtures.getVirtualFile("add.txt");
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
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
                expect(all.calls).to.be.equal(0);
            });
            it("should be compatible with the cwd option", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const subdir = await fixtures.addDirectory("subdir");
                const file = subdir.getVirtualFile("add.txt");
                options.cwd = file.dirname();
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await Promise.all([
                    sleep(400).then(() => file.write("hello")),
                    all.waitForArgs("add", file.filename())
                ]);
            });
            it("should still emit initial add events", async () => {
                options.ignoreInitial = false;
                const all = new Dummy();
                const ready = new Dummy();
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                expect(all.findByArgs("add")).to.be.ok;
                expect(all.findByArgs("addDir")).to.be.ok;
            });
            it("should emit an unlink event when a file is updated and deleted just after that", async () => {
                const all = new Dummy();
                const ready = new Dummy();
                const subdir = await fixtures.addDirectory("subdir");
                const file = await subdir.addFile("add.txt", { content: "hello" });
                options.cwd = file.dirname();
                stdWatcher().on("all", all.callback).on("ready", ready.callback);
                await ready.waitForCall();
                await sleep();
                await file.write("edit");
                await sleep();
                await Promise.all([
                    file.unlink(),
                    all.waitForArgs("unlink", file.filename())
                ]);
                expect(all.findByArgs("change", file.filename())).not.to.be.ok;
            });
        });
    });
    describe("getWatched", function () {
        before(closeWatchers);
        it("should return the watched paths", async () => {
            const expected = {};
            expected[fixtures.dirname()] = [fixtures.filename()];
            expected[fixtures.path()] = ["change.txt", "unlink.txt"];
            const ready = new Dummy();
            stdWatcher().on("ready", ready.callback);
            await ready.waitForCall();
            expect(watcher.getWatched()).to.deep.equal(expected);
        });
        it("should set keys relative to cwd & include added paths", async () => {
            options.cwd = fixtures.path();
            const expected = {
                ".": ["change.txt", "subdir", "unlink.txt"],
                "..": [fixtures.filename()],
                "subdir": []
            };
            await fixtures.addDirectory("subdir");
            const ready = new Dummy();
            stdWatcher().on("ready", ready.callback);
            await ready.waitForCall();
            expect(watcher.getWatched()).to.deep.equal(expected);
        });
    });
    describe("unwatch", function () {
        before(closeWatchers);
        let subdir;
        beforeEach(async () => {
            options.ignoreInitial = true;
            subdir = await fixtures.addDirectory("subdir");
            await sleep();
        });
        it("should stop watching unwatched paths", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const change = fixtures.getVirtualFile("change.txt");
            const watchPaths = [subdir.path(), change.path()];

            watcher = fswatcher.watch(watchPaths, options).on("all", all.callback).on("ready", ready.callback);
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
            expect(all.findByArgs("add")).not.to.be.ok;
            if (!osXFsWatch) {
                expect(all.calls).to.be.equal(1);
            }
        });
        it("should ignore unwatched paths that are a subset of watched paths", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(fixtures.path(), options).on("all", all.callback).on("ready", ready.callback);
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
            expect(all.findByArgs("change", change.path())).to.be.ok;
            expect(all.findByArgs("add", add.path())).not.to.be.ok;
            expect(all.findByArgs("unlink")).not.to.be.ok;
            if (!osXFsWatch) {
                expect(all.calls).to.be.equal(1);
            }
        });
        it("should unwatch relative paths", async () => {
            const all = new Dummy();
            const ready = new Dummy();
            const subdirPath = subdir.relativePath(process.cwd());
            const change = fixtures.getVirtualFile("change.txt");
            const changePath = change.relativePath(process.cwd());
            const watchPaths = [subdirPath, changePath];
            watcher = fswatcher.watch(watchPaths, options).on("all", all.callback).on("ready", ready.callback);
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
            expect(all.findByArgs("change", changePath)).to.be.ok;
            expect(all.findByArgs("add")).not.to.be.ok;
            if (!osXFsWatch) {
                expect(all.calls).to.be.equal(1);
            }
        });
        it("should watch paths that were unwatched and added again", async () => {
            const change = fixtures.getVirtualFile("change.txt");
            const watchPaths = [change.path()];
            const ready = new Dummy();
            watcher = fswatcher.watch(watchPaths, options).on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            watcher.unwatch(change.path());
            await sleep();
            const all = new Dummy();
            watcher.on("all", all.callback).add(change.path());
            await sleep();
            await Promise.all([
                change.write(Date.now()),
                all.waitForArgs("change", change.path())
            ]);
            if (!osXFsWatch) {
                expect(all.calls).to.be.equal(1);
            }
        });
        it("should unwatch paths that are relative to options.cwd", async () => {
            options.cwd = fixtures.path();
            const all = new Dummy();
            const ready = new Dummy();
            watcher = fswatcher.watch(".", options).on("all", all.callback).on("ready", ready.callback);
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
            expect(all.findByArgs("change", "change.txt")).to.be.ok;
            expect(all.findByArgs("add")).not.to.be.ok;
            expect(all.findByArgs("unlink")).not.to.be.ok;
            if (!osXFsWatch) {
                expect(all.calls).to.be.equal(1);
            }
        });
    });
    describe("close", function () {
        it("should ignore further events on close", async () => {
            const add = new Dummy();
            const ready = new Dummy();
            const addFile = fixtures.getVirtualFile("add.txt");
            watcher = fswatcher.watch(fixtures.path(), options).on("add", add.callback).on("ready", ready.callback);
            await ready.waitForCall();
            await sleep();
            add.reset();
            watcher.close();
            await addFile.write("hello");
            await sleep(900);
            expect(add.calls).to.be.equal(0);
        });
    });

    describe("runtime", () => {
        it("should correcly process removing a directory", async function () {
            let watcher;
            try {
                const ready = new Dummy();
                const addDir = new Dummy();
                const unlinkDir = new Dummy();
                watcher = fswatcher.watch(fixtures.path())
                    .on("ready", ready.callback)
                    .on("addDir", addDir.callback)
                    .on("unlinkDir", unlinkDir.callback);
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
}