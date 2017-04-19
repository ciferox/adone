import Server from "adone/glosses/databases/mongo/core/lib/topologies/server";
import Mongos from "adone/glosses/databases/mongo/core/lib/topologies/mongos";
import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const {
    data: { bson: { BSON } }
} = adone;
const promisify = adone.promise.promisify;

describe("mongodb", function () {
    this.timeout(120000);

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

    describe("client metadata", () => {
        beforeEach(function () {
            this.timeout(120000);
            return configuration.start();
        });

        afterEach(function () {
            this.timeout(120000);
            return configuration.stop();
        });

        describe("single", () => {
            it("Should correctly pass the configuration settings to server", () => {
                // Attempt to connect
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    appname: "My application name"
                });
                expect(server.clientInfo.application.name).to.be.equal("My application name");
            });
        });

        describe("replicaset", () => {
            before(() => {
                configuration.useReplicaSet = true;
            });

            after(() => {
                configuration.useReplicaSet = false;
            });

            it("Should correctly pass the configuration settings to replset", async () => {
                const ReplSet = configuration.require.ReplSet;
                const manager = await configuration.manager.primary();

                const server = new ReplSet([{
                    host: manager.host,
                    port: manager.port
                }], {
                    setName: configuration.setName,
                    appname: "My application name"
                });

                const _server = await new Promise((resolve) => {
                    server.on("connect", resolve);
                    server.connect();
                });
                try {
                    _server.s.replicaSetState.allServers().forEach((x) => {
                        // console.dir(x.clientInfo)
                        expect(x.clientInfo.application.name).to.be.equal("My application name");
                        expect(x.clientInfo.platform.split("mongodb-core")).to.have.lengthOf(2);
                    });
                } finally {
                    _server.destroy();
                }

            });
        });

        describe("sharding", () => {
            before(() => {
                configuration.useSharding = true;
            });

            after(() => {
                configuration.useSharding = false;
            });

            it("Should correctly pass the configuration settings to mongos", async () => {
                const _server = new Mongos([{
                    host: "localhost",
                    port: 51000
                }], {
                    appname: "My application name"
                });

                const server = await new Promise((resolve) => {
                    _server.once("connect", resolve);
                    _server.connect();
                });
                try {
                    server.connectedProxies.forEach((x) => {
                        // console.dir(x.clientInfo)
                        expect(x.clientInfo.application.name).to.be.equal("My application name");
                        expect(x.clientInfo.platform.split("mongodb-core")).to.have.lengthOf(2);
                    });
                } finally {
                    server.destroy();
                }
            });
        });
    });
});
