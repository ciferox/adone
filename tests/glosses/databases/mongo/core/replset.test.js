import {
    Server as ServerManager
} from "mongodb-topology-manager";
import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const promisify = adone.promise.promisify;

describe("mongodb", function () {
    this.timeout(120000);

    const { database: { mongo: { core: { Server, ReplSetState, MongoError, ReadPreference, Connection, ReplSet } } } } = adone;

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        await promisify(mongodbVersionManager)();
        const version = await promisify(mongodbVersionManager.current)();
        adone.info(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("replset server selection", () => {
        function convert(mode) {
            if (mode.toLowerCase() === "primarypreferred") {
                return "primaryPreferred";
            }
            if (mode.toLowerCase() === "secondarypreferred") {
                return "secondaryPreferred";
            }
            return mode.toLowerCase();
        }

        async function executeEntry(entry, path) {
            const file = JSON.parse(await adone.fs.readFile(path));
            // Let's pick out the parts of the selection specification
            const topology_description = file.topology_description;
            const in_latency_window = file.in_latency_window;
            const read_preference = file.read_preference;

            // Create a Replset and populate it with dummy topology servers
            const replset = new ReplSetState();
            replset.topologyType = topology_description.type;
            // For each server add them to the state
            topology_description.servers.forEach((s) => {
                const server = new Server({
                    host: s.address.split(":")[0],
                    port: parseInt(s.address.split(":")[1], 10)
                });

                // Add additional information
                if (s.avg_rtt_ms) {
                    server.lastIsMasterMS = s.avg_rtt_ms;
                }
                if (s.tags) {
                    server.ismaster = {
                        tags: s.tags
                    };
                }
                // Ensure the server looks connected
                server.isConnected = () => true;

                if (s.type === "RSSecondary") {
                    replset.secondaries.push(server);
                } else if (s.type === "RSPrimary") {
                    replset.primary = server;
                } else if (s.type === "RSArbiter") {
                    replset.arbiters.push(server);
                }
            });

            // Create read preference
            const rp = new ReadPreference(convert(read_preference.mode), read_preference.tag_sets);
            // Perform a pickServer
            const server = replset.pickServer(rp);
            let found_window = null;

            // server should be in the latency window
            for (let i = 0; i < in_latency_window.length; i++) {
                const w = in_latency_window[i];

                if (server.name === w.address) {
                    found_window = w;
                    break;
                }
            }
            // console.log("--- 0")
            // console.dir(found_window)
            // console.dir(server)

            if (["ReplicaSetNoPrimary", "Primary", "ReplicaSetWithPrimary"].indexOf(topology_description.type) !== -1 &&
                in_latency_window.length === 0) {
                // console.log("########################################")
                if (server instanceof MongoError) {
                    expect(server.message).to.be.equal("no primary server available");
                } else {
                    expect(server).to.be.null;
                }
                //
            } else {
                expect(found_window).not.to.be.null;
            }
        }

        {
            const path = adone.std.path.join(__dirname, "tests", "server-selection", "tests", "server_selection", "ReplicaSetNoPrimary", "read");

            const entries = adone.std.fs.readdirSync(path).filter((x) => {
                return x.indexOf(".json") !== -1;
            });
            describe("Should correctly execute server selection tests ReplicaSetNoPrimary", () => {
                for (const x of entries) {
                    it(x, () => {
                        return executeEntry(x, adone.std.path.join(path, x));
                    });
                }
            });
        } {
            const path = adone.std.path.join(__dirname, "tests", "server-selection", "tests", "server_selection", "ReplicaSetWithPrimary", "read");

            const entries = adone.std.fs.readdirSync(path).filter((x) => {
                return x.indexOf(".json") !== -1;
            });

            describe("Should correctly execute server selection tests ReplicaSetWithPrimary", () => {
                for (const x of entries) {
                    it(x, () => {
                        return executeEntry(x, adone.std.path.join(path, x));
                    });
                }
            });
        }
    });

    describe("replset state", () => {
        async function executeEntry(path) {
            // Read and parse the json file
            const file = JSON.parse(await adone.fs.readFile(path));
            // Unpack entry
            const uri = file.uri;
            const phases = file.phases;

            // Get replicaset name if any
            const match = uri.match(/replicaSet\=[a-z|A-Z|0-9]*/);
            // console.log("============ 0")
            const replicaSet = match ? match.toString().split(/=/)[1] : null;
            // Replicaset
            // console.log(replicaSet)

            // Create a replset state
            const state = new ReplSetState({
                setName: replicaSet
            });

            // Get all the server instances
            const parts = uri.split("mongodb://")[1].split("/")[0].split(",");
            // For each of the servers
            parts.forEach((x) => {
                const params = x.split(":");
                // console.dir(params)
                // console.log(f('%s:%s', params[0], params[1] ? parseInt(params[1]) :  27017))
                state.update({
                    name: `${params[0]}:${params[1] ? parseInt(params[1]) : 27017}`,
                    lastIsMaster: () => null,
                    equals(s) {
                        if (typeof s === "string") {
                            return s === this.name;
                        }
                        return s.name === this.name;
                    },
                    destroy: adone.noop
                });
            });

            // console.log(parts)

            // Run each phase
            phases.forEach((x) => {
                executePhase(state, x);
            });
        }

        function executePhase(state, phase) {
            const responses = phase.responses;
            const outcome = phase.outcome;

            // Apply all the responses
            responses.forEach((x) => {
                if (Object.keys(x[1]).length === 0) {
                    state.remove({
                        name: x[0],
                        lastIsMaster: adone.noop,
                        equals(s) {
                            if (typeof s === "string") {
                                return s === this.name;
                            }
                            return s.name === this.name;
                        },
                        destroy: adone.noop
                    });
                } else {
                    const ismaster = x[1];
                    if (ismaster.electionId) {
                        ismaster.electionId = new adone.data.bson.ObjectID(ismaster.electionId.$oid);
                    }

                    state.update({
                        name: x[0],
                        lastIsMaster: () => ismaster,
                        equals(s) {
                            if (typeof s === "string") {
                                return s === this.name;
                            }
                            return s.name === this.name;
                        },
                        destroy: adone.noop
                    });
                }
            });

            // Validate the state of the final outcome
            for (const name in outcome.servers) {
                if (outcome.servers[name].electionId) {
                    outcome.servers[name].electionId = new adone.data.bson.ObjectID(outcome.servers[name].electionId.$oid);
                }
                expect(state.set[name]).to.be.ok;
                for (const n in outcome.servers[name]) {
                    if (outcome.servers[name][n]) {
                        expect(outcome.servers[name][n]).to.be.deep.equal(state.set[name][n]);
                    }
                }
            }

            expect(outcome.topologyType).to.be.equal(state.topologyType);
            expect(outcome.setName).to.be.equal(state.setName);
        }

        const path = adone.std.path.join(__dirname, "tests", "topology_test_descriptions", "rs");

        const entries = adone.std.fs.readdirSync(path).filter((x) => {
            return x.indexOf(".json") !== -1;
        });
        describe("Should correctly execute server selection tests ReplicaSetNoPrimary", () => {
            for (const x of entries) {
                it(x, () => {
                    return executeEntry(adone.std.path.join(path, x));
                });
            }
        });
    });

    describe("replset", () => {
        before(function () {
            this.timeout(120000);
            configuration.useReplicaSet = true;
            return configuration.start();
        });

        after(function () {
            this.timeout(120000);
            configuration.useReplicaSet = false;
            return configuration.stop();
        });

        specify("Discover arbiters", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            // Attempt to connect
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            await new Promise((resolve) => {
                server.on("joined", (_type) => {
                    if (_type === "arbiter") {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Discover passives", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            // Attempt to connect
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            await new Promise((resolve) => {
                server.on("joined", (_type, _server) => {
                    if (_type === "secondary" && _server.lastIsMaster().passive) {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Discover primary", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            // Attempt to connect
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            await new Promise((resolve) => {
                server.on("joined", (_type) => {
                    if (_type === "primary") {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Discover secondaries", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            // Attempt to connect
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            let count = 0;
            await new Promise((resolve) => {
                server.on("joined", (_type) => {
                    if (_type === "secondary") {
                        ++count;
                    }
                    if (count === 2) {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Replica set discovery", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            // Attempt to connect
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            const state = {
                primary: 1,
                secondary: 2,
                arbiter: 1,
                passive: 1
            };
            await new Promise((resolve) => {
                server.on("joined", (_type, _server) => {
                    if (_type === "secondary" && _server.lastIsMaster().passive) {
                        --state.passive;
                    } else {
                        --state[_type];
                    }
                    if (state.primary === 0 && state.secondary === 0 && state.arbiter === 0 && state.passive === 0) {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Host list differs from seeds", async () => {
            const manager = await configuration.manager.primary();

            Connection.enableConnectionAccounting();
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }, {
                host: "localhost",
                port: 41000
            }], {
                setName: configuration.setName
            });
            const state = {
                primary: 1,
                secondary: 2,
                arbiter: 1,
                passive: 1
            };
            await new Promise((resolve) => {
                server.on("joined", (_type, _server) => {
                    if (_type === "secondary" && _server.lastIsMaster().passive) {
                        --state.passive;
                    } else {
                        --state[_type];
                    }
                    if (state.primary === 0 && state.secondary === 0 && state.arbiter === 0 && state.passive === 0) {
                        resolve();
                    }
                });
                server.connect();
            });
            server.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        specify("Ghost discovered/Member brought up as standalone", async function () {
            this.timeout(300000);
            const primaryManager = await configuration.manager.primary();
            const managers = await configuration.manager.secondaries();
            const serverManager = managers[0];
            await serverManager.stop();

            const nonReplSetMember = new ServerManager("mongod", {
                bind_ip: serverManager.host,
                port: serverManager.port,
                dbpath: serverManager.options.dbpath
            });
            await nonReplSetMember.start();

            const config = [{
                host: primaryManager.host,
                port: primaryManager.port
            }];

            const options = {
                setName: configuration.setName
            };

            await configuration.manager.waitForPrimary();
            Connection.enableConnectionAccounting();
            const replset = new ReplSet(config, options);
            const state = {
                primary: 1,
                secondary: 1,
                arbiter: 1,
                passive: 1
            };
            await new Promise((resolve) => {
                replset.on("joined", (_type, _server) => {
                    if (_type === "secondary" && _server.lastIsMaster().passive) {
                        --state.passive;
                    } else {
                        --state[_type];
                    }
                    if (state.primary === 0 && state.secondary === 0 && state.arbiter === 0 && state.passive === 0) {
                        resolve();
                    }
                });
                replset.connect();
            });
            replset.destroy();
            await adone.promise.delay(1000);
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
            await nonReplSetMember.stop();
            await serverManager.start();
            await configuration.manager.restart(9, {
                waitMS: 2000
            });
        });

        specify("Member removed by reconfig", async function () {
            this.timeout(300000);
            const primaryServerManager = await configuration.manager.primary();
            const managers = await configuration.manager.secondaries();
            const secondaryServerManager = managers[0];

            const config = [{
                host: primaryServerManager.host,
                port: primaryServerManager.port
            }];

            const options = {
                setName: configuration.setName
            };

            Connection.enableConnectionAccounting();
            const server = new ReplSet(config, options);
            await new Promise((resolve) => {
                server.on("fullsetup", resolve);
                server.connect();
            });
            try {
                const numberOfSecondaries = server.s.replicaSetState.secondaries.length;
                await new Promise((resolve) => {
                    server.on("left", (_t, _server) => {
                        if (_server.s.options.port === secondaryServerManager.options.port) {
                            resolve();
                        }
                    });
                    configuration.manager.removeMember(secondaryServerManager, {
                        returnImmediately: false,
                        force: false,
                        skipWait: true
                    });
                });
                expect(server.s.replicaSetState.primary).to.be.ok;
                expect(server.s.replicaSetState.secondaries.length).to.be.below(numberOfSecondaries);
                expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
            } finally {
                server.destroy();
                await adone.promise.delay(5000);
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
                await configuration.manager.restart(9, {
                    waitMS: 2000
                });
            }
        });

        it("Should not leak any connections after hammering the replicaset with a mix of operations", async () => {
            const manager = await configuration.manager.primary();
            Connection.enableConnectionAccounting();
            Server.enableServerAccounting();
            const server = new ReplSet([{
                host: manager.host,
                port: manager.port
            }], {
                setName: configuration.setName
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            const promises = [];
            for (let i = 0; i < 10000; ++i) {
                promises.push(new Promise((resolve, reject) => {
                    _server.insert(`${configuration.db}.inserts`, [{
                        a: 1
                    }], {
                        writeConcern: { w: 1 },
                        ordered: true
                    }, (err) => {
                        err ? reject(err) : resolve();
                    });
                }));
            }
            for (let i = 0; i < 10000; ++i) {
                // Execute find
                const cursor = _server.cursor(`${configuration.db}.inserts1`, {
                    find: `${configuration.db}.inserts1`,
                    query: {}
                }, {
                    readPreference: ReadPreference.secondary
                });
                cursor.setCursorLimit(1);
                promises.push(new Promise((resolve) => {
                    cursor.next(() => resolve());
                }));
            }
            await Promise.all(promises);
            server.destroy();
            Connection.disableConnectionAccounting();
            Server.disableServerAccounting();
            await adone.promise.delay(5000);
            expect(Connection.connections()).to.be.empty;
            expect(Server.servers()).to.be.empty;
        });
    });
});
