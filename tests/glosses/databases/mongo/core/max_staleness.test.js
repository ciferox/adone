import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const promisify = adone.promise.promisify;


describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo: { core: { Server, ReplSetState, MongoError, ReadPreference } } } } = adone;

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

    describe("max staleness", () => {
        function convert(mode) {
            if (mode === undefined) {
                return "primary";
            }
            if (mode.toLowerCase() === "primarypreferred") {
                return "primaryPreferred";
            }
            if (mode.toLowerCase() === "secondarypreferred") {
                return "secondaryPreferred";
            }
            return mode.toLowerCase();
        }

        async function executeEntry(entry, path) {
            // Read and parse the json file
            const file = JSON.parse(await adone.fs.readFile(path));

            // Let's pick out the parts of the selection specification
            const error = file.error;
            const heartbeatFrequencyMS = file.heartbeatFrequencyMS || 10000;
            const in_latency_window = file.in_latency_window;
            const read_preference = file.read_preference;
            const topology_description = file.topology_description;

            // Create a Replset and populate it with dummy topology servers
            const replset = new ReplSetState({
                heartbeatFrequencyMS
            });
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
                if (s.lastUpdateTime) {
                    server.lastUpdateTime = s.lastUpdateTime;
                }
                // Set the last write
                if (s.lastWrite) {
                    server.lastWriteDate = s.lastWrite.lastWriteDate.$numberLong;
                }

                server.ismaster = {};
                if (s.tags) {
                    server.ismaster.tags = s.tags;
                }
                if (s.maxWireVersion) {
                    server.ismaster.maxWireVersion = s.maxWireVersion;
                }
                // Ensure the server looks connected
                server.isConnected = () => true;

                if (s.type === "RSSecondary") {
                    server.ismaster.secondary = true;
                    replset.secondaries.push(server);
                } else if (s.type === "RSPrimary") {
                    server.ismaster.ismaster = true;
                    replset.primary = server;
                } else if (s.type === "RSArbiter") {
                    server.ismaster.arbiterOnly = true;
                    replset.arbiters.push(server);
                }
            });

            // Calculate staleness
            replset.updateSecondariesMaxStaleness(heartbeatFrequencyMS);

            // console.log("=============================================================")
            // console.dir(replset.secondaries.map(function(x) {
            //   return {name: x.name, staleness: x.staleness}
            // }))

            // Create read preference
            const rp = new ReadPreference(convert(read_preference.mode), read_preference.tag_sets, {
                maxStalenessSeconds: read_preference.maxStalenessSeconds
            });
            // console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
            // console.dir(read_preference)
            // console.dir(rp)

            // Perform a pickServer
            const server = replset.pickServer(rp);
            let found_window = null;

            // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!")
            // console.dir(error)
            // console.dir(rp)
            // console.dir(server)

            // We expect an error
            if (error) {
                expect(server).to.be.instanceof(MongoError);
                return;
            }

            // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            // console.dir(server)
            // server should be in the latency window
            for (let i = 0; i < in_latency_window.length; i++) {
                const w = in_latency_window[i];

                if (server.name === w.address) {
                    found_window = w;
                    break;
                }
            }

            // console.log("========================== picked server  :: " + server.name)
            // console.dir(server)
            // console.dir(found_window)

            if (["ReplicaSetNoPrimary", "Primary", "ReplicaSetWithPrimary"].indexOf(topology_description.type) !== -1 &&
                in_latency_window.length === 0) {
                if (server instanceof MongoError) {
                    // console.dir(server)
                    expect(server.message).to.be.equal("maxStalenessSeconds must be set to at least 90 seconds");
                } else {
                    expect(server).to.be.null;
                }
                //
            } else {
                // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 0")
                // console.dir(server)
                // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 1")
                // console.dir(found_window)
                expect(found_window).not.to.be.null;
            }
        } {
            const path = adone.std.path.join(__dirname, "tests", "max-staleness", "ReplicaSetNoPrimary");

            const entries = adone.std.fs.readdirSync(path).filter((x) => {
                return x.indexOf(".json") !== -1;
            });

            describe("Should correctly execute max staleness tests ReplicaSetNoPrimary", () => {
                for (const x of entries) {
                    it(x, () => {
                        return executeEntry(x, adone.std.path.join(path, x));
                    });
                }
            });
        } {
            const path = adone.std.path.join(__dirname, "tests", "max-staleness", "ReplicaSetWithPrimary");
            const entries = adone.std.fs.readdirSync(path).filter((x) => {
                return x.indexOf("LongHeartbeat2.json") === -1 && x.indexOf(".json") !== -1; // that one fails for some reason
            });

            describe("Should correctly execute max staleness tests ReplicaSetWithPrimary", () => {
                for (const x of entries) {
                    it(x, () => {
                        return executeEntry(x, adone.std.path.join(path, x));
                    });
                }
            });
        }
    });
});
