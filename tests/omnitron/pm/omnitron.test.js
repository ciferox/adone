const { path } = adone.std;
import OmnitronRunner, { WeakOmnitron } from "../runner";
import {
    netronOptions,
    RemoteProcess,
    logger,
    IProcess,
    IMainProcess
} from "omnitron/contexts/pm";
import { fixture, waitFor } from "./util";

const { vendor: { lodash: _ }, x, is } = adone;

describe("Process manager", function () {
    this.timeout(180000);  // long enough?
    let OS;

    before(async () => {
        netronOptions.responseTimeout = 100000;
        OS = adone.metrics.system;
    });

    describe("omnitron", () => {
        let omnitronRunner;

        describe("Process management", () => {
            const db = { applications: null, runtime: null };
            let pm = null;
            let idb = null;

            before("create runner", async () => {
                omnitronRunner = new OmnitronRunner();
                omnitronRunner.createDispatcher();
                await omnitronRunner.run();
            });

            beforeEach("start omnitron", async function () {
                this.timeout(60000);
                await omnitronRunner.startOmnitron();
                await adone.promise.delay(100);
                // await omnitronRunner.connectOmnitron();
                pm = await omnitronRunner.context("pm");
                idb = await omnitronRunner.context("db");
                db.applications = await idb.getDatastore({
                    filename: "pm-applications"
                });
                db.runtime = await idb.getDatastore({
                    filename: "pm-runtime"
                });
            });

            afterEach("stop omnitron", async function () {
                this.timeout(60000);
                await omnitronRunner.stopOmnitron();
            });

            const restartOmnitron = async () => {
                await omnitronRunner.restartOmnitron({ clean: false, killChildren: false });
                pm = await omnitronRunner.context("pm");
                idb = await omnitronRunner.context("db");
                db.applications = await idb.getDatastore({
                    filename: "pm-applications"
                });
                db.runtime = await idb.getDatastore({
                    filename: "pm-runtime"
                });
            };

            for (const mode of ["single", "cluster"]) {
                const isCluster = mode === "cluster";
                describe(mode, () => {
                    describe("common", () => {
                        it("should start the app and store it in the db", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            expect(await OS.getProcess(await p.pid())).to.be.not.null;
                            if (isCluster) {
                                expect(p.$def.name).to.be.equal("IMainProcess");
                            } else {
                                expect(p.$def.name).to.be.equal("IProcess");
                            }
                            expect(await db.applications.findOne({
                                name: "test",
                                mode
                            })).to.be.ok;
                            expect(await db.runtime.findOne({
                                pid: await p.pid()
                            })).to.be.ok;
                            const t = p.waitForExit();
                            await p.kill("SIGKILL");
                            await t;
                        });

                        it("should stop the app", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const pid = await p.pid();
                            await pm.stop("test");
                            await adone.promise.delay(100);  // timers...
                            expect(await db.applications.findOne({
                                name: "test",
                                mode
                            })).to.be.ok;
                            expect(await db.runtime.findOne({ pid })).to.be.not.ok;
                        });
                    });

                    describe("start", () => {
                        it("should support starting by name", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            const p = await pm.start("test");
                            expect(await OS.getProcess(await p.pid())).to.be.not.null;
                            expect(await db.runtime.findOne({
                                pid: await p.pid()
                            })).to.be.ok;
                            await pm.stop("test");
                        });

                        it("should throw if the starting is failed", async () => {
                            const e = await pm.start({
                                name: "test",
                                path: fixture("invalid_script.js"),
                                mode,
                                instances: 4
                            }).then(adone.noop, (e) => e);
                            expect(e).to.be.ok;
                        });

                        it("should throw if has been started", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            let err = null;
                            try {
                                await pm.start({
                                    name: "test",
                                    path: fixture("run_forever.js"),
                                    mode,
                                    instances: 4
                                });
                            } catch (_err) {
                                err = _err;
                            }
                            try {
                                expect(err).to.be.instanceOf(x.IllegalState);
                                expect(err.message).to.be.equal("Stop the process first");
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should not update the config if has been started", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await pm.start({
                                    name: "test",
                                    args: ["1"]
                                });
                            } catch (err) {
                                //
                            }
                            const config = await db.applications.findOne({ name: "test" });
                            try {
                                expect(config.args).to.be.empty;
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should store the config if failed to start", async () => {
                            let err;
                            try {
                                await pm.start({
                                    name: "test",
                                    path: fixture("invalid_script.js"),
                                    mode,
                                    instances: 4
                                });
                            } catch (_err) {
                                err = _err;
                            }
                            try {
                                expect(err).to.be.ok;
                            } catch (err) {
                                await pm.stop("test");
                                throw err;
                            }
                            expect(await db.applications.findOne({ name: "test" })).to.be.ok;
                        });

                        it("should update the config if failed to start", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("synchronous.js"),
                                mode,
                                instances: 4
                            });
                            if (isCluster) {
                                await pm.stop("test");
                            }
                            await waitFor(async () => !await pm.started("test"));
                            let err;
                            try {
                                await pm.start({
                                    name: "test",
                                    path: fixture("invalid_script.js")
                                });
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.ok;
                            expect(await db.applications.findOne({ name: "test", path: fixture("synchronous.js") })).not.to.be.ok;
                            expect(await db.applications.findOne({ name: "test", path: fixture("invalid_script.js") })).to.be.ok;
                        });

                        it("should update the apps db after the first starting", async () => {
                            expect(await db.applications.findOne({ path: fixture("run_forever.js"), mode })).to.be.not.ok;
                            await pm.start({
                                path: fixture("run_forever.js"),
                                mode
                            });
                            try {
                                expect(await db.applications.findOne({ path: fixture("run_forever.js"), mode })).to.be.ok;
                            } finally {
                                await pm.stop("run_forever");
                            }
                        });

                        it("should set the basename as a name if was no provided", async () => {
                            const p = await pm.start({
                                path: fixture("run_forever.js"),
                                mode
                            });
                            try {
                                expect(await pm.hasApplication("run_forever")).to.be.true;
                            } finally {
                                p.kill("SIGKILL");
                            }
                        });

                        it("should update the apps db", async () => {
                            await pm.start({
                                path: fixture("run_forever.js"),
                                mode
                            });
                            await pm.stop("run_forever");
                            const doc = await db.applications.findOne({ name: "run_forever", mode });
                            await pm.start({
                                name: "run_forever",
                                args: ["1"]
                            });
                            await pm.stop("run_forever");
                            const doc2 = await db.applications.findOne({ path: fixture("run_forever.js"), mode });
                            expect(doc).not.to.be.deep.equal(doc2);
                            doc.args = ["1"];
                            expect(doc).to.be.deep.equal(doc2);
                        });

                        it("should update the runtime db after starting", async () => {
                            const a = new Date().getTime();
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const b = new Date().getTime();
                            const doc = await db.runtime.findOne({
                                pid: await p.pid()
                            });
                            try {
                                expect(doc).to.be.ok;
                                expect(doc.id).to.be.a("number");
                                expect(doc.timestamps).to.be.ok;
                                expect(doc.timestamps.started).to.be.within(a, b + 10);
                                expect(doc.timestamps.attached).to.be.null;
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should update the runtime db after stopping", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const config = await db.applications.findOne({ name: "test" });
                            await pm.stop("test");
                            await adone.promise.delay(100);  // timers...
                            const doc = await db.runtime.findOne({
                                id: config.id
                            });
                            expect(doc).to.be.not.ok;
                        });

                        it("should start right apps", async () => {
                            const f1 = await FS.createTempFile();
                            await pm.start({
                                name: "test",
                                path: fixture("print_identity_to_file_and_live_forever.js"),
                                args: ["alice", f1.path()],
                                mode,
                                instances: 5
                            });
                            const f2 = await FS.createTempFile();
                            await pm.start({
                                name: "test2",
                                path: fixture("print_identity_to_file_and_live_forever.js"),
                                args: ["bob", f2.path()],
                                mode,
                                instances: 5
                            });
                            await pm.stop("test");
                            await pm.stop("test2");
                            await pm.start({ name: "test", args: ["alice", f2.path()] });
                            await pm.start({ name: "test2", args: ["bob", f1.path()] });
                            await waitFor(() => pm.started("test"));
                            await waitFor(() => pm.started("test2"));
                            await adone.promise.delay(2000);
                            const d1 = await f1.content();
                            const d2 = await f2.content();
                            try {
                                if (isCluster) {
                                    expect(d1).to.be.deep.equal("alice".repeat(5) + "bob".repeat(5));
                                    expect(d2).to.be.deep.equal("bob".repeat(5) + "alice".repeat(5));
                                } else {
                                    expect(d1).to.be.deep.equal("alicebob");
                                    expect(d2).to.be.deep.equal("bobalice");
                                }
                            } finally {
                                await f1.unlink();
                                await f2.unlink();
                                await pm.stop("test2");
                                await pm.stop("test");
                            }
                        });

                        it("should not update the config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            let c = await db.applications.findOne({ name: "test" });
                            expect(c.args).to.be.empty;
                            await pm.start({
                                name: "test",
                                args: ["1"]
                            }, { store: false });
                            c = await db.applications.findOne({ name: "test" });
                            try {
                                expect(c.args).to.be.empty;
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        describe("cwd", () => {
                            it("should set the process cwd", async () => {
                                const cwd = adone.std.os.tmpdir();
                                await pm.start({
                                    name: "test",
                                    path: fixture("print_cwd.js"),
                                    mode,
                                    instances: 4,
                                    cwd
                                });
                                if (mode === "cluster") {
                                    await pm.stop("test");
                                }
                                const stdout = await pm.stdoutPath("test");
                                const data = (await adone.fs.readFile(stdout, { encoding: "utf-8" })).split("\n");
                                data.pop();
                                if (mode === "cluster") {
                                    expect(data).to.be.deep.equal([cwd, cwd, cwd, cwd]);
                                } else {
                                    expect(data).to.be.deep.equal([cwd]);
                                }
                            });

                            it("should throw if the cwd is empty", async () => {
                                await assert.throws(async () => {
                                    await pm.start({
                                        name: "test",
                                        path: fixture("print_cwd.js"),
                                        mode,
                                        instances: 4,
                                        cwd: ""
                                    });
                                }, x.Exception, "cwd cannot be empty");
                            });

                            it("should throw if the cwd is not absolute", async () => {
                                await assert.throws(async () => {
                                    await pm.start({
                                        name: "test",
                                        path: fixture("print_cwd.js"),
                                        mode,
                                        instances: 4,
                                        cwd: "hello"
                                    });
                                }, x.Exception, "cwd must be absolute");
                            });
                        });
                    });

                    describe("stop", () => {
                        it("should support stopping by IProcess", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const pid = await p.pid();
                            await pm.stop(p);
                            await adone.promise.delay(100);  // timers...
                            expect(await db.applications.findOne({
                                name: "test",
                                mode
                            })).to.be.ok;
                            expect(await db.runtime.findOne({ pid })).to.be.not.ok;
                        });

                        it("should throw if there is no such app", async () => {
                            let err;
                            try {
                                await pm.stop("test");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(x.NotExists);
                            expect(err.message).to.be.equal("There is no such application");
                        });

                        it("should throw if has not been started", async () => {
                            await db.applications.insert({
                                name: "test",
                                path: "test.js",
                                interpreter: "node",
                                mode
                            });
                            let err;
                            try {
                                await pm.stop("test");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(x.IllegalState);
                            expect(err.message).to.be.equal("Has not been started");
                        });

                        it("should throw if has been stopped", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            let err;
                            try {
                                await pm.stop("test");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(x.IllegalState);
                            expect(err.message).to.be.equal("Has been already stopped");
                        });

                        it("should stop by config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await pm.stop({
                                    name: "test",
                                    path: fixture("run_forever.js")
                                });
                            } catch (err) {
                                await pm.started("test") && await pm.stop("test");
                            }
                        });

                        it("should stop the app gracefully", async () => {
                            const name = isCluster ? "test_c" : "test";
                            await pm.start({
                                name,
                                path: fixture(isCluster ? "graceful_cluster_shutdown.js" : "graceful_shutdown.js"),
                                mode,
                                instances: 4
                            });
                            const stdout = await pm.stdoutPath(name);
                            await pm.stop(name, { graceful: true });
                            const data = await adone.fs.readFile(stdout, { encoding: "utf-8" });
                            if (isCluster) {
                                expect(data).to.be.equal("shutting down\n".repeat(4));
                            } else {
                                expect(data).to.be.equal("graceful\n");
                            }
                        });
                    });

                    describe("started", () => {
                        it("should throw if there is no such app", async () => {
                            let err;
                            try {
                                await pm.started("app");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(x.NotExists);
                            expect(err.message).to.be.equal("There is no such application");
                        });

                        it("should be false before starting", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            expect(await pm.started("test")).to.be.false;
                        });

                        it("should return true after starting", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                expect(await pm.started("test")).to.be.true;
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should return false after stopping", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            expect(await pm.started("test")).to.be.false;
                        });
                    });

                    describe("restart", () => {
                        it("should restart the app", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const pid = await p.pid();
                            const p2 = await pm.restart("test");
                            const pid2 = await p2.pid();
                            expect(await pm.started("test")).to.be.true;
                            expect(pid).to.be.not.equal(pid2);
                            expect(await OS.getProcess(pid2)).to.be.not.null;
                            await pm.stop("test");
                        });

                        it("should restart by config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.restart({
                                name: "test"
                            });
                            expect(await pm.started("test")).to.be.true;
                            await pm.stop("test");
                        });

                        it("should not throw if has not been started", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            await pm.restart("test");
                            expect(await pm.started("test")).to.be.true;
                            await pm.stop("test");
                        });

                        it("should update the config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            let c = await db.applications.findOne({ name: "test" });
                            expect(c.args).to.be.empty;
                            await pm.restart({
                                name: "test",
                                args: ["1"]
                            });
                            c = await db.applications.findOne({ name: "test" });
                            try {
                                expect(c.args).to.be.deep.equal(["1"]);
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should not update the config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            let c = await db.applications.findOne({ name: "test" });
                            expect(c.args).to.be.empty;
                            await pm.restart({
                                name: "test",
                                args: ["1"]
                            }, null, { store: false });
                            c = await db.applications.findOne({ name: "test" });
                            try {
                                expect(c.args).to.be.empty;
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should gracefully restart the app", async () => {
                            const name = isCluster ? "test_c" : "test";
                            await pm.start({
                                name,
                                path: fixture(isCluster ? "graceful_cluster_shutdown.js" : "graceful_shutdown.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await pm.restart(name, { graceful: true });
                                const stdout = await pm.stdoutPath(name);
                                const data = await adone.std.fs.readFileSync(stdout, "utf-8");
                                if (isCluster) {
                                    expect(data).to.be.equal("shutting down\n".repeat(4));
                                } else {
                                    expect(data).to.be.equal("graceful\n");
                                }
                            } finally {
                                await pm.stop(name).catch(adone.noop);
                            }
                        });
                    });

                    describe("delete", () => {
                        it("should delete the app", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            await pm.delete("test");
                            expect(await pm.hasApplication("test")).to.be.false;
                        });

                        it("should stop and delete the app", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            const pid = await p.pid();
                            await pm.delete("test");
                            expect(await OS.getProcess(pid)).to.be.null;
                        });

                        it("should stop the app gracefully and delete it", async () => {
                            const name = isCluster ? "test_c" : "test";
                            await pm.start({
                                name,
                                path: fixture(isCluster ? "graceful_cluster_shutdown.js" : "graceful_shutdown.js"),
                                mode,
                                instances: 4
                            });
                            const stdout = await pm.stdoutPath(name);
                            await pm.delete(name, { graceful: true });
                            const data = await adone.fs.readFile(stdout, { encoding: "utf-8" });
                            if (isCluster) {
                                expect(data).to.be.equal("shutting down\n".repeat(4));
                            } else {
                                expect(data).to.be.equal("graceful\n");
                            }
                        });

                        it("should delete by config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.delete({ name: "test" });
                            expect(await pm.hasApplication("test")).to.be.false;
                        });

                        it.skip("should clear the meta", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.delete({ name: "test" });
                            expect(await pm.hasApplication("test")).to.be.false;
                            expect(await pm.appmeta.has("test")).to.be.false;
                        });
                    });

                    describe("scale", () => {
                        if (!isCluster) {
                            it("should throw if the mode is not cluster", async () => {
                                await pm.start({
                                    name: "test",
                                    path: fixture("run_forever.js"),
                                    mode,
                                    instances: 4
                                });
                                let err;
                                try {
                                    await pm.scale("test", 10);
                                } catch (_err) {
                                    err = _err;
                                }
                                try {
                                    expect(err).to.be.instanceOf(x.IllegalState);
                                    expect(err.message).to.be.equal("Scaling is supported only in cluster mode");
                                } finally {
                                    await pm.stop("test");
                                }
                            });
                            return;
                        }
                        it("should scale the app", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await pm.scale("test", 10);
                                const workers = await p.workers();
                                expect(_.keys(workers)).to.have.lengthOf(10);
                                const ppid = await p.pid();
                                for (const { pid } of _.values(workers)) {
                                    const rp = await OS.getProcess(pid);
                                    expect(rp).to.be.not.null;
                                    expect(rp.getParentPID()).to.be.equal(ppid);
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should throw if not a suitable number is given", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                for (const value of [0, -1, -2, null, undefined, "asd", {}]) {
                                    let err;
                                    try {
                                        await pm.scale("test", value);
                                    } catch (_err) {
                                        err = _err;
                                    }
                                    expect(err).to.be.instanceOf(x.InvalidArgument);
                                    expect(err.message).to.be.equal("'instances' must be a non-negative integer");
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });
                    });

                    describe("getProcess", () => {
                        it("should return an interface", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                const ip = await pm.getProcess("test");
                                expect(ip.$def.name).to.be.equal(isCluster ? "IMainProcess" : "IProcess");
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should return by config", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                const ip = await pm.getProcess({ name: "test" });
                                expect(ip.$def.name).to.be.equal(isCluster ? "IMainProcess" : "IProcess");
                            } finally {
                                await pm.stop("test");
                            }
                        });
                    });

                    describe("uptime", () => {
                        it("should return the uptime", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await waitFor(() => pm.started("test"));
                                await adone.promise.delay(1000);
                                let uptime = await pm.uptime("test");
                                expect(uptime).to.be.an("object");
                                expect(uptime.main).to.be.at.least(1000);

                                if (isCluster) {
                                    expect(uptime.workers).to.be.an("object");
                                    expect(uptime.workers[0]).to.be.at.least(1000);
                                    expect(uptime.workers[1]).to.be.at.least(1000);
                                    expect(uptime.workers[2]).to.be.at.least(1000);
                                    expect(uptime.workers[3]).to.be.at.least(1000);
                                }

                                await adone.promise.delay(1000);
                                uptime = await pm.uptime("test");
                                expect(uptime.main).to.be.at.least(1000);
                                if (isCluster) {
                                    expect(uptime.workers[0]).to.be.at.least(2000);
                                    expect(uptime.workers[1]).to.be.at.least(2000);
                                    expect(uptime.workers[2]).to.be.at.least(2000);
                                    expect(uptime.workers[3]).to.be.at.least(2000);
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        if (isCluster) {
                            it("should return null if the worker is dead", async () => {
                                const p = await pm.start({
                                    name: "test",
                                    path: fixture("run_forever.js"),
                                    mode,
                                    instances: 4
                                });
                                try {
                                    await waitFor(() => pm.started("test"));
                                    await adone.promise.delay(1000);
                                    const workers = await p.workers();
                                    process.kill(workers[0].pid, "SIGKILL");
                                    await waitFor(async () => {
                                        const w = await p.workers();
                                        return !w[0].alive;
                                    });
                                    const uptime = await pm.uptime("test");
                                    expect(uptime.workers[0]).to.be.equal(null);
                                    expect(uptime.workers[1]).to.be.at.least(1000);
                                    expect(uptime.workers[2]).to.be.at.least(1000);
                                    expect(uptime.workers[3]).to.be.at.least(1000);
                                } finally {
                                    await pm.stop("test");
                                }
                            });
                        }

                        it("should throw if the app doesnt exist", async () => {
                            let err;
                            try {
                                await pm.uptime("test");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.instanceOf(adone.x.NotExists);
                            expect(err.message).to.be.equal("There is no such application");
                        });

                        it("should return null if the app is offline", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js")
                            });
                            await pm.stop("test");
                            const uptime = await pm.uptime("test");
                            expect(uptime).to.be.an("object");
                            expect(uptime).to.be.deep.equal({ main: null });
                        });

                        it("should work through the interface", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                await waitFor(() => pm.started("test"));
                                await adone.promise.delay(1000);
                                let uptime = await p.uptime();
                                expect(uptime).to.be.an("object");
                                expect(uptime.main).to.be.at.least(1000);

                                if (isCluster) {
                                    expect(uptime.workers).to.be.an("object");
                                    expect(uptime.workers[0]).to.be.at.least(1000);
                                    expect(uptime.workers[1]).to.be.at.least(1000);
                                    expect(uptime.workers[2]).to.be.at.least(1000);
                                    expect(uptime.workers[3]).to.be.at.least(1000);
                                }

                                await adone.promise.delay(1000);
                                uptime = await p.uptime();
                                expect(uptime.main).to.be.at.least(1000);
                                if (isCluster) {
                                    expect(uptime.workers[0]).to.be.at.least(2000);
                                    expect(uptime.workers[1]).to.be.at.least(2000);
                                    expect(uptime.workers[2]).to.be.at.least(2000);
                                    expect(uptime.workers[3]).to.be.at.least(2000);
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });
                    });

                    describe("usage", () => {
                        it("should return the usage info", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                const usage = await pm.usage("test");
                                expect(usage).to.be.an("object");
                                expect(usage.main).to.be.an("object");
                                expect(usage.main.cpu).to.be.a("number");
                                expect(usage.main.memory).to.be.a("number");
                                if (isCluster) {
                                    expect(usage.workers).to.be.an("object");
                                    const keys = Object.keys(usage.workers);
                                    expect(keys).to.have.lengthOf(4);
                                    for (const key of keys) {
                                        const v = usage.workers[key];
                                        expect(v).to.be.an("object");
                                        expect(v.cpu).to.be.a("number");
                                        expect(v.memory).to.be.a("number");
                                    }
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });

                        it("should return null if the app is offline", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            await pm.stop("test");
                            const usage = await pm.usage("test");
                            expect(usage.main.cpu).to.be.null;
                            expect(usage.main.memory).to.be.null;
                            expect(usage.workers).to.be.undefined;  // regardless the mode
                        });

                        it("should throw if there is no such app", async () => {
                            let err;
                            try {
                                await pm.usage("test");
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceof(x.NotExists);
                            expect(err.message).to.be.equal("There is no such application");
                        });

                        if (isCluster) {
                            it("should return null if the worker is offline", async () => {
                                const p = await pm.start({
                                    name: "test",
                                    path: fixture("run_forever.js"),
                                    mode,
                                    instances: 4
                                });
                                try {
                                    const workers = await p.workers();
                                    process.kill(workers[0].pid, "SIGKILL");
                                    process.kill(workers[3].pid, "SIGKILL");
                                    await adone.promise.delay(1000);
                                    const usage = await pm.usage("test");
                                    expect(usage.workers[0].cpu).to.be.null;
                                    expect(usage.workers[0].memory).to.be.null;
                                    expect(usage.workers[3].cpu).to.be.null;
                                    expect(usage.workers[3].memory).to.be.null;
                                } finally {
                                    await pm.stop("test");
                                }
                            });
                        }

                        it("should work through the interface", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode,
                                instances: 4
                            });
                            try {
                                const usage = await p.usage();
                                expect(usage).to.be.an("object");
                                expect(usage.main).to.be.an("object");
                                expect(usage.main.cpu).to.be.a("number");
                                expect(usage.main.memory).to.be.a("number");
                                if (isCluster) {
                                    expect(usage.workers).to.be.an("object");
                                    const keys = Object.keys(usage.workers);
                                    expect(keys).to.have.lengthOf(4);
                                    for (const key of keys) {
                                        const v = usage.workers[key];
                                        expect(v).to.be.an("object");
                                        expect(v.cpu).to.be.a("number");
                                        expect(v.memory).to.be.a("number");
                                    }
                                }
                            } finally {
                                await pm.stop("test");
                            }
                        });
                    });

                    describe("updateConfig", () => {
                        it("should update the app config", async () => {
                            await pm.start({
                                path: fixture("run_forever.js"),
                                name: "test"
                            });
                            await pm.stop("test");
                            await pm.updateConfig("test", {
                                name: "test2"
                            });
                            expect(await pm.hasApplication("test")).to.be.false;
                            expect(await pm.hasApplication("test2")).to.be.true;
                        });

                        it("should throw if the argument is not an object", async () => {
                            await pm.start({
                                path: fixture("run_forever.js"),
                                name: "test"
                            });
                            await pm.stop("test");
                            let err;
                            try {
                                await pm.updateConfig("test", 123);
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(adone.x.InvalidArgument);
                            expect(err.message).to.be.equal("Should be an object");
                        });

                        it("should throw if an app with that name already exists", async () => {
                            await pm.start({
                                path: fixture("run_forever.js"),
                                name: "test"
                            });
                            await pm.start({
                                path: fixture("run_forever.js"),
                                name: "test2"
                            });
                            await pm.stop("test");
                            await pm.stop("test2");
                            let err;
                            try {
                                await pm.updateConfig("test", {
                                    name: "test2"
                                });
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.instanceOf(adone.x.IllegalState);
                            expect(err.message).to.be.equal("An application with that name already exists");
                        });

                        it("should prevent id changing", async () => {
                            await pm.start({
                                path: fixture("run_forever.js"),
                                name: "test"
                            });
                            await pm.stop("test");
                            const config = await db.applications.findOne({ name: "test" });
                            await pm.updateConfig("test", {
                                id: 31337
                            });
                            expect(await db.applications.findOne({ name: "test" })).to.be.deep.equal(config);
                        });
                    });

                    describe("hasApplication", () => {
                        it("should return true", async () => {
                            await pm.start({
                                path: fixture("run_forever.js")
                            });
                            await pm.stop("run_forever");
                            expect(await pm.hasApplication("run_forever")).to.be.true;
                        });

                        it("should return false", async () => {
                            expect(await pm.hasApplication("hello")).to.be.false;
                        });

                        it("should return true by id", async () => {
                            await pm.start({
                                path: fixture("run_forever.js")
                            });
                            await pm.stop("run_forever");
                            expect(await pm.hasApplication(1)).to.be.true;
                        });

                        it("should return false by id", async () => {
                            expect(await pm.hasApplication(1)).to.be.false;
                        });

                        it("should return true by string id", async () => {
                            await db.applications.insert({ name: "hello", id: 1 });
                            expect(await pm.hasApplication("1")).to.be.true;
                        });

                        it("should return false by string id", async () => {
                            expect(await pm.hasApplication("1")).to.be.false;
                        });
                    });
                });
            }

            it("should correctly generate ids", async () => {
                await pm.start({
                    name: "test",
                    path: fixture("run_forever.js")
                });
                await pm.stop("test");
                expect(await db.applications.findOne({ name: "test" }, { id: 1, _id: 0 })).to.be.deep.equal({ id: 1 });
                await pm.start({
                    name: "test2",
                    path: fixture("run_forever.js")
                });
                await pm.stop("test2");
                expect(await db.applications.findOne({ name: "test2" }, { id: 1, _id: 0 })).to.be.deep.equal({ id: 2 });
                await pm.delete("test2");
                await pm.start({
                    name: "test2",
                    path: fixture("run_forever.js")
                });
                await pm.stop("test2");
                expect(await db.applications.findOne({ name: "test2" }, { id: 1, _id: 0 })).to.be.deep.equal({ id: 3 });
                await pm.delete("test");
                await pm.start({
                    name: "test3",
                    path: fixture("run_forever.js")
                });
                await pm.stop("test3");
                expect(await db.applications.findOne({ name: "test3" }, { id: 1, _id: 0 })).to.be.deep.equal({ id: 4 });
                await pm.delete("test3");
                await pm.delete("test2");
                await pm.start({
                    name: "test4",
                    path: fixture("run_forever.js")
                });
                await pm.stop("test4");
                expect(await db.applications.findOne({ name: "test4" }, { id: 1, _id: 0 })).to.be.deep.equal({ id: 5 });
            });

            describe("runtime", () => {
                afterEach("stopping applications", async () => {
                    const apps = await pm.list();
                    for (const { name } of apps) {
                        await pm.stop(name).catch(adone.noop);
                    }
                });

                describe("restoring", () => {
                    it("should restore a single process", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js")
                        });
                        const pid = await _p.pid();
                        try {
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;
                            await waitFor(() => pm.started("test"));
                            const p = await pm.getProcess("test");
                            expect(p.$def.name).to.be.equal("IProcess");
                            expect(await p.pid()).to.be.equal(pid);
                            expect(await p.ping()).to.be.equal("pong");
                        } finally {
                            const rp = new RemoteProcess(pid);
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                        }
                    });

                    it("should restore a cluster main process", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 4
                        });
                        const pid = await _p.pid();
                        try {
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;
                            await waitFor(() => pm.started("test"));
                            const p = await pm.getProcess("test");
                            expect(p.$def.name).to.be.equal("IMainProcess");
                            expect(await p.pid()).to.be.equal(pid);
                            expect(await p.ping()).to.be.equal("pong");
                            const workers = await p.workers();
                            expect(_.keys(workers)).to.have.lengthOf(4);
                        } finally {
                            const rp = new RemoteProcess(pid);
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                        }
                    });

                    it("should restore both apps", async () => {
                        const _p1 = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single",
                            interpreter: "node",
                            args: [],
                            instances: 4
                        });
                        const _p2 = await pm.start({
                            name: "test_cluster",
                            path: fixture("run_forever.js"),
                            mode: "cluster",
                            interpreter: "node",
                            args: [],
                            instances: 4
                        });
                        const [pid1, pid2] = await Promise.all([_p1.pid(), _p2.pid()]);
                        try {
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;
                            expect(await pm.hasApplication("test_cluster")).to.be.true;

                            await waitFor(() => pm.started("test"));

                            expect(await pm.started("test")).to.be.true;

                            await waitFor(() => pm.started("test_cluster"));

                            const p = await pm.getProcess("test");
                            const pc = await pm.getProcess("test_cluster");
                            expect(p.$def.name).to.be.equal("IProcess");
                            expect(pc.$def.name).to.be.equal("IMainProcess");
                            expect(await p.pid()).to.be.equal(pid1);
                            expect(await pc.pid()).to.be.equal(pid2);
                            expect(await p.ping()).to.be.equal("pong");
                            expect(await pc.ping()).to.be.equal("pong");
                            const workers = await pc.workers();
                            expect(_.keys(workers)).to.have.lengthOf(4);
                        } finally {
                            const rp = new RemoteProcess(pid1);
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                            const rpc = new RemoteProcess(pid2);
                            rpc.kill("SIGKILL");
                            await new Promise((resolve) => rpc.on("exit", resolve));
                        }
                    });

                    it("should not restore a process if the config doesnt exist", async () => {

                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js")
                        });
                        const pid = await _p.pid();
                        await db.applications.remove({});  // delete all the apps, why not?
                        try {
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.false;
                        } finally {
                            const rp = new RemoteProcess(pid);
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                        }
                    });

                    it("should kill the process if attaching fails", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single"
                        });
                        const pid = await _p.pid();
                        try {
                            // just change the port to fail the attaching
                            await db.applications.update({ name: "test" }, { $set: { port: is.windows ? "\\\\.\\pipe\\such_a_file_shouldnt_exist_12345$.sock" : "such_a_file_shouldnt_exist_12345$.sock" } });
                            expect(RemoteProcess.alive(pid)).to.be.true;
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;
                            await waitFor(() => !RemoteProcess.alive(pid));
                        } catch (err) {
                            const rp = new RemoteProcess(pid);
                            if (rp.alive) {
                                rp.kill("SIGKILL");
                                await new Promise((resolve) => rp.on("exit", resolve));
                            }
                            throw err;
                        }
                    });

                    it("should restart the process if it has died", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single",
                            autorestart: true,
                            maxRestarts: 1
                        });
                        const pid = await _p.pid();
                        await omnitronRunner.stopOmnitron({ clean: false, killChildren: false });
                        const rp = new RemoteProcess(pid);
                        rp.kill("SIGKILL");
                        await new Promise((resolve) => rp.on("exit", resolve));
                        await restartOmnitron();
                        expect(await pm.hasApplication("test")).to.be.true;

                        await waitFor(() => pm.started("test"));

                        const p = await pm.getProcess("test");
                        try {
                            expect(p.pid()).to.be.not.equal(pid);
                            expect(await p.ping()).to.be.equal("pong");
                        } finally {
                            await pm.stop("test");
                        }
                    });

                    it("should not restart the process if it has died", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single"
                        });
                        const pid = await _p.pid();
                        const rp = new RemoteProcess(pid);
                        rp.kill("SIGKILL");
                        await new Promise((resolve) => rp.on("exit", resolve));
                        await restartOmnitron();
                        expect(await pm.hasApplication("test")).to.be.true;
                        for (let i = 0; i < 5; ++i) {
                            await adone.promise.delay(1000);
                            expect(await pm.started("test")).to.be.false;
                        }
                    });

                    it("should not kill the process if the timestamp is wrong", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single"
                        });
                        const pid = await _p.pid();
                        const rp = new RemoteProcess(pid);
                        try {
                            // just change the timestamp to make it wrong
                            await db.runtime.update({ pid }, {
                                $inc: {
                                    "timestamps.started": -60 * 1000
                                }
                            });
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;
                            for (let i = 0; i < 5; ++i) {
                                await adone.promise.delay(1000);
                                expect(await pm.started("test")).to.be.false;
                                expect(rp.alive).to.be.true;
                            }
                        } finally {
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                        }
                    });

                    it("should not kill the prev process and start a new one if the timestamp is wrong", async () => {
                        const _p = await pm.start({
                            name: "test",
                            path: fixture("run_forever.js"),
                            mode: "single",
                            autorestart: true,
                            maxRestarts: 1
                        });
                        const pid = await _p.pid();
                        const rp = new RemoteProcess(pid);

                        try {
                            // just change the timestamp to make it wrong
                            await db.runtime.update({ pid }, {
                                $inc: {
                                    "timestamps.started": -60 * 1000
                                }
                            });
                            await restartOmnitron();
                            expect(await pm.hasApplication("test")).to.be.true;

                            await waitFor(() => pm.started("test"));

                            expect(await pm.started("test")).to.be.true;
                            const p = await pm.getProcess("test");
                            try {
                                expect(await p.pid()).to.be.not.equal(rp.pid);
                                expect(await p.ping()).to.be.equal("pong");
                            } finally {
                                await pm.stop("test");
                            }
                            expect(rp.alive).to.be.true;
                        } finally {
                            rp.kill("SIGKILL");
                            await new Promise((resolve) => rp.on("exit", resolve));
                        }
                    });
                });

                describe("restarting", () => {
                    it("should restart the app if it falls", async () => {
                        await pm.start({
                            name: "test",
                            path: fixture("print_identity_and_live_forever.js"),
                            args: ["hello"],
                            autorestart: true
                        });
                        expect(await pm.started("test")).to.be.true;
                        try {
                            let p = await pm.getProcess("test");
                            p.kill("SIGKILL");
                            await adone.promise.delay(1000);

                            await waitFor(() => pm.started("test"));

                            p = await pm.getProcess("test");
                            p.kill("SIGKILL");
                            await adone.promise.delay(1000);
                            for (; !await pm.started("test");) {
                                await adone.promise.delay(100);
                            }
                        } finally {
                            await pm.stop("test").catch(adone.noop);
                        }
                    });

                    describe("single", () => {
                        it("should try to start app with delays", async () => {
                            const t = new Date().getTime();
                            let err = null;
                            try {
                                await pm.start({
                                    name: "test",
                                    path: fixture("invalid_script.js"),
                                    args: [],
                                    autorestart: true,
                                    maxRestarts: 2,
                                    restartDelay: 2000
                                });
                            } catch (_err) {
                                err = _err;
                            }
                            expect(err).to.be.ok;
                            expect(new Date().getTime() - t).to.be.at.least(4000);
                        });

                        it("should stop restarting if it doesnt start normally", async () => {
                            const tmp = await FS.createTempFile();
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "single",
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 5000,
                                restartDelay: 1,
                                args: ["hello", tmp.path()]
                            });
                            try {
                                let p = await pm.getProcess("test");
                                expect(await p.alive()).to.be.true;
                                process.kill(await p.pid(), "SIGKILL");  // #1 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");
                                process.kill(await p.pid(), "SIGKILL");  // #2 restarting
                                await adone.promise.delay(500);

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");
                                process.kill(await p.pid(), "SIGKILL");  // #3 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");   // should be still alive
                                process.kill(await p.pid(), "SIGKILL");  // #4 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(async () => !await pm.started("test"));

                                for (let i = 0; i < 5; ++i) {  // should not be alive
                                    await adone.promise.delay(1000);
                                    expect(await pm.started("test")).to.be.false;
                                }
                            } finally {
                                await tmp.unlink();
                                await pm.stop("test").catch(adone.noop);
                            }
                        });

                        it("should reset the counter if starts normally", async () => {
                            const tmp = await FS.createTempFile();
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "single",
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 100,
                                restartDelay: 1,
                                args: ["hello", tmp.path()]
                            });
                            try {
                                let p = await pm.getProcess("test");
                                expect(await p.alive()).to.be.true;

                                await adone.promise.delay(300);
                                process.kill(await p.pid(), "SIGKILL");  // #1 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");
                                await adone.promise.delay(300);
                                process.kill(await p.pid(), "SIGKILL");  // #2 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");
                                await adone.promise.delay(300);
                                process.kill(await p.pid(), "SIGKILL");  // #3 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));

                                p = await pm.getProcess("test");
                                await adone.promise.delay(300);
                                process.kill(await p.pid(), "SIGKILL");  // #4 restarting

                                await waitFor(async () => !await p.alive());
                                await waitFor(() => pm.started("test"));
                            } finally {
                                await tmp.unlink();
                                await pm.stop("test").catch(adone.noop);
                            }
                        });

                        it("should interrupt the restaring process if the app is stopping", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "single",
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 5000,
                                restartDelay: 1
                            });
                            await pm.stop("test");
                            await waitFor(async () => !await pm.started("test"));
                        });

                        it("should interrupt the restarting process if the app stops when the restarting process is active", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("print_timestamp_and_exit_in_500ms.js"),
                                autorestart: true,
                                maxRestarts: 2,
                                restartDelay: 10000,
                                normalStart: 2000
                            });
                            await adone.promise.delay(1000);
                            let [app] = await pm.list();
                            expect(app.state).to.be.equal("waiting_for_restart");
                            await pm.stop("test");
                            await adone.promise.delay(2000);
                            [app] = await pm.list();
                            expect(app.state).to.be.oneOf(["stopped", "stopping"]);
                        });

                        it("should interrupt the restarting process if the app failed to start, starts the restarting process and is stopped while waiting", async () => {
                            let e = pm.start({
                                name: "test",
                                path: fixture("invalid_script.js"),
                                autorestart: true,
                                maxRestarts: 200,
                                restartDelay: 3000,
                                normalStart: 1000
                            }).then(() => null, (err) => e = err);
                            await adone.promise.delay(1000);
                            await waitFor(async () => {
                                const [app] = await pm.list();
                                return app.state === "waiting_for_restart";
                            });
                            await pm.stop("test");
                            await waitFor(async () => {
                                const [app] = await pm.list();
                                return app.state === "stopped";
                            });
                            e = await e;
                            expect(e).to.be.instanceOf(adone.x.Exception);
                            expect(e.message).to.be.equal("Was stopped while starting");
                        });

                        it.skip("should clear the normal timeout if it stops before", async () => {
                            // dont know how to check it clearly but it will block the event loop anyway
                            await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "single",
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 999931337,  // to find it then
                                restartDelay: 1
                            });
                            await pm.stop("test");
                            await adone.promise.delay(1000);
                            expect(await pm.started("test")).to.be.false;
                        });

                        it("ensure it restarts the programm if it starts normally", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("print_timestamp_and_exit_in_500ms.js"),
                                autorestart: true,
                                maxRestarts: 2,
                                restartDelay: 500,
                                normalStart: 200
                            });

                            for (; ;) {
                                const [app] = await pm.list();
                                if (app.restarts > 2) {
                                    break;
                                }
                                await adone.promise.delay(500);
                            }
                        });

                        it("ensure it restarts the programm after the delay", async () => {
                            await pm.start({
                                name: "test",
                                path: fixture("print_timestamp_and_exit_in_500ms.js"),
                                args: [],
                                autorestart: true,
                                maxRestarts: 2,
                                restartDelay: 1000,
                                normalStart: 500
                            });
                            const stdout = new adone.fs.File(await pm.stdoutPath("test"));
                            for (; ;) {
                                const t = (await stdout.content()).split("\n").slice(1, -1).map(Number);
                                // stop, start, stop, start
                                for (let i = 1; i < t.length; i += 2) {
                                    expect(t[i] - t[i - 1]).to.be.at.least(1000);
                                }
                                if (t.length > 6) {
                                    break;
                                }
                            }
                            await pm.stop("test");
                        });
                    });

                    describe("workers", () => {
                        it("should restart the workers if they fall", async () => {
                            const p = await pm.start({
                                name: "test",
                                path: fixture("print_identity_and_live_forever.js"),
                                mode: "cluster",
                                instances: 4,
                                autorestart: true
                            });
                            const workers = await p.workers();
                            process.kill(workers[0].pid);
                            await waitFor(async () => {
                                const workers = await p.workers();
                                return _.values(workers).filter((x) => x.alive).length === 4;
                            });
                        });

                        it("should use the restarting delay when restarts the workers", async () => {
                            const f = fixture("dynamic.js");
                            await adone.fs.writeFile(f, `
                                setInterval(() => {}, 1000);
                            `);
                            const p = await pm.start({
                                name: "test",
                                path: f,
                                mode: "cluster",
                                instances: 4,
                                autorestart: true,
                                restartDelay: 2500
                            });
                            try {
                                const workers = await p.workers();
                                const t = new Date().getTime();
                                await adone.fs.writeFile(f, `
                                    process.exit(1);
                                `);
                                process.kill(workers[0].pid);
                                await adone.promise.delay(500);
                                await adone.fs.writeFile(f, `
                                    setInterval(() => {}, 1000);
                                `);
                                await waitFor(async () => {
                                    const workers = await p.workers();
                                    return workers[0].alive;
                                });
                                expect(new Date().getTime() - t).to.be.at.least(2500);
                            } finally {
                                await pm.stop("test");
                                await adone.fs.unlink(f).catch(adone.noop);
                            }
                        });

                        it("should stop restarting if it doesnt start normally", async () => {
                            const tmp = await FS.createTempFile();
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "cluster",
                                instances: 4,
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 5000,
                                restartDelay: 1,
                                args: ["hello", tmp.path()]
                            });
                            try {
                                let w = await p.workers();
                                let pid = w[0].pid;

                                expect(w[0].alive).to.be.true;
                                process.kill(pid, "SIGKILL");  // #1 restarting
                                await waitFor(() => !RemoteProcess.alive(pid));
                                await waitFor(async () => {
                                    w = await p.workers();
                                    return w[0].pid !== pid && w[0].alive;
                                });

                                process.kill(w[0].pid, "SIGKILL");  // #2 restarting

                                pid = w[0].pid;
                                await waitFor(() => !RemoteProcess.alive(pid));
                                await waitFor(async () => {
                                    w = await p.workers();
                                    return w[0].pid !== pid && w[0].alive;
                                });

                                process.kill(w[0].pid, "SIGKILL");  // #3 restarting

                                pid = w[0].pid;
                                await waitFor(() => !RemoteProcess.alive(pid));
                                await waitFor(async () => {
                                    w = await p.workers();
                                    return w[0].pid !== pid && w[0].alive;
                                });

                                process.kill(w[0].pid, "SIGKILL");  // #4 restarting

                                pid = w[0].pid;
                                await waitFor(() => !RemoteProcess.alive(pid));
                                await waitFor(async () => {
                                    w = await p.workers();
                                    return !w[0].alive;
                                });

                                for (let i = 0; i < 5; ++i) {
                                    await adone.promise.delay(1000);
                                    w = await p.workers();
                                    expect(w[0].alive).to.be.false;  // should not be alive
                                }
                            } finally {
                                await tmp.unlink();
                                await pm.stop("test").catch(adone.noop);
                            }
                        });

                        it("should interrupt the restaring process if the app is stopping", async () => {
                            // it is obvious, they will die if the app is stopped
                            const p = await pm.start({
                                name: "test",
                                path: fixture("run_forever.js"),
                                mode: "cluster",
                                instances: 4,
                                autorestart: true,
                                maxRestarts: 3,
                                normalStart: 5000,
                                restartDelay: 1
                            });
                            await pm.stop("test");
                            await waitFor(async () => {
                                const w = await p.workers();
                                return _.values(w).every((x) => !x.alive);
                            });
                        });
                    });
                });

                describe("startup", () => {
                    it("should start the app if the pm starts", async () => {
                        await pm.start({
                            path: fixture("run_forever.js"),
                            name: "test",
                            startup: true
                        });
                        await pm.stop("test");
                        await restartOmnitron();
                        await waitFor(() => pm.started("test"));
                        await pm.stop("test");
                    });
                });

                it.skip("should kill the main process if the last worker is died", async () => {

                });
            });
        });

        describe.skip("configs", () => {
            let pm = null;
            let odb = null;
            let defaultProcessConfig = null;
            const db = { applications: null, runtime: null };
            let basePath;
            let omnitron;

            beforeEach(async () => {
                logger.mute();

                omnitron = new WeakOmnitron();

                const omnitronRunner = new OmnitronRunner();

                await omnitronRunner.run();

                await omnitronRunner.createDispatcher({ omnitron });

                await omnitronRunner.dispatcher.spawn(false);

                basePath = await this.omnitron.config.omnitron.getServicePath("pm", "apps");
                odb = await omnitronRunner.context("db");
                pm = await omnitronRunner.context("pm");
                basePath = pm.basePath;

                defaultProcessConfig = {
                    args: [],
                    env: {},
                    mode: "single",
                    startup: false,
                    autorestart: false,
                    maxRestarts: 3,
                    restartDelay: 0,
                    killTimeout: 1600,
                    normalStart: 1000
                };

                db.applications = await odb.getDatastore({
                    filename: "pm-applications"
                });
                db.runtime = await odb.getDatastore({
                    filename: "pm-runtime"
                });
            });

            afterEach(() => {
                return omnitron.exit();
            });

            describe("prepareConfig", () => {
                it("should throw if the path is falsy", () => {
                    let err;
                    try {
                        pm.prepareConfig({});
                    } catch (_err) {
                        err = _err;
                    }
                    expect(err).to.be.instanceOf(x.InvalidArgument);
                    expect(err.message).to.be.equal("Path is required");
                });

                it("should set the name", () => {
                    let c = pm.prepareConfig({
                        path: "/some/path/to/script.js",
                        interpreter: "node"
                    });
                    expect(c.name).to.be.equal("script");
                    c = pm.prepareConfig({
                        path: "/some/path/to/script.custom",
                        interpreter: "node"
                    });
                    expect(c.name).to.be.equal("script");
                });

                it("should set the interpreter", () => {
                    const c = pm.prepareConfig({
                        path: "/some/path/to/script.js"
                    });
                    expect(c.interpreter).to.be.equal("node");
                });

                it("should throw if the interpreter is not node and the mode is cluster", () => {
                    let err;
                    try {
                        pm.prepareConfig({
                            path: "/some/path/to/script.js",
                            interpreter: "custom",
                            mode: "cluster"
                        });
                    } catch (_err) {
                        err = _err;
                    }
                    expect(err).to.be.instanceOf(x.IllegalState);
                    expect(err.message).to.be.equal("Cluster mode is supported only for NodeJS applications");
                });

                it("should set the app storage path", () => {
                    const c = pm.prepareConfig({
                        path: "test.js"
                    });
                    expect(c.storage).to.be.equal(path.join(basePath, "test"));
                });

                it("should set the stdout path", () => {
                    const c = pm.prepareConfig({
                        path: "test.js"
                    });
                    expect(c.stdout).to.be.equal(path.join(basePath, "test", "logs", "stdout.log"));
                });

                it("should set the stderr path", () => {
                    const c = pm.prepareConfig({
                        path: "test.js"
                    });
                    expect(c.stderr).to.be.equal(path.join(basePath, "test", "logs", "stderr.log"));
                });

                it("should set the port path", () => {
                    const c = pm.prepareConfig({
                        path: "test.js"
                    });
                    if (is.windows) {
                        expect(c.port).to.be.equal(`\\\\.\\pipe\\${path.join(basePath, "test", "port.sock")}`);
                    } else {
                        expect(c.port).to.be.equal(path.join(basePath, "test", "port.sock"));
                    }
                });

                it("should set the defaults", () => {
                    let c = pm.prepareConfig({
                        path: "test.js"
                    });
                    c = _.pick(c, Object.keys(defaultProcessConfig));
                    expect(c).to.be.deep.equal(defaultProcessConfig);
                });

                it("should override the id", () => {
                    const c = pm.prepareConfig({
                        path: "test.js",
                        id: 1337
                    });
                    expect(c.id).to.not.be.equal(1337);
                });

                it("should set instances", () => {
                    const n = defaultProcessConfig.instances;
                    delete defaultProcessConfig.instances;
                    const c = pm.prepareConfig({
                        path: "test.js",
                        mode: "cluster"
                    });
                    try {
                        expect(c.instances).to.be.equal(adone.std.os.cpus().length);
                    } finally {
                        defaultProcessConfig.instances = n;
                    }
                });
            });

            describe("storeDBConfig", () => {
                it("should store the config in the app db", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    expect(await db.applications.findOne({ path: "test.js" })).to.be.ok;
                });
            });

            describe("updateDBConfig", () => {
                it("should update the config in the app db", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    c.path = "test2.js";
                    await pm.updateDBConfig(c);
                    expect(await db.applications.findOne({ path: "test.js" })).to.be.not.ok;
                    expect(await db.applications.findOne({ path: "test2.js" })).to.be.ok;
                });
            });

            function equal(a, b) {
                if (is.array(a)) {
                    if (!is.array(b)) {
                        return false;
                    }
                    if (a.length !== b.length) {
                        return false;
                    }
                    for (let i = 0; i < a.length; ++i) {
                        if (!equal(a[i], b[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                if (is.object(a)) {
                    if (!is.object(b)) {
                        return false;
                    }
                    for (const [k, v] of adone.util.entries(a)) {
                        if (!equal(v, b[k])) {
                            return false;
                        }
                    }
                    return true;
                }
                return a === b;
            }

            describe("getConfigFor", () => {
                it("should return the app config", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.getConfigFor("test");
                    expect(equal(c, c2)).to.be.true;
                });

                it("should return null if there is no such config", async () => {
                    const c = await pm.getConfigFor("test");
                    expect(c).to.be.null;
                });
            });

            describe("getConfigByID", () => {
                it("should return the app config", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.getConfigByID(1);
                    expect(equal(c, c2)).to.be.true;
                });

                it("should return null if there is no such config", async () => {
                    const c = await pm.getConfigByID(1);
                    expect(c).to.be.null;
                });
            });

            describe("deriveConfig", () => {
                it("should return a config by name", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.deriveConfig("test");
                    expect(equal(c, c2)).to.be.true;
                });

                it("should throw if there is no such config", async () => {
                    let err;
                    try {
                        await pm.deriveConfig("test");
                    } catch (_err) {
                        err = _err;
                    }
                    expect(err).to.be.instanceOf(x.NotExists);
                    expect(err.message).to.be.equal("There is no such application");
                });

                it("should return a config by object", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.deriveConfig({ name: "test" });
                    expect(equal(c, c2)).to.be.true;
                });

                it("should store the config", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.deriveConfig(c, true);
                    expect(await db.applications.findOne({ path: "test.js" })).to.be.ok;
                });

                it("should not store the config", async () => {
                    const c = await pm.deriveConfig({ path: "test.js" });
                    const d = _.pick(c, ["name", "path", "interpreter"]);
                    expect(d).to.be.deep.equal({ name: "test", path: "test.js", interpreter: "node" });
                    expect(await db.applications.count()).to.be.equal(0);
                });

                it("should update the config", async () => {
                    const c = pm.prepareConfig({ path: "test.js", instances: 100 });
                    await pm.deriveConfig(c, true);
                    c.instances = 10;
                    await pm.deriveConfig(c, true);
                    expect(await db.applications.findOne({ path: "test.js", instances: 100 })).to.be.not.ok;
                    expect(await db.applications.findOne({ path: "test.js", instances: 10 })).to.be.ok;
                    expect(equal(await pm.getConfigFor("test"), c)).to.be.true;
                });

                it("should not update the config", async () => {
                    const c = await pm.deriveConfig({ path: "test.js" }, true);
                    const d = await pm.deriveConfig({ name: "test", instances: 100500 });
                    expect(d).to.be.not.deep.equal(c);
                    expect(d.instances).to.be.equal(100500);
                    const c1 = _.omit(c, ["instances"]);
                    const d1 = _.omit(d, ["instances"]);
                    expect(equal(c1, d1)).to.be.true;
                });

                it("should return a config by IProcess", async () => {
                    const ip = new IProcess({}, { config: { name: "test", id: 1 } });
                    const c = await pm.deriveConfig({ path: "test.js" }, true);
                    const c2 = await pm.deriveConfig(ip);
                    expect(equal(c, c2)).to.be.true;
                });

                it("should return a config by IMainProcess", async () => {
                    const ip = new IMainProcess({}, { config: { name: "test", id: 1 } });
                    const c = await pm.deriveConfig({ path: "test.js" }, true);
                    const c2 = await pm.deriveConfig(ip);
                    expect(equal(c, c2)).to.be.true;
                });

                it("should return a config by an id", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.deriveConfig(1);
                    expect(equal(c, c2)).to.be.true;
                });

                it("should return a config by a string id", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    const c2 = await pm.deriveConfig("1");
                    expect(equal(c, c2)).to.be.true;
                });

                it("should prioretize ids over names", async () => {
                    const c = pm.prepareConfig({ path: "test.js" });
                    await pm.storeDBConfig(c);
                    pm.prepareConfig({ name: "1", path: "test.js" });
                    const c2 = await pm.deriveConfig("1");
                    expect(equal(c, c2)).to.be.true;
                });
            });
        });
    });
});
