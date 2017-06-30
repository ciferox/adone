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

    describe("undefined", () => {
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

                it("Should correctly execute insert culling undefined", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new adone.data.bson.ObjectId();
                        const ns = `${configuration.db}.insert1`;
                        const results = await promisify(_server.insert).call(_server, ns, [{
                            _id: objectId,
                            a: 1,
                            b: undefined
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true,
                            ignoreUndefined: true
                        });
                        expect(results.result.n).to.be.equal(1);
                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {
                                _id: objectId
                            },
                            batchSize: 2
                        });
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d.b).to.be.undefined;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute update culling undefined", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new adone.data.bson.ObjectId();
                        const ns = `${configuration.db}.update1`;
                        const results = await promisify(_server.update).call(_server, ns, {
                            q: {
                                _id: objectId,
                                a: 1,
                                b: undefined
                            },
                            u: {
                                $set: {
                                    a: 1,
                                    b: undefined
                                }
                            },
                            upsert: true
                        }, {
                            writeConcern: { w: 1 },
                            ordered: true,
                            ignoreUndefined: true
                        });
                        expect(results.result.n).to.be.equal(1);
                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {
                                _id: objectId
                            },
                            batchSize: 2
                        });
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d.b).to.be.undefined;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute remove culling undefined", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new adone.data.bson.ObjectId();
                        const ns = `${configuration.db}.remove1`;
                        let results = await promisify(_server.insert).call(_server, ns, [{
                            id: objectId,
                            a: 1,
                            b: undefined
                        }, {
                            id: objectId,
                            a: 2,
                            b: 1
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(2);

                        results = await promisify(_server.remove).call(_server, ns, [{
                            q: {
                                b: undefined
                            },
                            limit: 0
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true,
                            ignoreUndefined: true
                        });
                        expect(results.result.n).to.be.equal(2);
                    } finally {
                        _server.destroy();
                    }
                });
            });
        }
    });
});
