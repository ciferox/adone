import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const promisify = adone.promise.promisify;

describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { ReadPreference } } = adone.private(mongo);

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

    describe("operations", () => {
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
                it("Should correctly connect using server object", (done) => {
                    const server = configuration.newTopology();
                    server.on("connect", (_server) => {
                        _server.destroy();
                        done();
                    });

                    // Start cnnection
                    server.connect();
                });

                it("Should correctly execute command", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const result = await promisify(_server.command).call(_server, "system.$cmd", {
                            ismaster: true
                        }, {
                            readPreference: new ReadPreference("primary")
                        });
                        expect(result.result.ismaster).to.be.true();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute write", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const results = await promisify(_server.insert).call(_server, `${configuration.db}.inserts1`, [{
                            a: 1
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(1);
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute find", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts2`, [{
                            a: 1
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts2`, {
                            find: `${configuration.db}.inserts2`,
                            query: {}
                        }, {
                            readPreference: ReadPreference.primary
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute find with limit and skip", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts3`, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            c: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts3`, {
                            find: `${configuration.db}.inserts3`,
                            query: {},
                            limit: 1,
                            skip: 1
                        }, {
                            readPreference: ReadPreference.primary
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(2);

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute find against document with result array field", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts4`, [{
                            a: 1,
                            result: [{
                                c: 1
                            }, {
                                c: 2
                            }]
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts4`, {
                            find: `${configuration.db}.inserts4`,
                            query: {}
                        }, {
                            readPreference: ReadPreference.primary
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);
                        expect(d.result[0].c).to.be.equal(1);
                        expect(d.result[1].c).to.be.equal(2);

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute aggregation command'", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts5`, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts5`, {
                            aggregate: "inserts5",
                            pipeline: [{
                                $match: {}
                            }],
                            cursor: {
                                batchSize: 1
                            }
                        });
                        const next = promisify(cursor.next).bind(cursor);

                        let d = await next();
                        expect(d.a).to.be.equal(1);

                        d = await next();
                        expect(d.a).to.be.equal(2);

                        d = await next();
                        expect(d.a).to.be.equal(3);
                    } finally {
                        _server.destroy();
                    }
                });

                if (topology !== "mongos") {
                    // https://docs.mongodb.com/manual/reference/command/parallelCollectionScan/#dbcmd.parallelCollectionScan
                    // "parallelCollectionScan is only available for mongod, and it cannot operate on a sharded cluster."

                    it("Should correctly execute query against cursorId", async () => {
                        const server = configuration.newTopology();
                        const _server = await new Promise((resolve) => {
                            server.once("connect", resolve);
                            server.connect();
                        });
                        try {
                            await promisify(_server.insert).call(_server, `${configuration.db}.inserts6`, [{
                                a: 1
                            }, {
                                a: 2
                            }, {
                                a: 3
                            }], {
                                writeConcern: { w: 1 },
                                ordered: true
                            });
                            const result = await promisify(_server.command).call(_server, `${configuration.db}.$cmd`, {
                                parallelCollectionScan: "inserts6",
                                numCursors: 1
                            });
                            const cursor = _server.cursor(`${configuration.db}.inserts6`, result.result.cursors[0].cursor.id, {
                                documents: result.result.cursors[0].cursor.firstBatch
                            });
                            const next = promisify(cursor.next).bind(cursor);
                            let d = await next();
                            expect(d.a).to.be.equal(1);

                            d = await next();
                            expect(d.a).to.be.equal(2);

                            d = await next();
                            expect(d.a).to.be.equal(3);
                        } finally {
                            _server.destroy();
                        }
                    });
                }

                it("Should correctly kill command cursor", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts7`, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts7`, {
                            aggregate: "inserts7",
                            pipeline: [{
                                $match: {}
                            }],
                            cursor: {
                                batchSize: 1
                            }
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);

                        await promisify(cursor.kill).call(cursor);

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly kill find command cursor", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        await promisify(_server.insert).call(_server, `${configuration.db}.inserts8`, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        const cursor = _server.cursor(`${configuration.db}.inserts8`, {
                            find: "inserts7",
                            query: {},
                            batchSize: 1
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);

                        await promisify(cursor.kill).call(cursor);

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute unref and finish all operations", async () => {
                    const server = configuration.newTopology();
                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    const insert = promisify(_server.insert).bind(_server);
                    const promises = [];
                    for (let i = 0; i < 100; ++i) {
                        promises.push(insert(`${configuration.db}.inserts_unref`, [{
                            a: i
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        }).then((result) => {
                            expect(result.result.n).to.be.equal(1);
                        }));
                        if (i === 10) {
                            _server.unref();
                        }
                    }
                    try {
                        await Promise.all(promises); {
                            const server = configuration.newTopology();
                            const _server = await new Promise((resolve) => {
                                server.once("connect", resolve);
                                server.connect();
                            });
                            try {
                                const result = await promisify(_server.command).call(_server, `${configuration.db}.$cmd`, {
                                    count: "inserts_unref"
                                });
                                expect(result.result.n).to.be.equal(100);
                            } finally {
                                _server.destroy();
                            }
                        }
                    } finally {
                        _server.destroy();
                    }
                });
            });
        }
    });
});
