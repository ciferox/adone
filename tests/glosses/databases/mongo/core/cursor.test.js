import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

const {
    data: { bson: { BSON } }
} = adone;
const promisify = adone.promise.promisify;

describe("database", "mongo", "core", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { Server } } = adone.private(mongo);

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

    describe("cursor", () => {
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

                it("Should iterate cursor", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    const ns = `${configuration.db}.cursor1`;
                    const results = await promisify(_server.insert).call(_server, ns, [{
                        a: 1
                    }, {
                        a: 2
                    }, {
                        a: 3
                    }], {
                        writeConcern: { w: 1 },
                        ordered: true
                    });
                    expect(results.result.n).to.be.equal(3);
                    const cursor = _server.cursor(ns, {
                        find: ns,
                        query: {},
                        batchSize: 2
                    });

                    try {
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();

                        expect(d.a).to.be.equal(1);
                        expect(cursor.bufferedCount()).to.be.equal(1);

                        d = await next();
                        expect(d.a).to.be.equal(2);
                        expect(cursor.bufferedCount()).to.be.equal(0);
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should iterate cursor but readBuffered", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor2`;

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });

                    const results = await promisify(_server.insert).call(_server, ns, [
                        { a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }
                    ], { writeConcern: { w: 1 }, ordered: true });
                    expect(results.result.n).to.be.equal(5);
                    const cursor = _server.cursor(ns, {
                        find: ns,
                        query: {},
                        batchSize: 5
                    });
                    try {
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();

                        expect(d.a).to.be.equal(1);
                        expect(cursor.bufferedCount()).to.be.equal(4);

                        cursor.readBufferedDocuments(cursor.bufferedCount());

                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should be fulfilled with an error if the cursor is exhausted", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor3`;

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });

                    try {
                        const results = await promisify(_server.insert).call(_server, ns, [{
                            a: 1
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(1);

                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {},
                            batchSize: 5
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);
                        d = await next();
                        expect(d).to.be.null();
                        const e = await next().then(() => {
                            throw new Error("should throw");
                        }, (e) => e);
                        expect(e).to.be.ok();
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should force a getMore call to happen", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor4`;

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const results = await promisify(_server.insert).call(_server, ns, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(3);

                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {},
                            batchSize: 2
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

                it("Should force a getMore call to happen then call killCursor", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor5`;

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const results = await promisify(_server.insert).call(_server, ns, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(3);

                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {},
                            batchSize: 2
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        let d = await next();
                        expect(d.a).to.be.equal(1);
                        d = await next();
                        expect(d.a).to.be.equal(2);
                        await promisify(cursor.kill).call(cursor);
                        d = await next();
                        expect(d).to.be.null();
                    } finally {
                        _server.destroy();
                    }
                });

                if (topology === "single") {
                    it("Should fail cursor correctly after server restart", async () => {
                        const server = new Server({
                            host: configuration.host,
                            port: configuration.port,
                            bson: new BSON()
                        });

                        const ns = `${configuration.db}.cursor6`;

                        const _server = await new Promise((resolve) => {
                            server.once("connect", resolve);
                            server.connect();
                        });
                        try {
                            const results = await promisify(_server.insert).call(_server, ns, [{
                                a: 1
                            }, {
                                a: 2
                            }, {
                                a: 3
                            }], {
                                writeConcern: { w: 1 },
                                ordered: true
                            });
                            expect(results.result.n).to.be.equal(3);

                            const cursor = _server.cursor(ns, {
                                find: ns,
                                query: {},
                                batchSize: 2
                            });
                            const next = promisify(cursor.next).bind(cursor);
                            let d = await next();
                            expect(d.a).to.be.equal(1);
                            d = await next();
                            expect(d.a).to.be.equal(2);
                            await configuration.manager.restart(false);
                            const e = await next().then(() => {
                                throw new Error("should throw");
                            }, (e) => e);
                            expect(e).to.be.ok();
                        } finally {
                            _server.destroy();
                        }
                    });

                    it("Should finish cursor correctly after all sockets to pool destroyed", async () => {
                        const server = new Server({
                            host: configuration.host,
                            port: configuration.port,
                            bson: new BSON()
                        });

                        const ns = `${configuration.db}.cursor7`;

                        const _server = await new Promise((resolve) => {
                            server.once("connect", resolve);
                            server.connect();
                        });
                        try {
                            const results = await promisify(_server.insert).call(_server, ns, [{
                                a: 1
                            }, {
                                a: 2
                            }, {
                                a: 3
                            }], {
                                writeConcern: { w: 1 },
                                ordered: true
                            });
                            expect(results.result.n).to.be.equal(3);

                            const cursor = _server.cursor(ns, {
                                find: ns,
                                query: {},
                                batchSize: 2
                            });
                            const next = promisify(cursor.next).bind(cursor);
                            let d = await next();
                            expect(d.a).to.be.equal(1);
                            d = await next();
                            expect(d.a).to.be.equal(2);

                            await new Promise((resolve) => {
                                _server.once("reconnect", resolve);
                                for (const conn of _server.s.pool.allConnections()) {
                                    conn.write("!@#!@#SADASDSA!@#!@#!@#!@#!@");
                                }
                            });
                            d = await next();
                            expect(d.a).to.be.equal(3);
                        } finally {
                            _server.destroy();
                        }
                    });

                    it("Should not hang if autoReconnect=false and pools sockets all timed out", async () => {
                        // Attempt to connect
                        const _server = new Server({
                            host: configuration.host,
                            port: configuration.port,
                            bson: new BSON(),
                            // Nasty edge case: small timeout, small pool, no auto reconnect
                            socketTimeout: 100,
                            size: 1,
                            reconnect: false
                        });

                        const ns = `${configuration.db}.cursor7`;

                        const server = await new Promise((resolve) => {
                            _server.once("connect", resolve);
                            _server.connect();
                        });

                        try {
                            const results = await promisify(server.insert).call(server, ns, [{ a: 1 }], {
                                writeConcern: { w: 1 }, ordered: true
                            });

                            assert.equal(1, results.result.n);

                            // Execute slow find
                            let cursor = server.cursor(ns, {
                                find: ns,
                                query: { $where: "sleep(250) || true" },
                                batchSize: 1
                            });

                            const doc = await promisify(cursor.next).call(cursor);

                            cursor = server.cursor(ns, {
                                find: ns,
                                query: {},
                                batchSize: 1
                            });

                            await assert.throws(async () => {
                                await promisify(cursor.next).call(cursor);
                            });
                        } finally {
                            _server.destroy();
                        }
                    });
                }

                it("Should not leak connnection workItem elements when using killCursor", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor8`;

                    const _server = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const results = await promisify(_server.insert).call(_server, ns, [{
                            a: 1
                        }, {
                            a: 2
                        }, {
                            a: 3
                        }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                        expect(results.result.n).to.be.equal(3);

                        const cursor = _server.cursor(ns, {
                            find: ns,
                            query: {},
                            batchSize: 2
                        });
                        const next = promisify(cursor.next).bind(cursor);
                        const d = await next();
                        expect(d.a).to.be.equal(1);

                        await promisify(cursor.kill).call(cursor);
                        await adone.promise.delay(1000);

                        for (const conn of _server.s.pool.allConnections()) {
                            expect(conn.workItems).to.be.empty();
                        }
                    } finally {
                        _server.destroy();
                    }
                });

                describe("extensions", () => {
                    it("Should correctly extend the cursor with custom implementation", async () => {
                        const {
                            Server,
                            Cursor
                        } = configuration.require;

                        class ExtendedCursor extends Cursor {
                            async toArray() {
                                const b = [];
                                const next = promisify(this.next).bind(this);
                                for (; ;) {
                                    const d = await next();
                                    if (is.null(d)) {
                                        return b;
                                    }
                                    b.push(d);
                                }
                            }
                        }

                        const server = new Server({
                            host: configuration.host,
                            port: configuration.port,
                            cursorFactory: ExtendedCursor
                        });

                        const _server = await new Promise((resolve) => {
                            server.once("connect", resolve);
                            server.connect();
                        });
                        try {
                            const ns = `${configuration.db}.inserts_extend_cursors`;
                            const results = await promisify(_server.insert).call(_server, ns, [{
                                a: 1
                            }, {
                                a: 2
                            }, {
                                a: 3
                            }], {
                                writeConcern: { w: 1 },
                                ordered: true
                            });
                            expect(results.result.n).to.be.equal(3);

                            const cursor = _server.cursor(ns, {
                                find: ns,
                                query: {}
                            });

                            cursor.batchSize = 2;
                            const items = await cursor.toArray();
                            expect(items).to.have.lengthOf(3);
                        } finally {
                            _server.destroy();
                        }
                    });
                });
            });
        }
    });
});
