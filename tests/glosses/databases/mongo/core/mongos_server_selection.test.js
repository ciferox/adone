import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const promisify = adone.promise.promisify;

describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { Server, Mongos, ReadPreference } } = adone.private(mongo);

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

    describe("mongos server selection", () => {
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
            // Read and parse the json file
            const file = JSON.parse(await adone.fs.readFile(path));
            // Let's pick out the parts of the selection specification
            const topology_description = file.topology_description;
            const in_latency_window = file.in_latency_window;
            const read_preference = file.read_preference;

            // Create a Replset and populate it with dummy topology servers
            const topology = new Mongos();
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
                // Add server to topology
                topology.connectedProxies.push(server);
            });

            // Create read preference
            const rp = new ReadPreference(convert(read_preference.mode), read_preference.tag_sets);
            // Perform a pickServer
            const server = topology.getServer(rp);
            let found_window = null;

            // server should be in the latency window
            for (let i = 0; i < in_latency_window.length; i++) {
                const w = in_latency_window[i];

                if (server.name === w.address) {
                    found_window = w;
                    break;
                }
            }

            expect(found_window).not.to.be.null();
        }
        const path = adone.std.path.join(__dirname, "tests", "server-selection", "tests", "server_selection", "Sharded", "read");

        const entries = adone.std.fs.readdirSync(path).filter((x) => {
            return x.indexOf(".json") !== -1;
        });

        for (const x of entries) {
            it(`Should correctly execute server selection tests using Mongos Topology: ${x}`, () => {
                return executeEntry(x, adone.std.path.join(path, x));
            });
        }
    });
});
