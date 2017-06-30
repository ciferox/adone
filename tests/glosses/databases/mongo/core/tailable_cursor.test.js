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
        adone.info(`Running tests against MongoDB version ${version}`);
        return configuration.setup();
    });

    after(() => {
        return configuration.teardown();
    });

    describe("tailable cursor", () => {
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

                it("Should correctly perform awaitdata", async () => {
                    const server = configuration.newTopology();
                    const ns = `${configuration.db}.cursor_tailable`;
                    const _server = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.command).call(_server, `${configuration.db}.$cmd`, {
                            create: "cursor_tailable",
                            capped: true,
                            size: 10000
                        });
                        const result = await promisify(_server.insert).call(_server, ns, [{
                            a: 1
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(result.result.n).to.be.equal(1);
                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {},
                            batchSize: 2,
                            tailable: true,
                            awaitData: true
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        await next();
                        const s = new Date();
                        adone.promise.delay(300).then(() => cursor.kill());
                        await next();
                        const e = new Date();
                        expect(e - s).to.be.at.least(300);
                    } finally {
                        _server.destroy();
                    }
                });
            });
        }
    });
});
