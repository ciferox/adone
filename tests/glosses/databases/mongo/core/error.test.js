import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const promisify = adone.promise.promisify;

describe("database", "mongo", "core", function () {
    this.timeout(120000);

    before(async function () {
        this.timeout(999999999); // long enough
        // Kill any running MongoDB processes and `install $MONGODB_VERSION` || `use existing installation` || `install stable`
        await promisify(mongodbVersionManager)();
        const version = await promisify(mongodbVersionManager.current)();
        adone.logInfo(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("error", () => {
        for (const topology of ["single", "replicaset", "mongos"]) {
            describe(topology, () => {
                before(function () {
                    this.timeout(120000);
                    if (topology === "replicaset") {
                        configuration.useReplicaSet = true;
                    } else if (topology === "mongos") {
                        configuration.useSharding = true;
                    }
                    return configuration.start();
                });

                after(function () {
                    this.timeout(120000);
                    if (topology === "replicaset") {
                        configuration.useReplicaSet = false;
                    } else if (topology === "mongos") {
                        configuration.useSharding = false;
                    }
                    return configuration.stop();
                });

                it("should return helpful error when geoHaystack fails", async () => {
                    const server = configuration.newTopology();
                    const ns = `${configuration.db}.geohaystack1`;
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const e = await promisify(_server.command).call(_server, "system.$cmd", {
                            geoNear: ns
                        }, {}).then(() => {
                            throw new Error("should throw");
                        }, (e) => e);
                        expect(e.message).to.match(/(can't find ns|not found)/);
                    } finally {
                        _server.destroy();
                    }
                });
            });
        }
    });
});
