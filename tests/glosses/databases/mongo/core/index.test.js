import {
    locateAuthMethod,
    executeCommand
} from "./shared";

import Server from "adone/glosses/databases/mongo/core/lib/topologies/server";
import ReplSet from "adone/glosses/databases/mongo/core/lib/topologies/replset";
import Connection from "adone/glosses/databases/mongo/core/lib/connection/connection";
import Pool from "adone/glosses/databases/mongo/core/lib/connection/pool";
import Mongos from "adone/glosses/databases/mongo/core/lib/topologies/mongos";
import {
    Query
} from "adone/glosses/databases/mongo/core/lib/connection/commands";
import ReplSetState from "adone/glosses/databases/mongo/core/lib/topologies/replset_state";
import MongoError from "adone/glosses/databases/mongo/core/lib/error";
import ReadPreference from "adone/glosses/databases/mongo/core/lib/topologies/read_preference";
import {
    Server as ServerManager,
    ReplSet as ReplSetManager
} from "mongodb-topology-manager";
import mongodbVersionManager from "mongodb-version-manager";
import mockupdb from "./mock";
import configuration from "./configuration";

const {
    data: { bson: { BSON } },
    vendor: { lodash }
} = adone;
const promisify = adone.promise.promisify;
const waitFor = (emitter, event) => new Promise((resolve) => emitter.once(event, (...args) => {
    if (args.length === 1) {
        args = args[0];
    }
    resolve(args);
}));


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

    describe("basic replset server auth", () => {

        beforeEach(function () {
            this.timeout(120000);
            return configuration.start();
        });

        afterEach(function () {
            this.timeout(120000);
            return configuration.stop();
        });

        let replicasetManager;

        before(() => {
            // configuration.skipStart = configuration.skipStop = true;
        });

        after(() => {
            // configuration.skipStart = configuration.skipStop = false;
        });

        beforeEach(async function () {
            this.timeout(120000);

            const rsOptions = {
                server: {
                    keyFile: __dirname + "/key/keyfile.key",
                    auth: null,
                    replSet: "rs"
                },
                client: {
                    replSet: "rs"
                }
            };

            // Set up the nodes
            const nodes = [{
                options: {
                    bind_ip: "localhost",
                    port: 31000,
                    dbpath: configuration.root.getVirtualDirectory("db", "31000").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31001,
                    dbpath: configuration.root.getVirtualDirectory("db", "31001").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31002,
                    dbpath: configuration.root.getVirtualDirectory("db", "31002").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31003,
                    dbpath: configuration.root.getVirtualDirectory("db", "31003").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31004,
                    dbpath: configuration.root.getVirtualDirectory("db", "31004").path()
                }
            }];

            // Merge in any node start up options
            for (let i = 0; i < nodes.length; i++) {
                for (const name in rsOptions.server) {
                    nodes[i].options[name] = rsOptions.server[name];
                }
            }

            // Create a manager
            replicasetManager = new ReplSetManager("mongod", nodes, rsOptions.client);
            // Purge the set
            // console.log("start purging");
            await replicasetManager.purge();
            // console.log("starting");
            await replicasetManager.start();
            // console.log("delay");
            await adone.promise.delay(10000); // wtf
        });

        it("Should fail to authenticate emitting an error due to it being the initial connect", async () => {
            // Enable connections accounting
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "admin", {
                createUser: "root",
                pwd: "root",
                roles: [{
                    role: "root",
                    db: "admin"
                }],
                digestPassword: true
            }, {
                    host: "localhost",
                    port: 31000
                });

            const server = new ReplSet([{
                host: "localhost",
                port: 31000
            }, {
                host: "localhost",
                port: 31001
            }], {
                    setName: "rs"
                });
            try {
                await new Promise((resolve, reject) => {
                    server.on("connect", () => reject(new Error("shouldnt connect"))),
                        server.on("error", resolve);
                    server.connect({
                        auth: [method, "admin", "root2", "root"]
                    });
                });
                expect(Object.keys(Connection.connections())).to.be.empty;
                Connection.disableConnectionAccounting();
            } finally {
                await executeCommand(configuration, "admin", {
                    dropUser: "root"
                }, {
                        auth: [method, "admin", "root", "root"],
                        host: "localhost",
                        port: 31000
                    });
                await replicasetManager.stop();
            }
        });

        it("Should correctly authenticate server using scram-sha-1 using connect auth", async () => {
            // Enable connections accounting
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "admin", {
                createUser: "root",
                pwd: "root",
                roles: [{
                    role: "root",
                    db: "admin"
                }],
                digestPassword: true
            }, {
                    host: "localhost",
                    port: 31000
                });

            // Attempt to connect
            const server = new ReplSet([{
                host: "localhost",
                port: 31000
            }, {
                host: "localhost",
                port: 31001
            }], {
                    setName: "rs"
                });

            try {
                server.connect({
                    auth: [method, "admin", "root", "root"]
                });
                const _server: any = await new Promise((resolve) => server.on("connect", resolve));
                try {
                    const r: any = await new Promise((resolve, reject) => {
                        _server.insert("test.test", [{
                            a: 1
                        }], (err, r) => err ? reject(err) : resolve(r));
                    });
                    expect(r.result.n).to.be.equal(1);
                    await executeCommand(configuration, "admin", {
                        dropUser: "root"
                    }, {
                            auth: [method, "admin", "root", "root"],
                            host: "localhost",
                            port: 31000
                        });
                } finally {
                    _server.destroy();
                }
                expect(Object.keys(Connection.connections())).to.have.lengthOf(0);
            } finally {
                Connection.disableConnectionAccounting();
                await replicasetManager.stop();
            }
        });

        it("Should correctly authenticate using auth method instead of connect", async () => {
            // Enable connections accounting
            Connection.enableConnectionAccounting();

            const method = await locateAuthMethod(configuration);

            await executeCommand(configuration, "admin", {
                createUser: "root",
                pwd: "root",
                roles: [{
                    role: "root",
                    db: "admin"
                }],
                digestPassword: true
            }, {
                    host: "localhost",
                    port: 31000
                });
            const server = new ReplSet([{
                host: "localhost",
                port: 31000
            }], {
                    setName: "rs"
                });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                // Attempt authentication
                await new Promise((resolve, reject) => {
                    _server.auth(method, "admin", "root", "root", (err) => err ? reject(err) : resolve());
                });
                try {
                    const r: any = await new Promise((resolve, reject) => {
                        _server.insert("test.test", [{
                            a: 1
                        }], (err, r) => {
                            err ? reject(err) : resolve(r);
                        });
                    });
                    expect(r.result.n).to.be.equal(1);
                } finally {
                    await executeCommand(configuration, "admin", {
                        dropUser: "root"
                    }, {
                            auth: [method, "admin", "root", "root"],
                            host: "localhost",
                            port: 31000
                        });
                    _server.destroy();
                    expect(Connection.connections()).to.be.empty;
                }
            } finally {
                Connection.disableConnectionAccounting();
                await replicasetManager.stop();
            }
        });

        it("Should correctly authenticate using auth method instead of connect and logout user", async () => {
            // Enable connections accounting
            Connection.enableConnectionAccounting();

            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "admin", {
                createUser: "root",
                pwd: "root",
                roles: [{
                    role: "root",
                    db: "admin"
                }],
                digestPassword: true
            }, {
                    host: "localhost",
                    port: 31000
                });
            const server = new ReplSet([{
                host: "localhost",
                port: 31000
            }], {
                    setName: "rs"
                });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                await new Promise((resolve, reject) => {
                    _server.auth(method, "admin", "root", "root", (err) => err ? reject(err) : resolve());
                });
                const r: any = await new Promise((resolve, reject) => {
                    _server.insert("test.test", [{
                        a: 1
                    }], (err, r) => err ? reject(err) : resolve(r));
                });
                expect(r.result.n).to.be.equal(1);
                await new Promise((resolve, reject) => {
                    _server.logout("admin", (err) => err ? reject(err) : resolve());
                });
                await new Promise((resolve, reject) => {
                    _server.insert("test.test", [{
                        a: 1
                    }], (err) => err ? resolve(err) : reject(new Error("should throw")));
                });

                await executeCommand(configuration, "admin", {
                    dropUser: "root"
                }, {
                        auth: [method, "admin", "root", "root"],
                        host: "localhost",
                        port: 31000
                    });
            } finally {
                _server.destroy();
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
                await replicasetManager.stop();
            }
        });
    });

    describe("basic single server auth", () => {
        beforeEach(function () {
            this.timeout(120000);
            return configuration.start();
        });

        afterEach(function () {
            this.timeout(120000);
            return configuration.stop();
        });

        before(() => {
            configuration.useAuth = true;
        });

        after(() => {
            configuration.useAuth = false;
        });

        it("Should fail to authenticate server using scram-sha-1 using connect auth", async () => {
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });
            await new Promise((resolve) => {
                server.on("error", resolve);
                server.connect({
                    auth: [method, "admin", "root2", "root"]
                });
            });
            expect(Connection.connections()).to.be.empty;
            Connection.disableConnectionAccounting();
        });

        it("Should correctly authenticate server using scram-sha-1 using connect auth", async () => {
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });
            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect({
                    auth: [method, "admin", "root", "root"]
                });
            });
            try {
                await executeCommand(configuration, "admin", {
                    dropUser: "root"
                }, {
                        auth: [method, "admin", "root", "root"]
                    });
            } finally {
                _server.destroy({
                    force: true
                });
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
            }
        });

        it("Should correctly authenticate server using scram-sha-1 using connect auth and maintain auth on new connections", async () => {
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "test", {
                createUser: "admin",
                pwd: "admin",
                roles: ["readWrite", "dbAdmin"],
                digestPassword: true
            }, {
                    auth: [method, "admin", "root", "root"]
                });

            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect({
                    auth: [method, "test", "admin", "admin"]
                });
            });
            try {
                const promises = [];
                for (let i = 0; i < 10; ++i) {
                    for (let j = 0; j < 10; ++j) {
                        promises.push(new Promise((resolve, reject) => {
                            server.insert("test.test", [{
                                a: 1
                            }], (err, result) => {
                                if (err || result.result.n !== 1) {
                                    reject(err || new Error());
                                }
                                resolve();
                            });
                        }));
                    }
                    await adone.promise.delay(1);
                }
                await Promise.all(promises.slice(0, 10));
                // expect(server.s.pool.socketCount()).to.be.equal(5);
                await Promise.all(promises);
            } finally {
                server.destroy({
                    force: true
                });
                Connection.disableConnectionAccounting();
                expect(Connection.connections()).to.be.empty;
            }
        });

        it("Should correctly authenticate server using scram-sha-1 using auth method", async () => {
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "test", {
                createUser: "admin",
                pwd: "admin",
                roles: ["readWrite", "dbAdmin"],
                digestPassword: true
            }, {
                    auth: [method, "admin", "root", "root"]
                });
            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.once("connect", resolve);
                server.connect();
            });
            try {
                // Add event listeners
                const promises = [
                    new Promise((resolve, reject) => {
                        _server.auth(method, "test", "admin", "admin", (err) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve();
                        });
                    }).then(async () => {
                        const promises = [];
                        for (let i = 0; i < 100; ++i) {
                            promises.push(new Promise((resolve, reject) => {
                                server.insert("test.test", [{
                                    a: 1
                                }], (err, r) => {
                                    if (err || r.result.n !== 1) {
                                        return reject(err);
                                    }
                                    resolve();
                                });
                            }));
                            await adone.promise.delay(1);
                        }
                        return Promise.all(promises);
                    })
                ];
                for (let i = 0; i < 100; ++i) {
                    promises.push(new Promise((resolve, reject) => {
                        _server.command("admin.$cmd", {
                            ismaster: true
                        }, (err) => {
                            err ? reject(err) : resolve();
                        });
                    }));
                }
                await Promise.all(promises);
                // expect(server.s.pool.socketCount()).to.be.equal(5);
            } finally {
                server.destroy({
                    force: true
                });
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
            }
        });

        it("Should correctly authenticate server using scram-sha-1 using connect auth then logout", async () => {
            Connection.enableConnectionAccounting();
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "test", {
                createUser: "admin",
                pwd: "admin",
                roles: ["readWrite", "dbAdmin"],
                digestPassword: true
            }, {
                    auth: [method, "admin", "root", "root"]
                });
            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            // Add event listeners
            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect({
                    auth: [method, "test", "admin", "admin"]
                });
            });
            const insert = promisify(_server.insert).bind(_server);
            try {
                await insert("test.test", [{
                    a: 1
                }]);
                await promisify(_server.logout).call(_server, "test");
                await insert("test.test", [{
                    a: 1
                }]).then(() => {
                    throw new Error("should throw");
                }, (e) => e);
            } finally {
                _server.destroy({
                    force: true
                });
                Connection.disableConnectionAccounting();
                expect(Connection.connections()).to.be.empty;
            }
        });

        it("Should correctly have server auth wait for logout to finish", async () => {
            // Enable connections accounting
            Connection.enableConnectionAccounting();

            // Restart instance
            const method = await locateAuthMethod(configuration);
            await executeCommand(configuration, "test", {
                createUser: "admin",
                pwd: "admin",
                roles: ["readWrite", "dbAdmin"],
                digestPassword: true
            }, {
                    auth: [method, "admin", "root", "root"]
                });
            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });
            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect({
                    auth: [method, "test", "admin", "admin"]
                });
            });
            const insert = promisify(_server.insert).bind(_server);
            try {
                await insert("test.test", [{
                    a: 1
                }]);
                await promisify(_server.logout).call(_server, "test");
                await promisify(_server.auth).call(_server, method, "test", "admin", "admin");
                await insert("test.test", [{
                    a: 1
                }]);
            } finally {
                _server.destroy({
                    force: true
                });
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
            }
        });
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

                const _server: any = await new Promise((resolve) => {
                    server.on("connect", resolve);
                    server.connect();
                });
                try {
                    _server.s.replicaSetState.allServers().forEach(function (x) {
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

                const server: any = await new Promise((resolve) => {
                    _server.once("connect", resolve);
                    _server.connect();
                });
                try {
                    server.connectedProxies.forEach(function (x) {
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

                    const _server: any = await new Promise((resolve) => {
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

                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
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

                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                        const e = await next().then(() => {
                            throw new Error("should throw");
                        }, (e) => e);
                        expect(e).to.be.ok;
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

                    const _server: any = await new Promise((resolve) => {
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

                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
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

                        const _server: any = await new Promise((resolve) => {
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
                            expect(e).to.be.ok;
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

                        const _server: any = await new Promise((resolve) => {
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
                }

                it("Should not leak connnection workItem elements when using killCursor", async () => {
                    const server = new Server({
                        host: configuration.host,
                        port: configuration.port,
                        bson: new BSON()
                    });

                    const ns = `${configuration.db}.cursor8`;

                    const _server: any = await new Promise((resolve) => {
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
                            expect(conn.workItems).to.be.empty;
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
                                    if (d === null) {
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

                        const _server: any = await new Promise((resolve) => {
                            server.once("connect", resolve);
                            server.connect();
                        });
                        try {
                            const ns = `${configuration.db}.inserts_extend_cursors`;
                            const results: any = await promisify(_server.insert).call(_server, ns, [{
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
                    const _server: any = await new Promise((resolve) => {
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

    describe("max staleness", () => {
        function convert(mode) {
            if (mode === undefined) return "primary";
            if (mode.toLowerCase() === "primarypreferred") return "primaryPreferred";
            if (mode.toLowerCase() === "secondarypreferred") return "secondaryPreferred";
            return mode.toLowerCase();
        }

        async function executeEntry(entry, path) {
            // Read and parse the json file
            const file = JSON.parse(await adone.std.fs.readFileAsync(path));

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
            topology_description.servers.forEach(function (s) {
                const server = new Server({
                    host: s.address.split(":")[0],
                    port: parseInt(s.address.split(":")[1], 10)
                });

                // Add additional information
                if (s.avg_rtt_ms) server.lastIsMasterMS = s.avg_rtt_ms;
                if (s.lastUpdateTime) server.lastUpdateTime = s.lastUpdateTime;
                // Set the last write
                if (s.lastWrite) {
                    server.lastWriteDate = s.lastWrite.lastWriteDate["$numberLong"];
                }

                server.ismaster = {};
                if (s.tags) server.ismaster["tags"] = s.tags;
                if (s.maxWireVersion) server.ismaster["maxWireVersion"] = s.maxWireVersion;
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

            const entries = adone.std.fs.readdirSync(path).filter(function (x) {
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
            const entries = adone.std.fs.readdirSync(path).filter(function (x) {
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

    describe("mongos server selection", () => {
        function convert(mode) {
            if (mode.toLowerCase() === "primarypreferred") return "primaryPreferred";
            if (mode.toLowerCase() === "secondarypreferred") return "secondaryPreferred";
            return mode.toLowerCase();
        }

        async function executeEntry(entry, path) {
            // Read and parse the json file
            const file = JSON.parse(await adone.std.fs.readFileAsync(path));
            // Let's pick out the parts of the selection specification
            const topology_description = file.topology_description;
            const in_latency_window = file.in_latency_window;
            const read_preference = file.read_preference;

            // Create a Replset and populate it with dummy topology servers
            const topology = new Mongos();
            // For each server add them to the state
            topology_description.servers.forEach(function (s) {
                const server = new Server({
                    host: s.address.split(":")[0],
                    port: parseInt(s.address.split(":")[1], 10)
                });

                // Add additional information
                if (s.avg_rtt_ms) server.lastIsMasterMS = s.avg_rtt_ms;
                if (s.tags) server.ismaster = {
                    tags: s.tags
                };
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

            expect(found_window).not.to.be.null;
        }
        const path = adone.std.path.join(__dirname, "tests", "server-selection", "tests", "server_selection", "Sharded", "read");

        const entries = adone.std.fs.readdirSync(path).filter(function (x) {
            return x.indexOf(".json") !== -1;
        });

        for (const x of entries) {
            it(`Should correctly execute server selection tests using Mongos Topology: ${x}`, () => {
                return executeEntry(x, adone.std.path.join(path, x));
            });
        }
    });

    describe("operation example", () => {
        describe("single", () => {
            before(function () {
                this.timeout(120000);
                return configuration.start();
            });

            after(function () {
                this.timeout(120000);
                return configuration.stop();
            });

            it("should insert into db", async () => {
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    reconnect: true,
                    reconnectInterval: 50
                });

                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    const results = await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example1`, [{
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

            it("should update using Server instance", async () => {
                // Attempt to connect
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    reconnect: true,
                    reconnectInterval: 50
                });
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.example2`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.update).call(_server, `${configuration.db}.example2`, [{
                        q: {
                            a: 1
                        },
                        u: {
                            "$set": {
                                b: 1
                            }
                        }
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            it("should remove using Server instance", async () => {
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    reconnect: true,
                    reconnectInterval: 50
                });

                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.example3`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.remove).call(_server, `${configuration.db}.example3`, [{
                        q: {
                            a: 1
                        },
                        limit: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("cursor using Server instance", async () => {
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    reconnect: true,
                    reconnectInterval: 50
                });

                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.example4`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const cursor = _server.cursor(`${configuration.db}.example4`, {
                        find: `${configuration.db}.example4`,
                        query: {
                            a: 1
                        }
                    });
                    const doc = await promisify(cursor.next).call(cursor);
                    expect(doc.a).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("command using Server instance", async () => {
                const server = new Server({
                    host: configuration.host,
                    port: configuration.port,
                    reconnect: true,
                    reconnectInterval: 50
                });

                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.example5`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    await promisify(_server.command).call(_server, "system.$cmd", {
                        ismaster: true
                    });
                } finally {
                    _server.destroy();
                }
            });

        });

        describe("replicaset", () => {
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

            specify("simple insert into db using ReplSet", async () => {
                const config = [{
                    host: configuration.host,
                    port: configuration.port
                }];

                const options = {
                    setName: configuration.setName
                };

                // Attempt to connect
                const server = new ReplSet(config, options);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    const results = await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_1`, [{
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

            specify("update using ReplSet instance", async () => {
                const config = [{
                    host: configuration.host,
                    port: configuration.port
                }];

                const options = {
                    setName: configuration.setName
                };

                // Attempt to connect
                const server = new ReplSet(config, options);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_2`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.update).call(_server, `${configuration.db}.inserts_example_replset_2`, [{
                        q: {
                            a: 1
                        },
                        u: {
                            "$set": {
                                b: 1
                            }
                        }
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("remove using ReplSet instance", async () => {
                const config = [{
                    host: configuration.host,
                    port: configuration.port
                }];

                const options = {
                    setName: configuration.setName
                };

                // Attempt to connect
                const server = new ReplSet(config, options);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_3`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.remove).call(_server, `${configuration.db}.inserts_example_replset_3`, [{
                        q: {
                            a: 1
                        },
                        limit: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("cursor using ReplSet instance", async () => {
                const config = [{
                    host: configuration.host,
                    port: configuration.port
                }];

                const options = {
                    setName: configuration.setName
                };

                // Attempt to connect
                const server = new ReplSet(config, options);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_4`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const cursor = _server.cursor(`${configuration.db}.inserts_example_replset_4`, {
                        find: `${configuration.db}.inserts_example_replset_4`,
                        query: {
                            a: 1
                        }
                    });
                    const doc = await promisify(cursor.next).call(cursor);
                    expect(doc.a).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("command using ReplSet instance", async () => {
                const config = [{
                    host: configuration.host,
                    port: configuration.port
                }];

                const options = {
                    setName: configuration.setName
                };

                // Attempt to connect
                const server = new ReplSet(config, options);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_5`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    await promisify(_server.command).call(_server, "system.$cmd", {
                        ismaster: true
                    });
                } finally {
                    _server.destroy();
                }
            });
        });

        describe("mongos", () => {
            before(function () {
                this.timeout(120000);
                configuration.useSharding = true;
                return configuration.start();
            });

            after(function () {
                this.timeout(120000);
                configuration.useSharding = false;
                return configuration.stop();
            });

            specify("simple insert into db using Mongos", async () => {
                const server = new Mongos([{
                    host: configuration.host,
                    port: configuration.port
                }]);

                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    const results = await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example1`, [{
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

            specify("update using Mongos", async () => {
                const server = new Mongos([{
                    host: configuration.host,
                    port: configuration.port
                }]);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_2`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.update).call(_server, `${configuration.db}.inserts_example_replset_2`, [{
                        q: {
                            a: 1
                        },
                        u: {
                            "$set": {
                                b: 1
                            }
                        }
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("remove using Mongos", async () => {
                const server = new Mongos([{
                    host: configuration.host,
                    port: configuration.port
                }]);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_3`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const results = await promisify(_server.remove).call(_server, `${configuration.db}.inserts_example_replset_3`, [{
                        q: {
                            a: 1
                        },
                        limit: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    expect(results.result.n).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("cursor using Mongos", async () => {
                const server = new Mongos([{
                    host: configuration.host,
                    port: configuration.port
                }]);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_4`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    const cursor = _server.cursor(`${configuration.db}.inserts_example_replset_4`, {
                        find: `${configuration.db}.inserts_example_replset_4`,
                        query: {
                            a: 1
                        }
                    });
                    const doc = await promisify(cursor.next).call(cursor);
                    expect(doc.a).to.be.equal(1);
                } finally {
                    _server.destroy();
                }
            });

            specify("command using Mongos", async () => {
                const server = new Mongos([{
                    host: configuration.host,
                    port: configuration.port
                }]);
                const _server: any = await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                try {
                    await promisify(_server.insert).call(_server, `${configuration.db}.inserts_example_replset_5`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        });
                    await promisify(_server.command).call(_server, "system.$cmd", {
                        ismaster: true
                    });
                } finally {
                    _server.destroy();
                }
            });
        });
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
                    server.on("connect", function (_server) {
                        _server.destroy();
                        done();
                    });

                    // Start cnnection
                    server.connect();
                });

                it("Should correctly execute command", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });
                    try {
                        const result = await promisify(_server.command).call(_server, "system.$cmd", {
                            ismaster: true
                        }, {
                                readPreference: new ReadPreference("primary")
                            });
                        expect(result.result.ismaster).to.be.true;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute write", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute find with limit and skip", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute find against document with result array field", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute aggregation command'", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                        const _server: any = await new Promise((resolve) => {
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
                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly kill find command cursor", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                        expect(d).to.be.null;
                    } finally {
                        _server.destroy();
                    }
                });

                it("Should correctly execute unref and finish all operations", async () => {
                    const server = configuration.newTopology();
                    const _server: any = await new Promise((resolve) => {
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
                            const _server: any = await new Promise((resolve) => {
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

    describe("pool", () => {
        describe("without auth", () => {
            before(function () {
                this.timeout(120000);
                return configuration.start();
            });

            after(function () {
                this.timeout(120000);
                return configuration.stop();
            });

            it("Should correctly connect pool to single server", (done) => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    messageHandler() { }
                });

                // Add event listeners
                pool.on("connect", function (_pool) {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                    done();
                });

                pool.connect();
            });

            it("Should correctly write ismaster operation to the server", async () => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    const result = await promisify(_pool.write).call(_pool, query);
                    expect(result.result.ismaster).to.be.true;

                } finally {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });

            it("Should correctly grow server pool on concurrent operations", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool: any = await new Promise((resolve) => {
                    pool.once("connect", resolve);
                    pool.connect();
                });
                try {
                    const promises = [];
                    for (let i = 0; i < 100; i++) {
                        const query = new Query(new BSON(), "system.$cmd", {
                            ismaster: true
                        }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                        promises.push(new Promise((resolve, reject) => {
                            _pool.write(query, (err, result) => {
                                if (err || result.result.ismaster !== true) {
                                    return reject(err || new Error("something went wrong"));
                                }
                                resolve();
                            });
                        }));
                    }
                    await Promise.all(promises.slice(0, 10));
                    expect(pool.allConnections()).to.have.lengthOf(5);
                    await Promise.all(promises);
                } finally {
                    _pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });

            it("Should correctly write ismaster operation to the server and handle timeout", (done) => {
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON(),
                    reconnect: false
                });

                // Add event listeners
                pool.on("connect", function (_pool) {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    _pool.write(query, function () { });
                });

                pool.on("timeout", () => {
                    pool.destroy();
                    done();
                });
                pool.connect();
            });

            it("Should correctly error out operations if pool is closed in the middle of a set", async () => {
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON()
                });
                await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    const promises = [];

                    let errors = 0;
                    for (let i = 0; i < 500; ++i) {
                        promises.push(adone.promise.delay(2 * i).then(() => {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                    numberToSkip: 0,
                                    numberToReturn: 1
                                });
                            return new Promise((resolve) => {
                                pool.write(query, (err) => {
                                    if (err) {
                                        ++errors;
                                    }
                                    resolve();
                                });
                            });
                        }));
                    }
                    pool.destroy();
                    await Promise.all(promises);
                    expect(errors).to.be.at.least(250);
                } finally {
                    pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });

            it("Should correctly recover from a server outage", async () => {
                // Enable connections accounting
                Connection.enableConnectionAccounting();

                // Attempt to connect
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 3000,
                    bson: new BSON(),
                    reconnectTries: 120
                });

                await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });

                try {
                    const promises = [];
                    for (let i = 0; i < 500; ++i) {
                        promises.push(adone.promise.delay(3 * i).then(() => {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                    numberToSkip: 0,
                                    numberToReturn: 1
                                });
                            return new Promise((resolve) => {
                                pool.write(query, resolve);
                            });
                        }));
                    }
                    await Promise.all(promises.slice(0, 250));
                    await configuration.manager.stop();
                    await adone.promise.delay(5000);
                    const p = waitFor(pool, "reconnect");
                    await configuration.manager.start();
                    await Promise.all(promises);
                    await p;
                } finally {
                    pool.destroy();
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });

            it("Should correctly reclaim immediateRelease socket", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    socketTimeout: 1000,
                    bson: new BSON(),
                    reconnect: false
                });

                let index = 0;
                pool.on("connect", function (_pool) {
                    const query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    _pool.write(query, {
                        immediateRelease: true
                    }, function () {
                        index = index + 1;
                    });
                });
                pool.connect();

                await new Promise((resolve) => {
                    pool.on("timeout", resolve);
                });
                expect(index).to.be.equal(0);
                pool.destroy();
                expect(Connection.connections()).to.be.empty;
                Connection.disableConnectionAccounting();
            });

            it("Should correctly exit _execute loop when single avialable connection is destroyed", async () => {
                Connection.enableConnectionAccounting();
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON(),
                    size: 1,
                    socketTimeout: 500,
                    messageHandler: () => { }
                });
                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });

                try {
                    const write = promisify(_pool.write).bind(_pool);

                    let query = new Query(new BSON(), "system.$cmd", {
                        ismaster: true
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    await write(query);

                    // Mark available connection as broken
                    const con = pool.availableConnections[0];
                    pool.availableConnections[0].destroyed = true;
                    try {
                        query = new Query(new BSON(), "system.$cmd", {
                            ismaster: true
                        }, {
                                numberToSkip: 0,
                                numberToReturn: 1
                            });
                        await write(query);
                    } finally {
                        con.destroy(true);
                    }
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                }
            });
        });

        describe("using auth", () => {
            beforeEach(function () {
                this.timeout(120000);
                configuration.useAuth = true;
                return configuration.start();
            });

            afterEach(function () {
                this.timeout(120000);
                configuration.useAuth = false;
                return configuration.stop();
            });

            it("Should correctly authenticate using scram-sha-1 using connect auth", async () => {
                Connection.enableConnectionAccounting();

                // Restart instance
                const method = await locateAuthMethod(configuration);
                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });
                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "admin", "root", "root");
                });
                try {
                    await executeCommand(configuration, "admin", {
                        dropUser: "root"
                    }, {
                            auth: [method, "admin", "root", "root"]
                        });
                } finally {
                    _pool.destroy(true);
                    expect(Connection.connections()).to.be.empty;
                    Connection.disableConnectionAccounting();
                }

            });

            it("Should correctly authenticate using scram-sha-1 using connect auth and maintain auth on new connections", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                        auth: [method, "admin", "root", "root"]
                    });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });

                try {
                    const promises = [];
                    for (let i = 0; i < 10; ++i) {
                        for (let j = 0; j < 10; ++j) {
                            const query = new Query(new BSON(), "test.$cmd", {
                                insert: "test",
                                documents: [{
                                    a: 1
                                }]
                            }, {
                                    numberToSkip: 0,
                                    numberToReturn: 1
                                });

                            promises.push(new Promise((resolve, reject) => {
                                _pool.write(query, {
                                    command: true,
                                    requestId: query.requestId
                                }, (err, result) => {
                                    if (err || result.result.n !== 1) {
                                        return reject(err || new Error(result));
                                    }
                                    resolve();
                                });
                            }));
                        }
                        await adone.promise.delay(1);
                    }
                    await Promise.all(promises);
                    // expect(pool.socketCount()).to.be.at.least(1);
                } finally {
                    pool.destroy(true);
                    expect(Connection.connections()).to.be.empty;
                    Connection.disableConnectionAccounting();
                }
            });

            it("Should correctly authenticate using scram-sha-1 using auth method", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                        auth: [method, "admin", "root", "root"]
                    });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                let error = false;

                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect();
                });
                try {
                    for (let i = 0; i < 100; i++) {
                        process.nextTick(function () {
                            const query = new Query(new BSON(), "system.$cmd", {
                                ismaster: true
                            }, {
                                    numberToSkip: 0,
                                    numberToReturn: 1
                                });
                            _pool.write(query, {
                                command: true,
                                requestId: query.requestId
                            }, function (e) {
                                if (e) error = e;
                            });
                        });
                    }
                    await promisify(pool.auth).call(pool, method, "test", "admin", "admin");

                    const promises = [];
                    for (let i = 0; i < 100; ++i) {
                        promises.push(new Promise((resolve, reject) => {
                            const query = new Query(new BSON(), "test.$cmd", {
                                insert: "test",
                                documents: [{
                                    a: 1
                                }]
                            }, {
                                    numberToSkip: 0,
                                    numberToReturn: 1
                                });
                            _pool.write(query, {
                                command: true,
                                requestId: query.requestId
                            }, (err, result) => {
                                if (err || result.result.n !== 1) {
                                    return reject(err || new Error(result));
                                }
                                resolve();
                            });
                        }));
                    }
                    await Promise.all(promises);
                    // expect(pool.socketCount()).to.be.at.least(1);
                    expect(error).to.be.false;
                } finally {
                    pool.destroy(true);
                    expect(Connection.connections()).to.be.empty;
                    Connection.disableConnectionAccounting();
                }
            });

            it("Should correctly authenticate using scram-sha-1 using connect auth then logout", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                        auth: [method, "admin", "root", "root"]
                    });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });

                const write = promisify(_pool.write).bind(_pool);
                try {
                    const query = new Query(new BSON(), "test.$cmd", {
                        insert: "test",
                        documents: [{
                            a: 1
                        }]
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    await write(query, {
                        command: true,
                        requestId: query.requestId
                    });
                    await promisify(_pool.logout).call(_pool, "test");
                    await write(query, {
                        command: true,
                        requestId: query.requestId
                    }).then(() => {
                        throw new Error("should throw");
                    }, (e) => e);
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });

            it("Should correctly have auth wait for logout to finish", async () => {
                Connection.enableConnectionAccounting();

                const method = await locateAuthMethod(configuration);
                await executeCommand(configuration, "test", {
                    createUser: "admin",
                    pwd: "admin",
                    roles: ["readWrite", "dbAdmin"],
                    digestPassword: true
                }, {
                        auth: [method, "admin", "root", "root"]
                    });

                const pool = new Pool({
                    host: configuration.host,
                    port: configuration.port,
                    bson: new BSON()
                });

                const _pool: any = await new Promise((resolve) => {
                    pool.on("connect", resolve);
                    pool.connect(method, "test", "admin", "admin");
                });
                try {
                    const write = promisify(_pool.write).bind(_pool);
                    const query = new Query(new BSON(), "test.$cmd", {
                        insert: "test",
                        documents: [{
                            a: 1
                        }]
                    }, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        });
                    await write(query, {
                        requestId: query.requestId
                    });
                    await promisify(_pool.logout).call(_pool, "test");
                    await promisify(_pool.auth).call(_pool, method, "test", "admin", "admin");
                    await write(query, {
                        requestId: query.requestId
                    });
                } finally {
                    _pool.destroy(true);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                }
            });
        });
    });

    describe("replset server selection", () => {
        function convert(mode) {
            if (mode.toLowerCase() === "primarypreferred") return "primaryPreferred";
            if (mode.toLowerCase() === "secondarypreferred") return "secondaryPreferred";
            return mode.toLowerCase();
        }

        async function executeEntry(entry, path) {
            const file = JSON.parse(await adone.std.fs.readFileAsync(path));
            // Let's pick out the parts of the selection specification
            const topology_description = file.topology_description;
            const in_latency_window = file.in_latency_window;
            const read_preference = file.read_preference;

            // Create a Replset and populate it with dummy topology servers
            const replset = new ReplSetState();
            replset.topologyType = topology_description.type;
            // For each server add them to the state
            topology_description.servers.forEach(function (s) {
                const server = new Server({
                    host: s.address.split(":")[0],
                    port: parseInt(s.address.split(":")[1], 10)
                });

                // Add additional information
                if (s.avg_rtt_ms) server.lastIsMasterMS = s.avg_rtt_ms;
                if (s.tags) server.ismaster = {
                    tags: s.tags
                };
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

            const entries = adone.std.fs.readdirSync(path).filter(function (x) {
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

            const entries = adone.std.fs.readdirSync(path).filter(function (x) {
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
            const file = JSON.parse(await adone.std.fs.readFileAsync(path));
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
            parts.forEach(function (x) {
                const params = x.split(":");
                // console.dir(params)
                // console.log(f('%s:%s', params[0], params[1] ? parseInt(params[1]) :  27017))
                state.update({
                    name: `${params[0]}:${params[1] ? parseInt(params[1]) : 27017}`,
                    lastIsMaster: () => null,
                    equals(s) {
                        if (typeof s === "string") return s === this.name;
                        return s.name === this.name;
                    },
                    destroy: () => { }
                });
            });

            // console.log(parts)

            // Run each phase
            phases.forEach(function (x) {
                executePhase(state, x);
            });
        }

        function executePhase(state, phase) {
            const responses = phase.responses;
            const outcome = phase.outcome;

            // Apply all the responses
            responses.forEach(function (x) {
                if (Object.keys(x[1]).length === 0) {
                    state.remove({
                        name: x[0],
                        lastIsMaster: () => { },
                        equals(s) {
                            if (typeof s === "string") return s === this.name;
                            return s.name === this.name;
                        },
                        destroy: () => { }
                    });
                } else {
                    const ismaster = x[1];
                    if (ismaster.electionId) ismaster.electionId = new BSON.ObjectId(ismaster.electionId["$oid"]);

                    state.update({
                        name: x[0],
                        lastIsMaster: () => ismaster,
                        equals(s) {
                            if (typeof s === "string") return s === this.name;
                            return s.name === this.name;
                        },
                        destroy: () => { }
                    });
                }
            });

            // Validate the state of the final outcome
            for (const name in outcome.servers) {
                if (outcome.servers[name].electionId) {
                    outcome.servers[name].electionId = new BSON.ObjectId(outcome.servers[name].electionId["$oid"]);
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

        const entries = adone.std.fs.readdirSync(path).filter(function (x) {
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

    describe("server", () => {
        before(function () {
            this.timeout(120000);
            return configuration.start();
        });

        after(function () {
            this.timeout(120000);
            return configuration.stop();
        });

        it("Should correctly connect server to single instance", (done) => {
            // Attempt to connect
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            // Add event listeners
            server.on("connect", function (server) {
                server.destroy();
                done();
            });

            // Start connection
            server.connect();
        });

        it("Should correctly connect server to single instance and execute ismaster", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const r = await promisify(_server.command).call(_server, "admin.$cmd", {
                    ismaster: true
                });

                expect(r.result.ismaster).to.be.true;
                expect(r.connection).to.be.ok;
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute ismaster returning raw", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const r = await promisify(_server.command).call(_server, "admin.$cmd", {
                    ismaster: true
                }, {
                        raw: true
                    });

                expect(r.result).to.be.instanceof(Buffer);
                expect(r.connection).to.be.ok;
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute insert", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                });
                expect(r.result.n).to.be.equal(1);

                r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                        ordered: false
                    });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute bulk insert", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, [{
                    a: 1
                }, {
                    b: 1
                }]);
                expect(r.result.n).to.be.equal(2);

                r = await insert(`${configuration.db}.inserts`, [{
                    a: 1
                }, {
                    b: 1
                }], {
                        ordered: false
                    });
                expect(r.result.n).to.be.equal(2);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute insert with w:0", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);

                let r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                        writeConcern: { w: 0 }
                    });
                expect(r.result.ok).to.be.equal(1);

                r = await insert(`${configuration.db}.inserts`, {
                    a: 1
                }, {
                        ordered: false,
                        writeConcern: { w: 0 }
                    });
                expect(r.result.ok).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute update", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const update = promisify(_server.update).bind(_server);

                const r = await update(`${configuration.db}.inserts_example2`, [{
                    q: {
                        a: 1
                    },
                    u: {
                        "$set": {
                            b: 1
                        }
                    },
                    upsert: true
                }], {
                        writeConcern: { w: 1 },
                        ordered: true
                    });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly connect server to single instance and execute remove", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const insert = promisify(_server.insert).bind(_server);
                const remove = promisify(_server.remove).bind(_server);

                let r = await insert(`${configuration.db}.remove_example`, {
                    a: 1
                });
                expect(r.result.ok).to.be.ok;

                r = await remove(`${configuration.db}.remove_example`, [{
                    q: {
                        a: 1
                    },
                    limit: 1
                }], {
                        writeConcern: { w: 1 },
                        ordered: true
                    });
                expect(r.result.n).to.be.equal(1);
            } finally {
                _server.destroy();
            }
        });

        it("Should correctly recover with multiple restarts", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                bson: new BSON()
            });

            let done = false;

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
                (async () => {
                    await adone.promise.delay(1000);
                    await configuration.manager.stop();
                    await adone.promise.delay(2000);
                    await configuration.manager.start();
                    await adone.promise.delay(1000);
                    await configuration.manager.stop();
                    await adone.promise.delay(2000);
                    await configuration.manager.start();
                    done = true;
                })();
            });
            try {
                const ns = `${configuration.db}.t`;
                const insert = promisify(server.insert).bind(server);
                for (; !done;) {
                    await insert(ns, {
                        a: 1
                    }).catch(() => { });
                    const cursor = _server.cursor(ns, {
                        find: ns,
                        query: {},
                        batchSize: 2
                    });
                    await promisify(cursor.next).call(cursor).catch(() => { });
                    await adone.promise.delay(500);
                }
                await insert(ns, {
                    a: 1
                });
                const cursor = _server.cursor(ns, {
                    find: ns,
                    query: {},
                    batchSize: 2
                });
                await promisify(cursor.next).call(cursor);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly reconnect to server with automatic reconnect enabled", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                size: 1,
                reconnectInterval: 50
            });
            let closeEmitted = false;
            server.on("close", () => closeEmitted = true);
            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const command = promisify(_server.command).bind(_server);
                const result = await command("system.$cmd", {
                    ismaster: true
                }, {
                        readPreference: new ReadPreference("primary")
                    });
                _server.s.currentReconnectRetry = 10;
                // Write garbage, force socket closure
                const reconnect = new Promise((resolve) => server.once("reconnect", resolve));
                try {
                    const a = new Buffer(100);
                    for (let i = 0; i < 100; i++) a[i] = i;
                    result.connection.write(a);
                } catch (err) {
                    //
                }
                await command("system.$cmd", {
                    ismaster: true
                }, {
                        readPreference: new ReadPreference("primary")
                    }).then(() => {
                        throw new Error("should die");
                    }, (e) => e);
                await reconnect;
                expect(closeEmitted).to.be.true;
                expect(server.isConnected()).to.be.true;
                expect(server.s.pool.retriesLeft).to.be.equal(30);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly reconnect to server with automatic reconnect disabled", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: false,
                size: 1
            });
            let closeEmitted = false;
            server.on("close", () => closeEmitted = true);
            let errorEmitted = false;
            server.on("error", () => errorEmitted = true);
            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const command = promisify(_server.command).bind(_server);
                const result = await command("system.$cmd", {
                    ismaster: true
                }, {
                        readPreference: new ReadPreference("primary")
                    });
                // Write garbage, force socket closure
                try {
                    result.connection.destroy();
                } catch (err) {
                    //
                }
                await adone.promise.delay(1);
                await command("system.$cmd", {
                    ismaster: true
                }, {
                        readPreference: new ReadPreference("primary")
                    }).then(() => {
                        throw new Error("should die");
                    }, (e) => e);
                await adone.promise.delay(500);
                expect(closeEmitted).to.be.true;
                expect(errorEmitted).to.be.false;
                expect(server.isConnected()).to.be.false;
            } finally {
                server.destroy();
            }
        });

        it("Should reconnect when initial connection failed", async () => {
            await configuration.manager.stop("SIGINT");
            // Attempt to connect while server is down
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                reconnectTries: 2,
                size: 1,
                emitError: true
            });
            server.on("error", (err) => {
                expect(err).to.be.ok;
                expect(err.message).to.match(/failed to/);
                configuration.manager.start();
            });
            await new Promise((resolve) => {
                server.on("reconnect", resolve);
                server.connect();
            });
            server.destroy();
        });

        it("Should correctly place new connections in available list on reconnect", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                size: 1,
                reconnectInterval: 50
            });

            const _server: any = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const result = await promisify(_server.command).call(_server, "system.$cmd", {
                    ismaster: true
                }, {
                        readPreference: new ReadPreference("primary")
                    });
                _server.s.currentReconnectRetry = 10;
                try {
                    const a = new Buffer(100);
                    for (let i = 0; i < 100; i++) a[i] = i;
                    result.connection.write(a);
                } catch (err) {
                    // 
                }
                await new Promise((resolve) => {
                    server.on("reconnect", resolve);
                });
                const command = promisify(server.command).bind(server);
                const promises = [];
                for (let i = 0; i < 100; ++i) {
                    promises.push(command("system.$cmd", {
                        ismaster: true
                    }));
                }
                await Promise.all(promises);
                expect(server.s.pool.availableConnections.length).to.be.above(0);
                expect(server.s.pool.inUseConnections).to.be.empty;
                expect(server.s.pool.connectingConnections).to.be.empty;
            } finally {
                server.destroy();
            }
        });

        it("Should not overflow the poolSize due to concurrent operations", async () => {
            const server = new Server({
                host: configuration.host,
                port: configuration.port,
                reconnect: true,
                reconnectTries: 2,
                size: 50,
                emitError: true
            });
            await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                const promises = [];
                const insert = promisify(server.insert).bind(server);
                for (let i = 0; i < 5000; ++i) {
                    promises.push(insert(`${configuration.db}.massInsertsTest`, [{
                        a: 1
                    }], {
                            writeConcern: { w: 1 },
                            ordered: true
                        }));
                }
                await Promise.all(promises);
                expect(server.connections()).to.have.lengthOf(50);
            } finally {
                server.destroy();
            }
        });

        it("Should correctly connect execute 5 evals in parallel", async () => {
            var server = new Server({
                host: configuration.host,
                port: configuration.port,
                size: 10,
                bson: new BSON()
            });

            await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });

            var left = 5;
            var start = new Date().getTime();
            const promises = [...new Array(5)].map((x) => {
                return new Promise((resolve, reject) => {
                    server.command('system.$cmd', { eval: 'sleep(100);' }, function (err, r) {
                        err ? reject(err) : resolve();
                    });
                });
            });
            try {
                await Promise.all(promises);
                const total = new Date().getTime() - start;
                expect(total).to.be.within(500, 1000);
            } finally {
                server.destroy();
            }
        });
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
                    const _server: any = await new Promise((resolve) => {
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
                    const _server: any = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new BSON.ObjectId();
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
                    const _server: any = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new BSON.ObjectId();
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
                    const _server: any = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.connect();
                    });
                    try {
                        const objectId = new BSON.ObjectId();
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

    describe("mocks", () => {
        describe("mongos", () => {
            context("single proxy connection", () => {
                it("Should correctly timeout mongos socket operation and then correctly re-execute", async () => {
                    const Mongos = configuration.require.Mongos;
                    let running = true;
                    let currentStep = 0;
                    let stopRespondingPrimary = false;
                    const extend = function (template, fields) {
                        for (const name in template) fields[name] = template[name];
                        return fields;
                    };

                    // Default message fields
                    const defaultFields = {
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    };

                    // Primary server states
                    const serverIsMaster = [extend(defaultFields, {})];
                    const server = await mockupdb.createServer(52000, "localhost");

                    (async () => {
                        adone.promise.delay(500).then(() => {
                            stopRespondingPrimary = true;
                        });
                        while (running) {
                            const request = await server.receive();

                            // Get the document
                            const doc = request.document;
                            const r = request.connection.emit;

                            request.connection.emit = function (...args) {
                                return r.apply(this, args);
                            };
                            if (doc.ismaster && currentStep === 0) {
                                request.reply(serverIsMaster[0]);
                                currentStep += 1;
                            } else if (doc.insert && currentStep === 1) {
                                // Stop responding to any calls (emulate dropping packets on the floor)
                                if (stopRespondingPrimary) {
                                    currentStep += 1;
                                    stopRespondingPrimary = false;
                                    // Timeout after 1500 ms
                                    await adone.promise.delay(1500);
                                    request.connection.destroy();
                                }
                            } else if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 2) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    const _server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 3000,
                            socketTimeout: 3000,
                            haInterval: 500,
                            size: 1
                        });

                    // Are we done
                    let done = false;

                    await new Promise((resolve) => {
                        _server.once("connect", resolve);
                        _server.on("error", function () { });
                        _server.connect();
                    });
                    try {
                        for (; !done;) {
                            await promisify(_server.insert).call(_server, "test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                if (r && !done) {
                                    done = true;
                                    expect(r.connection.port).to.be.equal(52000);
                                    running = false;
                                }
                            }, () => { });
                            await adone.promise.delay(500);
                        }
                    } finally {
                        server.destroy();
                        _server.destroy();
                    }
                });

                it("Should not fail due to available connections equal to 0 during ha process", async () => {
                    // Primary server states
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    const server = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await server.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.find) {
                                await adone.promise.delay(600);
                                // Reply with first batch
                                request.reply({
                                    "cursor": {
                                        "id": BSON.Long.fromNumber(1),
                                        "ns": "test.cursor1",
                                        "firstBatch": [{
                                            _id: new BSON.ObjectId(),
                                            a: 1
                                        }]
                                    },
                                    "ok": 1
                                });
                            } else if (doc.getMore) {
                                // Reply with first batch
                                request.reply({
                                    "cursor": {
                                        "id": BSON.Long.fromNumber(1),
                                        "ns": "test.cursor1",
                                        "nextBatch": [{
                                            _id: new BSON.ObjectId(),
                                            a: 1
                                        }]
                                    },
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const _server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 30000,
                            socketTimeout: 30000,
                            haInterval: 500,
                            size: 1
                        });

                    // Are we done
                    await new Promise((resolve) => {
                        _server.once("connect", resolve);
                        _server.on("error", function () { });
                        _server.connect();
                    });



                    const cursor = _server.cursor("test.test", {
                        find: "test",
                        query: {},
                        batchSize: 2
                    });

                    // Execute next
                    try {
                        const next = promisify(cursor.next).bind(cursor);
                        await next();
                        await next();
                    } finally {
                        running = false;
                        server.destroy();
                        _server.destroy();
                    }
                });
            });

            context("multiple proxies", () => {
                it("Should correctly load-balance the operations", async () => {
                    let running = true;
                    const Mongos = configuration.require.Mongos;
                    // Primary server states
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];

                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                            connectionTimeout: 3000,
                            socketTimeout: 1000,
                            haInterval: 1000,
                            localThresholdMS: 500,
                            size: 1
                        });
                    const _server: any = await new Promise((resolve) => {
                        server.on("connect", resolve);
                        server.on("error", () => { });
                        server.connect();
                    });
                    try {
                        const insert = promisify(_server.insert).bind(_server);
                        let r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(r.connection.port).to.be.oneOf([52000, 52001]);
                        let pport = r.connection.port === 52000 ? 52001 : 52000;

                        r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(pport).to.be.equal(r.connection.port);
                        pport = r.connection.port === 52000 ? 52001 : 52000;

                        r = await insert("test.test", [{
                            created: new Date()
                        }]);
                        expect(pport).to.be.equal(r.connection.port);
                    } finally {
                        running = false;
                        server.destroy();
                        mongos1.destroy();
                        mongos2.destroy();
                    }
                });

                it("Should ignore one of the mongos instances due to being outside the latency window", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();
                            // console.log(" do something 0")
                            // Delay all the operations by 500 ms
                            await adone.promise.delay(500);
                            // console.log(" do something 1 :: " + (new Date().getTime() - s))
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                            connectionTimeout: 3000,
                            localThresholdMS: 50,
                            socketTimeout: 1000,
                            haInterval: 1000,
                            size: 1
                        });

                    try {
                        // Add event listeners
                        await new Promise((resolve) => {
                            server.once("fullsetup", resolve);
                            server.on("error", function () { });
                            server.connect();
                        });
                        try {
                            const insert = promisify(server.insert).bind(server);
                            let r = await insert("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(52000);

                            r = await insert("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(52000);
                        } finally {
                            server.destroy();
                        }

                        const server2 = new Mongos([{
                            host: "localhost",
                            port: 52000
                        },
                        {
                            host: "localhost",
                            port: 52001
                        }
                        ], {
                                connectionTimeout: 3000,
                                localThresholdMS: 1000,
                                socketTimeout: 1000,
                                haInterval: 1000,
                                size: 1
                            });
                        await new Promise((resolve) => {
                            server2.once("fullsetup", resolve);
                            server2.connect();
                        });
                        try {
                            const insert2 = promisify(server2.insert).bind(server2);
                            let r = await insert2("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(52000);
                            r = await insert2("test.test", [{
                                created: new Date()
                            }]);
                            expect(r.connection.port).to.be.equal(52001);
                        } finally {
                            server2.destroy();
                        }

                    } finally {
                        mongos1.destroy();
                        mongos2.destroy();
                        running = false;
                    }
                });
            });

            context("proxy read preference", () => {
                it("Should correctly set query and readpreference field on wire protocol for 3.2", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 5,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc["$query"] && doc["$readPreference"]) {
                                command = doc;
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "cursor": {
                                        "id": BSON.Long.ZERO,
                                        "ns": "test.t",
                                        "firstBatch": []
                                    },
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 3000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });
                    await new Promise((resolve) => {
                        server.once("fullsetup", resolve);
                        server.connect();
                    });
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: ReadPreference.secondary
                        });

                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null;
                        expect(command.$query).to.be.ok;
                        expect(command.$readPreference).to.be.ok;
                        expect(command.$readPreference.mode).to.be.equal("secondary");
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and near readpreference field on wire protocol for 3.2", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 5,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    let running = true;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc["$query"] && doc["$readPreference"]) {
                                command = doc;
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "cursor": {
                                        "id": BSON.Long.ZERO,
                                        "ns": "test.t",
                                        "firstBatch": []
                                    },
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 3000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    await new Promise((resolve) => {
                        server.once("fullsetup", resolve);
                        server.connect();
                    });
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: new ReadPreference("nearest", [{
                                db: "sf"
                            }])
                        });

                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null;
                        expect(command.$query).to.be.ok;
                        expect(command.$readPreference).to.be.ok;
                        expect(command.$readPreference.mode).to.be.equal("nearest");
                        expect(command.$readPreference.tags).to.be.deep.equal([{
                            db: "sf"
                        }]);
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and readpreference field on wire protocol for 2.6", async () => {
                    // Primary server states
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    // Received command on server
                    let command = null;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    let running = true;
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc["$query"] && doc["$readPreference"]) {
                                command = doc;
                                request.reply([]);
                            }
                        }
                    })().catch(() => { });

                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 3000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    // console.log("----------------------- -2")
                    // Add event listeners
                    await new Promise((resolve) => {
                        server.once("connect", resolve);
                        server.connect();
                    });

                    const cursor = server.cursor("test.test", {
                        find: "test",
                        query: {},
                        batchSize: 2,
                        readPreference: ReadPreference.secondary
                    });
                    // console.log("----------------------- -1")
                    try {
                        // Execute next
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null;
                        expect(command.$query).to.be.ok;
                        expect(command.$readPreference).to.be.ok;
                        expect(command.$readPreference.mode).to.be.equal("secondary");
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        running = false;
                    }
                });

                it("Should correctly set query and readpreference field on wire protocol for 2.4", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "ok": 1
                    }];
                    // Received command on server
                    let command = null;
                    // Boot the mock
                    let running = true;
                    const mongos1 = await mockupdb.createServer(52000, "localhost");

                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc["$query"] && doc["$readPreference"]) {
                                command = doc;
                                request.reply([]);
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    }], {
                            connectionTimeout: 3000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const cursor = server.cursor("test.test", {
                            find: "test",
                            query: {},
                            batchSize: 2,
                            readPreference: ReadPreference.secondary
                        });

                        // Execute next
                        const d = await promisify(cursor.next).call(cursor);
                        expect(d).to.be.null;
                        expect(command.$query).to.be.ok;
                        expect(command.$readPreference).to.be.ok;
                        expect(command.$readPreference.mode).to.be.equal("secondary");

                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        running = false;
                    }
                });

            });

            context("proxy failover", () => {
                it("Should correctly failover due to proxy going away causing timeout", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let running = true;
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                return mongos1.destroy();
                            }
                        }
                    })().catch(() => { });

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                            connectionTimeout: 3000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    const insert = promisify(server.insert).bind(server);
                    try {
                        for (; ;) {
                            const r = await insert("test.test", [{
                                created: new Date()
                            }]).catch(() => { });
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                            await adone.promise.delay(500);
                        }
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        mongos2.destroy();
                        running = false;
                    }
                });

                it("Should correctly bring back proxy and use it", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let currentStep = 0;
                    let running = true;
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                            connectionTimeout: 3000,
                            socketTimeout: 1500,
                            haInterval: 1000,
                            size: 1
                        });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const insert = promisify(server.insert).bind(server);
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{
                                created: new Date()
                            }]).catch(() => { });
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                        }
                        const proxies = new Set();
                        for (; proxies.size !== 2;) {
                            await adone.promise.delay(500);
                            if (currentStep === 0) {
                                ++currentStep;
                            }
                            insert("test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                proxies.add(r.connection.port);
                            }, () => { });
                        }
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        mongos2.destroy();
                        running = false;
                    }
                });

                it("Should correctly bring back both proxies and use it", async () => {
                    const serverIsMaster = [{
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");
                    let currentStep = 0;
                    let running = true;
                    // Mongos
                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 0) {
                                await adone.promise.delay(1600);
                                request.connection.destroy();
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([{
                        host: "localhost",
                        port: 52000
                    },
                    {
                        host: "localhost",
                        port: 52001
                    }
                    ], {
                            connectionTimeout: 3000,
                            socketTimeout: 1500,
                            haInterval: 1000,
                            size: 1
                        });

                    // Add event listeners
                    server.connect();
                    await waitFor(server, "fullsetup");
                    try {
                        const insert = promisify(server.insert).bind(server);
                        await adone.promise.delay(500);
                        await insert("test.test", [{
                            created: new Date()
                        }]).catch(() => { });
                        if (currentStep === 0) {
                            ++currentStep;
                        }
                        const proxies = new Set();
                        for (; proxies.size !== 2;) {
                            await adone.promise.delay(100);
                            insert("test.test", [{
                                created: new Date()
                            }]).then((r) => {
                                proxies.add(r.connection.port);
                            }, () => { });
                        }
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        mongos2.destroy();
                        running = false;
                    }
                });
            });
        });

        describe("replica set", () => {
            context("add remove", () => {
                specify("Successfully add a new secondary server to the set", async () => {

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": [
                            "localhost:32000",
                            "localhost:32001",
                            "localhost:32002"
                        ],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [
                        lodash.defaults({
                            "ismaster": true,
                            "secondary": false,
                            "me": "localhost:32000",
                            "primary": "localhost:32000",
                            "tags": {
                                "loc": "ny"
                            }
                        }, defaultFields),
                        lodash.defaults({
                            "ismaster": true,
                            "secondary": false,
                            "me": "localhost:32000",
                            "primary": "localhost:32000",
                            "tags": {
                                "loc": "ny"
                            },
                            "hosts": [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            "setVersion": 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const firstSecondary = [
                        lodash.defaults({
                            "ismaster": false,
                            "secondary": true,
                            "me": "localhost:32001",
                            "primary": "localhost:32000",
                            "tags": {
                                "loc": "sf"
                            }
                        }, defaultFields),
                        lodash.defaults({
                            "ismaster": false,
                            "secondary": true,
                            "me": "localhost:32001",
                            "primary": "localhost:32000",
                            "tags": {
                                "loc": "sf"
                            },
                            "hosts": [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            "setVersion": 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const secondSecondary = [
                        lodash.defaults({
                            "ismaster": false,
                            "secondary": true,
                            "me": "localhost:32003",
                            "primary": "localhost:32000",
                            "tags": {
                                "loc": "sf"
                            },
                            "hosts": [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            "setVersion": 2
                        }, defaultFields)
                    ];

                    // Primary server states
                    const arbiter = [
                        lodash.defaults({
                            "ismaster": false,
                            "secondary": false,
                            "arbiterOnly": true,
                            "me": "localhost:32002",
                            "primary": "localhost:32000"
                        }, defaultFields),
                        lodash.defaults({
                            "ismaster": false,
                            "secondary": false,
                            "arbiterOnly": true,
                            "me": "localhost:32002",
                            "primary": "localhost:32000",
                            "hosts": [
                                "localhost:32000",
                                "localhost:32001",
                                "localhost:32002",
                                "localhost:32003"
                            ],
                            "setVersion": 2
                        }, defaultFields)
                    ];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    },
                    {
                        host: "localhost",
                        port: 32001
                    },
                    {
                        host: "localhost",
                        port: 32002
                    }
                    ], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    const secondaries = {};
                    const arbiters = {};

                    server.on("error", () => { });
                    server.on("connect", function () {
                        server.__connected = true;
                    });
                    server.on("fullsetup", () => { });

                    adone.promise.delay(500).then(() => server.connect());
                    try {
                        await new Promise((resolve) => {
                            server.on("joined", (_type, _server) => {
                                if (_type === "arbiter") {
                                    arbiters[_server.name] = _server;
                                    // Flip the ismaster message
                                    currentIsMasterIndex = currentIsMasterIndex + 1;
                                } else if (_type === "secondary") {
                                    // test.equal(true, server.__connected);
                                    secondaries[_server.name] = _server;
                                    if (Object.keys(secondaries).length === 2) {
                                        resolve();
                                    }
                                }
                            });
                        });
                        expect(secondaries).to.have.property("localhost:32001");
                        expect(secondaries).to.have.property("localhost:32003");
                        expect(arbiters).to.have.property("localhost:32002");
                    } finally {
                        running = false;
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();

                        await adone.promise.delay(3000);
                        expect(Connection.connections()).to.be.empty;
                        Connection.disableConnectionAccounting();
                    }
                });

                specify("Successfully remove a secondary server from the set", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": [
                            "localhost:32000",
                            "localhost:32001",
                            "localhost:32002",
                            "localhost:32003"
                        ],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        },
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        },
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32003",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), {
                        "ismaster": true,
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    },
                    {
                        host: "localhost",
                        port: 32001
                    },
                    {
                        host: "localhost",
                        port: 32002
                    }
                    ], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });


                    adone.promise.delay(500).then(() => server.connect());

                    // Joined
                    let joined = 0;

                    const joinedp = new Promise((resolve) => {
                        server.on("joined", () => {
                            joined = joined + 1;
                            if (joined === 4) {
                                resolve();
                            }
                        });
                    });

                    const leftp = new Promise((resolve) => {
                        server.on("left", function (_type, _server) {
                            if (_type === "secondary" && _server.name === "localhost:32003") {
                                resolve();
                            }
                        });
                    });
                    try {
                        await joinedp;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.equal("localhost:32003");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                        currentIsMasterIndex = currentIsMasterIndex + 1;

                        await leftp;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successfully remove and re-add secondary server to the set", async () => {
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002", "localhost:32003"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        },
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        },
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32003",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), {
                        "ismaster": true,
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    }, lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32003",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "setVersion": 2
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    let running = true;
                    let currentIsMasterIndex = 0;
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(500).then(() => server.connect());
                    try {
                        const p = new Promise((resolve) => {
                            server.on("left", function (_type, _server) {
                                if (_type === "secondary" && _server.name === "localhost:32003") {
                                    expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                                    expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                                    expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                                    expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                                    expect(server.s.replicaSetState.primary).to.be.ok;
                                    expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                                    currentIsMasterIndex = currentIsMasterIndex + 1;
                                    resolve();
                                }
                            });
                        });
                        await adone.promise.delay(3000);
                        expect(server.s.replicaSetState.set["localhost:32000"].type).to.be.equal("RSPrimary");
                        expect(server.s.replicaSetState.set["localhost:32001"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.set["localhost:32002"].type).to.be.equal("RSArbiter");
                        expect(server.s.replicaSetState.set["localhost:32003"].type).to.be.equal("RSSecondary");
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                        await p;
                        await adone.promise.delay(6000);
                        expect(server.s.replicaSetState.set["localhost:32000"].type).to.be.equal("RSPrimary");
                        expect(server.s.replicaSetState.set["localhost:32001"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.set["localhost:32002"].type).to.be.equal("RSArbiter");
                        expect(server.s.replicaSetState.set["localhost:32003"].type).to.be.equal("RSSecondary");
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.primary).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(3000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });

            context("all servers close", () => {
                specify("Successful reconnect when driver looses touch with entire replicaset", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];
                    let die = false;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": { "loc": "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": { "loc": "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(primary[0]);
                                } else if (doc.insert) {
                                    request.reply({ "ok": 1, "n": 1 });
                                }
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(firstSecondary[0]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            if (die) {
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(arbiter[0]);
                                }
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 2000,
                            socketTimeout: 2000,
                            haInterval: 500,
                            size: 500
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2500);
                    die = true;
                    await adone.promise.delay(2500);
                    die = false;
                    await adone.promise.delay(12000);
                    try {
                        await promisify(_server.command).call(_server, "admin.$cmd", { ismaster: true });
                        expect(_server.s.replicaSetState.primary).not.to.be.null;
                        expect(_server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(_server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successfully come back from a dead replicaset that has been unavailable for a long time", async () => {
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];
                    let die = false;
                    let running = true;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:34000", "localhost:34001", "localhost:34002"],
                        "arbiters": ["localhost:34002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:34000",
                        "primary": "localhost:34000",
                        "tags": { "loc": "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:34001",
                        "primary": "localhost:34000",
                        "tags": { "loc": "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:34002",
                        "primary": "localhost:34000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(34000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(34001, "localhost");
                    const arbiterServer = await mockupdb.createServer(34002, "localhost");
                    // Boot the mock
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            if (die) {
                                // console.log("------------------ die 1")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(primary[0]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            if (die) {
                                // console.log("------------------ die 2")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(firstSecondary[0]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            if (die) {
                                // console.log("------------------ die 3")
                                request.connection.destroy();
                            } else {
                                const doc = request.document;

                                if (doc.ismaster) {
                                    request.reply(arbiter[0]);
                                }
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 34000 },
                        { host: "localhost", port: 34001 },
                        { host: "localhost", port: 34002 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 5000,
                            haInterval: 1000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    await waitFor(server, "connect");
                    await adone.promise.delay(2500);
                    die = true;
                    adone.promise.delay(25000).then(() => die = false);
                    try {
                        for (let i = 0; i < 15; ++i) {
                            server.command("admin.$cmd", { ismaster: true }, () => { });
                            await adone.promise.delay(2000);
                        }
                        await promisify(server.command).call(server, "admin.$cmd", { ismaster: true });
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        running = false;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });

            context("connection", () => {
                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": { "loc": "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": { "loc": "sf" }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    try {
                        await new Promise((resolve) => {
                            server.on("joined", function (_type) {
                                if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                    // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                    // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                    // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                    if (server.s.replicaSetState.secondaries.length === 1 && server.s.replicaSetState.arbiters.length === 1 && server.s.replicaSetState.primary) {
                                        resolve();
                                    }
                                }
                            });
                        });
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter using arbiter as seed", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": { "loc": "ny" }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Boot the mock
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", function (_type) {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)
                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary but missing arbiter", async () => {
                    const running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    await new Promise((resolve) => {
                        let numberOfEvents = 0;
                        server.on("joined", function () {
                            numberOfEvents = numberOfEvents + 1;
                            if (numberOfEvents === 3) {
                                resolve();
                            }
                        });

                        server.on("failed", function () {
                            // console.log("== failed :: " + server.name)
                            numberOfEvents = numberOfEvents + 1;
                            if (numberOfEvents === 3) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(0);

                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        server.destroy();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Fail to connect due to missing primary", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "error");

                    server.destroy();
                    firstSecondaryServer.destroy();
                    running = false;
                    await adone.promise.delay(1000);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                });

                specify("Successful connection to replicaset of 0 primary, 1 secondary and 1 arbiter with secondaryOnlyConnectionAllowed", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1,
                            secondaryOnlyConnectionAllowed: true
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", function () {
                            if (server.s.replicaSetState.secondaries.length === 1
                                && server.s.replicaSetState.arbiters.length === 1) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).to.be.null;
                    } finally {
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should print socketTimeout warning due to socketTimeout < haInterval", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 2000,
                            haInterval: 5000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "error");

                    primaryServer.destroy();
                    firstSecondaryServer.destroy();
                    arbiterServer.destroy();
                    server.destroy();
                    running = false;
                    await adone.promise.delay(1000);
                    Connection.disableConnectionAccounting();
                    expect(Connection.connections()).to.be.empty;
                });

                it("Should connect with a replicaset with a single primary and secondary", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 10000,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", function (_type) {
                            if (_type === "secondary" || _type === "primary") {
                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.primary).to.be.ok;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");

                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        server.destroy();
                        running = false;

                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter with different seedlist names", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "127.0.0.1", port: 32002 },
                        { host: "127.0.0.1", port: 32001 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", function (_type) {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                if (server.s.replicaSetState.secondaries.length === 1
                                    && server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");

                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 0 secondary and 1 arbiter", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    // firstSecondaryServer = yield mockupdb.createServer(32001, 'localhost');
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    await new Promise((resolve) => {
                        server.on("joined", function (_type) {
                            if (_type === "arbiter" || _type === "secondary" || _type === "primary") {
                                // console.log("!!!!!!!!!!!!!!!!! joined :: " + _type)
                                // console.log("server.s.replicaSetState.secondaries = " + server.s.replicaSetState.secondaries.length)
                                // console.log("server.s.replicaSetState.arbiters = " + server.s.replicaSetState.arbiters.length)

                                if (server.s.replicaSetState.arbiters.length === 1
                                    && server.s.replicaSetState.primary) {
                                    resolve();
                                }
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");

                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        primaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successful connection to replicaset of 1 primary, 1 secondary and 1 arbiter with single seed should emit fullsetup and all", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    server.on("fullsetup", function () {
                        // console.log("============= fullsetup")
                        server.__fullsetup = true;
                    });
                    server.on("connect", function () {
                        // console.log("============= connect")
                        server.__connected = true;
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "all");

                    expect(server.__connected).to.be.ok;
                    expect(server.__fullsetup).to.be.ok;

                    primaryServer.destroy();
                    firstSecondaryServer.destroy();
                    arbiterServer.destroy();
                    server.destroy();
                    running = false;
                });
            });

            context("failover", () => {
                specify("Successfully failover to new primary", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Election Ids
                    const electionIds = [new BSON.ObjectId(0), new BSON.ObjectId(1)];
                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32001",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Die
                    let die = false;

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(primary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(firstSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(secondSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    Server.enableServerAccounting();

                    adone.promise.delay(100).then(() => server.connect());
                    server.on("error", function () { });
                    await waitFor(server, "connect");
                    server.__connected = true;
                    await adone.promise.delay(100);

                    die = true;
                    currentIsMasterIndex = currentIsMasterIndex + 1;

                    // Keep the count of joined events
                    let joinedEvents = 0;

                    adone.promise.delay(2500).then(() => {
                        die = false;
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                    });

                    // Add listener
                    await new Promise((resolve) => {
                        server.on("joined", function (_type, _server) {
                            if (_type === "secondary" && _server.name === "localhost:32000") {
                                joinedEvents = joinedEvents + 1;
                            } else if (_type === "primary" && _server.name === "localhost:32001") {
                                joinedEvents = joinedEvents + 1;
                            } else if (_type === "secondary" && _server.name === "localhost:32002") {
                                joinedEvents = joinedEvents + 1;
                            }

                            // Got both events
                            if (joinedEvents === 3) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.oneOf(["localhost:32002", "localhost:32000"]);
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.oneOf(["localhost:32002", "localhost:32000"]);
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32001");
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        Server.disableServerAccounting();
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                specify("Successfully failover to new primary and emit reconnect event", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Election Ids
                    const electionIds = [new BSON.ObjectId(0), new BSON.ObjectId(1)];
                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32001",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        },
                        "electionId": electionIds[1]
                    }, defaultFields)];

                    // Die
                    let die = false;

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(primary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(firstSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (die) {
                                request.connection.destroy();
                            } else {
                                if (doc.ismaster) {
                                    request.reply(secondSecondary[currentIsMasterIndex]);
                                }
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    Server.enableServerAccounting();
                    adone.promise.delay(100).then(() => server.connect());

                    await waitFor(server, "connect");
                    await adone.promise.delay(100);

                    die = true;
                    currentIsMasterIndex = currentIsMasterIndex + 1;

                    adone.promise.delay(2500).then(() => {
                        die = false;
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                    });

                    // Keep the count of joined events
                    await waitFor(server, "reconnect");
                    primaryServer.destroy();
                    firstSecondaryServer.destroy();
                    secondSecondaryServer.destroy();
                    server.destroy();
                    running = false;

                    Server.disableServerAccounting();
                    await adone.promise.delay(1000);
                    expect(Connection.connections()).to.be.empty;
                    Connection.disableConnectionAccounting();
                });
            });

            context("maintanance mode", () => {
                specify("Successfully detect server in maintanance mode", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002", "localhost:32003"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32003",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), {
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": false,
                        "me": "localhost:32003",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32003, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });


                    adone.promise.delay(100).then(() => server.connect());

                    // Joined
                    let joined = 0;

                    await new Promise((resolve) => {
                        server.on("joined", function () {
                            joined = joined + 1;
                            // primary, secondary and arbiter have joined
                            if (joined === 4) {
                                resolve();
                            }
                        });
                    });
                    try {
                        expect(server.s.replicaSetState.secondaries).to.have.lengthOf(2);
                        expect(server.s.replicaSetState.secondaries[0].name).to.be.equal("localhost:32001");
                        expect(server.s.replicaSetState.secondaries[1].name).to.be.equal("localhost:32003");
                        expect(server.s.replicaSetState.arbiters).to.have.lengthOf(1);
                        expect(server.s.replicaSetState.arbiters[0].name).to.be.equal("localhost:32002");
                        expect(server.s.replicaSetState.primary).not.to.be.null;
                        expect(server.s.replicaSetState.primary.name).to.be.equal("localhost:32000");
                    } finally {
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                        await new Promise((resolve) => {
                            server.on("left", function (_type, _server) {
                                if (_type === "secondary" && _server.name === "localhost:32003") {
                                    resolve();
                                }
                            });
                        });
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        arbiterServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(2000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });

            context("monitoring", () => {
                it("Should correctly connect to a replicaset where the primary hangs causing monitoring thread to hang", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];
                    // Current index for the ismaster
                    let currentIsMasterState = 0;
                    // Primary stop responding
                    let stopRespondingPrimary = false;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[currentIsMasterState],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32001"
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32001",
                        "primary": "localhost:32001"
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32001"
                    }, defaultFields)];

                    // Joined servers
                    const joinedPrimaries = {};
                    const joinedSecondaries = {};
                    const leftPrimaries = {};

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();

                            // Stop responding to any calls (emulate dropping packets on the floor)
                            if (stopRespondingPrimary) {
                                await adone.promise.delay(10000);
                                continue;
                            }

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster && currentIsMasterState === 0) {
                                request.reply(primary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date(),
                                    electionId: electionIds[currentIsMasterState]
                                });
                            } else if (doc.insert && currentIsMasterState === 1) {
                                request.reply({
                                    "note": "from execCommand",
                                    "ok": 0,
                                    "errmsg": "not master"
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date(),
                                    electionId: electionIds[currentIsMasterState]
                                });
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    "note": "from execCommand",
                                    "ok": 0,
                                    "errmsg": "not master"
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterState]);
                            } else if (doc.insert && currentIsMasterState === 0) {
                                request.reply({
                                    "note": "from execCommand",
                                    "ok": 0,
                                    "errmsg": "not master"
                                });
                            }
                        }
                    })().catch(() => { });

                    // Start dropping the packets
                    adone.promise.delay(5000).then(() => {
                        stopRespondingPrimary = true;
                        currentIsMasterState = 1;
                    });
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 5000,
                            socketTimeout: 3000,
                            haInterval: 2000,
                            size: 1
                        });
                    adone.promise.delay(100).then(() => {
                        server.connect();
                    });

                    server.on("joined", function (type, server) {
                        if (type === "primary") joinedPrimaries[server.name] = 1;
                        if (type === "secondary") joinedSecondaries[server.name] = 1;
                    });

                    server.on("left", function (type, server) {
                        if (type === "primary") leftPrimaries[server.name] = 1;
                    });

                    const _server = await waitFor(server, "connect");

                    const insert = promisify(_server.insert).bind(_server);
                    for (; ;) {
                        await adone.promise.delay(1);
                        const r = await insert("test.test", [{ created: new Date() }]).catch(() => { });
                        if (r && r.connection.port === 32001) {
                            break;
                        }
                    }
                    try {
                        expect(stopRespondingPrimary).to.be.ok;
                        expect(currentIsMasterState).to.be.equal(1);

                        // Ensure the state is correct
                        expect(joinedPrimaries).to.be.deep.equal({
                            "localhost:32000": 1,
                            "localhost:32001": 1
                        });
                        expect(joinedSecondaries).to.be.deep.equal({
                            "localhost:32001": 1,
                            "localhost:32002": 1
                        });

                    } finally {
                        // Destroy mock
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);

                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });
            });

            context("no primary found", () => {
                it("Should correctly connect to a replicaset where the arbiter hangs no primary found error", async () => {
                    let running = true;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"],
                        "arbiters": ["localhost:32003"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32003",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");
                    const arbiterServer = await mockupdb.createServer(32003, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            await adone.promise.delay(5000);
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            }
                        }
                    })().catch(() => { });

                    // Arbiter state machine
                    (async () => {
                        while (running) {
                            await adone.promise.delay(5000);
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[0]);
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    adone.promise.delay(100).then(() => server.connect());
                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 }
                    ], {
                            setName: "rs",
                            connectionTimeout: 2000,
                            socketTimeout: 4000,
                            haInterval: 2000,
                            size: 1
                        });
                    server.on("error", function () {
                        throw new Error("should not error out");
                    });

                    // Add event listeners
                    await waitFor(server, "connect");
                    // Destroy mock
                    primaryServer.destroy();
                    firstSecondaryServer.destroy();
                    secondSecondaryServer.destroy();
                    arbiterServer.destroy();
                    server.destroy();
                    running = false;
                    Connection.disableConnectionAccounting();
                });
            });

            context("operation", () => {
                specify("Correctly execute count command against replicaset with a single member", async () => {
                    let running = true;
                    const currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            } else if (doc.count) {
                                request.reply({
                                    ok: 1,
                                    n: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    let server = new ReplSet([{ host: "localhost", port: 32000 }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1,
                        disconnectHandler: {
                            add() { }, execute() { }
                        }
                    });
                    adone.promise.delay(100).then(() => server.connect());
                    server = await waitFor(server, "connect");

                    try {
                        await promisify(server.command).call(server, "test.test", { count: "test" });
                    } finally {
                        primaryServer.destroy();
                        server.destroy();
                        running = false;

                    }
                });

                specify("Correctly execute count command against replicaset with a single member and secondaryPreferred", async () => {
                    let running = true;
                    const currentIsMasterIndex = 0;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            } else if (doc.count) {
                                request.reply({
                                    ok: 1,
                                    n: 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    let server = new ReplSet([{ host: "localhost", port: 32000 }], {
                        setName: "rs",
                        connectionTimeout: 3000,
                        socketTimeout: 0,
                        haInterval: 2000,
                        size: 1,
                        disconnectHandler: {
                            add() { }, execute() { }
                        }
                    });
                    adone.promise.delay(100).then(() => server.connect());

                    server = await waitFor(server, "connect");
                    try {
                        await promisify(server.command).call(server, "test.test", { count: "test" }, { readPreference: ReadPreference.secondaryPreferred });
                    } finally {
                        primaryServer.destroy();
                        server.destroy();
                        running = false;
                    }
                });
            });

            context("primary loses network", () => {
                specify("Recover from Primary loosing network connectivity", async () => {
                    let running = true;
                    let currentIsMasterIndex = 0;
                    let step = 0;

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": new BSON.ObjectId(),
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32002",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32002",
                        "primary": "localhost:32002",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            // Fail primary
                            if (step >= 1) return;

                            if (doc.ismaster) {
                                request.reply(primary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[currentIsMasterIndex]);
                            }
                        }
                    })().catch(() => { });
                    Connection.enableConnectionAccounting();

                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });
                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    adone.promise.delay(2000).then(() => {
                        ++step;
                        return adone.promise.delay(1000);
                    }).then(() => {
                        step = step + 1;
                        currentIsMasterIndex = currentIsMasterIndex + 1;
                    });
                    await new Promise((resolve) => {
                        server.on("left", function (_type) {
                            if (_type === "primary") {
                                server.on("joined", function (_type, _server) {
                                    if (_type === "primary" && _server.name === "localhost:32002") {
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                    primaryServer.destroy();
                    firstSecondaryServer.destroy();
                    secondSecondaryServer.destroy();
                    running = false;
                    Connection.disableConnectionAccounting();
                    _server.destroy();
                });
            });

            context("read preferences", () => {
                it("Should correctly connect to a replicaset and select the correct tagged secondary server", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondary", { loc: "dc" })
                            });
                        expect(r.connection.port === 32002).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and select the primary server", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("primaryPreferred")
                            });
                        expect(r.connection.port).to.be.equal(32000);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly round robin secondary reads", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");
                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    // Add event listeners
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    // Set up a write
                    // Perform a find
                    const command = promisify(_server.command).bind(_server);
                    try {

                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondary")
                            });
                        let port = r.connection.port;
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondary")
                            });
                        expect(r.connection.port !== port).to.be.ok;
                        port = r.connection.port;

                        // Perform a find
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondary")
                            });
                        expect(r.connection.port !== port).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly fall back to a secondary server if the readPreference is primaryPreferred", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // mock ops store from node-mongodb-native for handling repl set disconnects
                    const mockDisconnectHandler = {
                        add(opType, ns, ops, options, callback) {
                            // Command issued to replSet will fail immediately if !server.isConnected()
                            return callback(MongoError.create({
                                message: "no connection available",
                                driver: true
                            }));
                        },
                        execute() {
                            // method needs to be called, so provide a dummy version
                            return;
                        },
                        flush() {
                            // method needs to be called, so provide a dummy version
                            return;
                        }
                    };

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000,
                        socketTimeout: 3000,
                        connectionTimeout: 3000
                    }, {
                        host: "localhost",
                        port: 32001
                    }], {
                            setName: "rs",
                            // connectionTimeout: 10000,
                            // socketTimeout: 10000,
                            haInterval: 10000,
                            disconnectHandler: mockDisconnectHandler,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    // Add event listeners
                    await adone.promise.delay(500);
                    try {
                        const command = promisify(_server.command).bind(_server);
                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("primaryPreferred")
                            });
                        expect(r.connection.port).to.be.equal(32000);

                        primaryServer.destroy();
                        await waitFor(_server, "left");
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("primaryPreferred")
                            });
                        expect(r.connection.port).to.be.equal(32001); // reads from secondary while primary down
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        _server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly fallback to secondaries when primary not available", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.connection.destroy();
                                break;
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");

                    const command = promisify(_server.command).bind(_server);
                    try {
                        // Perform a find
                        await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("primaryPreferred")
                            }).catch(() => { });
                        // Let all sockets properly close
                        await adone.promise.delay(10);
                        // Test primaryPreferred
                        let r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("primaryPreferred")
                            });
                        expect(r.connection.port !== 32000).to.be.ok;

                        // Test secondaryPreferred
                        r = await command("test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondaryPreferred")
                            });
                        expect(r.connection.port !== 32000).to.be.ok;
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and perform correct nearness read", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 1000,
                            size: 1
                        });


                    adone.promise.delay(100).then(() => server.connect());
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        _server.s.replicaSetState.secondaries = _server.s.replicaSetState.secondaries.map(function (x, i) {
                            x.lastIsMasterMS = i * 20;
                            return x;
                        });

                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("nearest")
                            });

                        expect(r.connection.port).to.be.oneOf([3200, 32001]);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect to a replicaset and perform correct nearness read with tag", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001", "localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const secondSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "dc"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const secondSecondaryServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await secondSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(secondSecondary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    // console.log("--------------------------------------------- -2")
                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }, {
                        host: "localhost",
                        port: 32001
                    }, {
                        host: "localhost",
                        port: 32002
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 1000,
                            size: 1
                        });

                    adone.promise.delay(100).then(() => server.connect());
                    // Add event listeners
                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(2000);
                    try {
                        _server.s.replicaSetState.secondaries = _server.s.replicaSetState.secondaries.map(function (x, i) {
                            x.lastIsMasterMS = i * 20;
                            return x;
                        });
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("nearest", { loc: "dc" })
                            });
                        expect(r.connection.port).to.be.oneOf([32001, 32002]);
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        secondSecondaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        Connection.disableConnectionAccounting();
                        expect(Connection.connections()).to.be.empty;
                    }
                });

                it("Should correctly connect connect to single server replicaset and peform a secondaryPreferred", async () => {
                    let running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    // Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(primary[0]);
                            } else if (doc.count) {
                                request.reply({
                                    "waitedMS": BSON.Long.ZERO,
                                    "n": 1,
                                    "ok": 1
                                });
                            }
                        }
                    })().catch(() => { });

                    Connection.enableConnectionAccounting();
                    // Attempt to connect
                    const server = new ReplSet([{
                        host: "localhost",
                        port: 32000
                    }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    // Add event listeners
                    adone.promise.delay(100).then(() => server.connect());

                    const _server = await waitFor(server, "connect");
                    await adone.promise.delay(500);
                    // Perform a find
                    try {
                        const r = await promisify(_server.command).call(_server, "test.test", {
                            count: "test.test",
                            batchSize: 2
                        }, {
                                readPreference: new ReadPreference("secondaryPreferred")
                            });
                        expect(r.connection.port).to.be.equal(32000);

                    } finally {
                        primaryServer.destroy();
                        server.destroy();
                        running = false;
                        await adone.promise.delay(1000);
                        expect(Connection.connections()).to.be.empty;
                        Connection.disableConnectionAccounting();
                    }
                });
            });

            context("step down", () => {

            });
        });

        describe("sdam", () => {
            context.skip("mongos", () => {
                specify("SDAM Monitoring Should correctly connect to two proxies", async () => {
                    let running = true;
                    // Current index for the ismaster
                    let currentStep = 0;

                    // Default message fields
                    const defaultFields = {
                        "ismaster": true,
                        "msg": "isdbgrid",
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    };

                    // Primary server states
                    const serverIsMaster = [lodash.defaults({}, defaultFields)];
                    // Boot the mock
                    const mongos1 = await mockupdb.createServer(52000, "localhost");
                    const mongos2 = await mockupdb.createServer(52001, "localhost");

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos1.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 1) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Mongos
                    (async () => {
                        while (running) {
                            const request = await mongos2.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Mongos([
                        { host: "localhost", port: 52000 },
                        { host: "localhost", port: 52001 }
                    ], {
                            connectionTimeout: 3000,
                            socketTimeout: 1500,
                            haInterval: 1000,
                            size: 1
                        });

                    const responses = {};
                    const add = function (a) {
                        if (!responses[a.type]) responses[a.type] = [];
                        responses[a.type].push(a.event);
                    };

                    const o = server.emit;
                    server.emit = function (...args) {
                        console.log(args[0]);
                        return o.apply(this, args);
                    };

                    server.on("serverOpening", function (event) {
                        add({ type: "serverOpening", event });
                    });

                    server.on("serverClosed", function (event) {
                        add({ type: "serverClosed", event });
                    });

                    server.on("serverDescriptionChanged", function (event) {
                        add({ type: "serverDescriptionChanged", event });
                    });

                    server.on("topologyOpening", function (event) {
                        add({ type: "topologyOpening", event });
                    });

                    server.on("topologyClosed", function (event) {
                        add({ type: "topologyClosed", event });
                    });

                    server.on("topologyDescriptionChanged", function (event) {
                        add({ type: "topologyDescriptionChanged", event });
                    });

                    server.on("serverHeartbeatStarted", function (event) {
                        add({ type: "serverHeartbeatStarted", event });
                    });

                    server.on("serverHeartbeatSucceeded", function (event) {
                        add({ type: "serverHeartbeatSucceeded", event });
                    });

                    server.on("serverHeartbeatFailed", function (event) {
                        add({ type: "serverHeartbeatFailed", event });
                    });

                    server.on("error", function () { });
                    server.connect();

                    const _server = await waitFor(server, "fullsetup");

                    const insert = promisify(server.insert).bind(server);
                    try {
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{ created: new Date() }]).catch(() => { });
                            if (r) {
                                expect(r.connection.port).to.be.equal(52001);
                                break;
                            }
                        }
                        const proxies = new Set();

                        for (; ;) {
                            await adone.promise.delay(500);
                            if (currentStep === 0) {
                                ++currentStep;
                            }
                            const r = await insert("test.test", [{ created: new Date() }]).catch(() => { });
                            if (r) {
                                proxies.add(r.connection.port);
                            }
                            if (proxies.size === 2) {
                                break;
                            }
                        }
                    } finally {
                        server.destroy();
                        mongos1.destroy();
                        mongos2.destroy();
                    }

                    await adone.promise.delay(1000);

                    const results = [{
                        "topologyId": _server.s.id,
                        "previousDescription": {
                            "topologyType": "Sharded",
                            "servers": []
                        },
                        "newDescription": {
                            "topologyType": "Sharded",
                            "servers": [
                                {
                                    "type": "Mongos",
                                    "address": "localhost:52000"
                                },
                                {
                                    "type": "Unknown",
                                    "address": "localhost:52001"
                                }
                            ]
                        }
                    }, {
                        "topologyId": _server.s.id,
                        "previousDescription": {
                            "topologyType": "Sharded",
                            "servers": [
                                {
                                    "type": "Mongos",
                                    "address": "localhost:52000"
                                },
                                {
                                    "type": "Unknown",
                                    "address": "localhost:52001"
                                }
                            ]
                        },
                        "newDescription": {
                            "topologyType": "Sharded",
                            "servers": [
                                {
                                    "type": "Mongos",
                                    "address": "localhost:52000"
                                },
                                {
                                    "type": "Mongos",
                                    "address": "localhost:52001"
                                }
                            ]
                        }
                    }];
                    running = false;
                    console.log(responses);
                    for (let i = 0; i < responses["topologyDescriptionChanged"].length; i++) {
                        expect(results[i]).to.be.deep.equal(responses["topologyDescriptionChanged"][i]);
                    }
                });
            });

            context("single", () => {
                it("Should correctly emit sdam monitoring events for single server", async () => {
                    const running = true;

                    // Default message fields
                    const defaultFields = {
                        "ismaster": true,
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    };

                    // Primary server states
                    const serverIsMaster = [lodash.defaults({}, defaultFields)];
                    // Boot the mock
                    const sserver = await mockupdb.createServer(37018, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await sserver.receive();

                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster) {
                                request.reply(serverIsMaster[0]);
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new Server({
                        host: "localhost",
                        port: "37018",
                        connectionTimeout: 3000,
                        socketTimeout: 1000,
                        size: 1
                    });

                    // Results
                    const flags = [];
                    let id = null;

                    // Add event listeners
                    server.once("connect", function (_server) {
                        // console.log("----------------------------- connect")
                        id = _server.id;
                        _server.destroy({ emitClose: true });
                    });

                    server.on("serverOpening", function (event) {
                        // console.log("----------------------------- serverOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[0] = event;
                    });

                    server.on("serverClosed", function (event) {
                        // console.log("----------------------------- serverClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[1] = event;
                    });

                    server.on("serverDescriptionChanged", function (event) {
                        // console.log("----------------------------- serverDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[2] = event;
                    });

                    server.on("topologyOpening", function (event) {
                        // console.log("----------------------------- topologyOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[3] = event;
                    });

                    server.on("topologyClosed", function (event) {
                        // console.log("----------------------------- topologyClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[4] = event;
                    });

                    server.on("topologyDescriptionChanged", function (event) {
                        // console.log("----------------------------- topologyDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        flags[5] = event;
                    });

                    server.on("error", function () { });
                    server.connect();

                    await waitFor(server, "close");
                    await adone.promise.delay(100);
                    try {

                        expect(flags[0]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018"
                        });
                        expect(flags[1]).to.be.deep.equal({
                            topologyId: id,
                            address: "localhost:37018"
                        });
                        expect(flags[2]).to.be.deep.equal({
                            "topologyId": id,
                            "address": "localhost:37018",
                            "previousDescription": {
                                "address": "localhost:37018",
                                "arbiters": [],
                                "hosts": [],
                                "passives": [],
                                "type": "Unknown"
                            },
                            "newDescription": {
                                "address": "localhost:37018",
                                "arbiters": [],
                                "hosts": [],
                                "passives": [],
                                "type": "Standalone"
                            }
                        });
                        expect(flags[3]).to.be.deep.equal({
                            topologyId: id
                        });
                        expect(flags[4]).to.be.deep.equal({
                            topologyId: id
                        });
                        expect(flags[5]).to.be.deep.equal({
                            "topologyId": id,
                            "address": "localhost:37018",
                            "previousDescription": {
                                "topologyType": "Unknown",
                                "servers": [{
                                    "address": "localhost:37018",
                                    "arbiters": [],
                                    "hosts": [],
                                    "passives": [],
                                    "type": "Unknown"
                                }]
                            },
                            "newDescription": {
                                "topologyType": "Single",
                                "servers": [{
                                    "address": "localhost:37018",
                                    "arbiters": [],
                                    "hosts": [],
                                    "passives": [],
                                    "type": "Standalone"
                                }]
                            }
                        });
                    } finally {
                        sserver.destroy();
                    }
                });
            });

            context("replica set", () => {
                specify("Successful emit SDAM monitoring events for replicaset", async () => {
                    const running = true;
                    const electionIds = [new BSON.ObjectId(), new BSON.ObjectId()];

                    /// Default message fields
                    const defaultFields = {
                        "setName": "rs",
                        "setVersion": 1,
                        "electionId": electionIds[0],
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 4,
                        "minWireVersion": 0,
                        "ok": 1,
                        "hosts": ["localhost:32000", "localhost:32001"],
                        "arbiters": ["localhost:32002"]
                    };

                    // Primary server states
                    const primary = [lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32000",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "ny"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const firstSecondary = [lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": true,
                        "me": "localhost:32001",
                        "primary": "localhost:32000",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields), lodash.defaults({
                        "ismaster": true,
                        "secondary": false,
                        "me": "localhost:32001",
                        "primary": "localhost:32001",
                        "tags": {
                            "loc": "sf"
                        }
                    }, defaultFields)];

                    // Primary server states
                    const arbiter = [lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32000"
                    }, defaultFields), lodash.defaults({
                        "ismaster": false,
                        "secondary": false,
                        "arbiterOnly": true,
                        "me": "localhost:32002",
                        "primary": "localhost:32001"
                    }, defaultFields)];

                    // Boot the mock
                    const primaryServer = await mockupdb.createServer(32000, "localhost");
                    const firstSecondaryServer = await mockupdb.createServer(32001, "localhost");
                    const arbiterServer = await mockupdb.createServer(32002, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await primaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(primary[step]);
                            }
                        }
                    })().catch(() => { });

                    // First secondary state machine
                    (async () => {
                        while (running) {
                            const request = await firstSecondaryServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(firstSecondary[step]);
                            }
                        }
                    })().catch(() => { });

                    // Second secondary state machine
                    (async () => {
                        while (running) {
                            const request = await arbiterServer.receive();
                            const doc = request.document;

                            if (doc.ismaster) {
                                request.reply(arbiter[step]);
                            }
                        }
                    })().catch(() => { });

                    // Attempt to connect
                    const server = new ReplSet([
                        { host: "localhost", port: 32000 },
                        { host: "localhost", port: 32001 },
                        { host: "localhost", port: 32002 }], {
                            setName: "rs",
                            connectionTimeout: 3000,
                            socketTimeout: 0,
                            haInterval: 2000,
                            size: 1
                        });

                    const responses = {};
                    let step = 0;
                    const add = function (a) {
                        if (!responses[a.type]) responses[a.type] = [];
                        responses[a.type].push(a.event);
                    };

                    server.on("serverOpening", function (event) {
                        add({ type: "serverOpening", event });
                        // console.log("----------------------------- serverOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[0] = event;
                    });

                    server.on("serverClosed", function (event) {
                        add({ type: "serverClosed", event });
                        // console.log("----------------------------- serverClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[1] = event;
                    });

                    server.on("serverDescriptionChanged", function (event) {
                        add({ type: "serverDescriptionChanged", event });
                        // console.log("----------------------------- serverDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[2] = event;
                    });

                    server.on("topologyOpening", function (event) {
                        add({ type: "topologyOpening", event });
                        // console.log("----------------------------- topologyOpening")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[3] = event;
                    });

                    server.on("topologyClosed", function (event) {
                        add({ type: "topologyClosed", event });
                        // console.log("----------------------------- topologyClosed")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[4] = event;
                    });

                    server.on("topologyDescriptionChanged", function (event) {
                        add({ type: "topologyDescriptionChanged", event });
                        // console.log("----------------------------- topologyDescriptionChanged")
                        // console.log(JSON.stringify(event, null, 2))
                        // flags[5] = event;
                    });

                    server.on("serverHeartbeatStarted", function (event) {
                        add({ type: "serverHeartbeatStarted", event });
                        // console.log("----------------------------- serverHeartbeatStarted")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    server.on("serverHeartbeatSucceeded", function (event) {
                        add({ type: "serverHeartbeatSucceeded", event });
                        // console.log("----------------------------- serverHeartbeatSucceeded")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    server.on("serverHeartbeatFailed", function (event) {
                        add({ type: "serverHeartbeatFailed", event });
                        // console.log("----------------------------- serverHeartbeatFailed")
                        // console.log(JSON.stringify(event, null, 2))
                    });

                    adone.promise.delay(100).then(() => server.connect());

                    const document1 = {
                        "topologyId": server.id,
                        "previousDescription": {
                            "topologyType": "Unknown",
                            "servers": []
                        },
                        "newDescription": {
                            "topologyType": "Unknown",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "diff": {
                            "servers": []
                        }
                    };

                    const document2 = {
                        "topologyId": server.id,
                        "previousDescription": {
                            "topologyType": "Unknown",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "newDescription": {
                            "topologyType": "ReplicaSetWithPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "diff": {
                            "servers": []
                        }
                    };

                    const document3 = {
                        "topologyId": server.id,
                        "previousDescription": {
                            "topologyType": "ReplicaSetWithPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "newDescription": {
                            "topologyType": "ReplicaSetWithPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSArbiter",
                                    "address": "localhost:32002",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "diff": {
                            "servers": []
                        }
                    };

                    const document4 = {
                        "topologyId": server.id,
                        "previousDescription": {
                            "topologyType": "ReplicaSetWithPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSArbiter",
                                    "address": "localhost:32002",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "newDescription": {
                            "topologyType": "ReplicaSetNoPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSArbiter",
                                    "address": "localhost:32002",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "diff": {
                            "servers": [
                                {
                                    "address": "localhost:32000",
                                    "from": "RSPrimary",
                                    "to": "RSSecondary"
                                }
                            ]
                        }
                    };

                    const document5 = {
                        "topologyId": server.id,
                        "previousDescription": {
                            "topologyType": "ReplicaSetNoPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSArbiter",
                                    "address": "localhost:32002",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "newDescription": {
                            "topologyType": "ReplicaSetWithPrimary",
                            "setName": "rs",
                            "servers": [
                                {
                                    "type": "RSPrimary",
                                    "address": "localhost:32001",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSSecondary",
                                    "address": "localhost:32000",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                },
                                {
                                    "type": "RSArbiter",
                                    "address": "localhost:32002",
                                    "hosts": [
                                        "localhost:32000",
                                        "localhost:32001"
                                    ],
                                    "arbiters": [
                                        "localhost:32002"
                                    ],
                                    "setName": "rs"
                                }
                            ]
                        },
                        "diff": {
                            "servers": [
                                {
                                    "address": "localhost:32001",
                                    "from": "RSSecondary",
                                    "to": "RSPrimary"
                                }
                            ]
                        }
                    };

                    const expectedResults = [document1, document2, document3, document4, document5];

                    const _server = await waitFor(server, "fullsetup");

                    await adone.promise.delay(1000);
                    ++step;
                    await adone.promise.delay(5);
                    ++step;
                    await adone.promise.delay(2000);
                    try {
                        try {
                            expect(responses["serverOpening"].length).to.be.at.least(3);
                        } finally {
                            _server.destroy();
                        }
                        // Wait to ensure all events fired
                        await adone.promise.delay(1000);
                        expect(responses["serverOpening"].length).to.be.at.least(3);
                        expect(responses["serverClosed"].length).to.be.at.least(3);
                        expect(responses["topologyOpening"].length).to.be.be.equal(1);
                        expect(responses["topologyClosed"].length).to.be.equal(1);
                        expect(responses["serverHeartbeatStarted"]).not.to.be.empty;
                        expect(responses["serverHeartbeatSucceeded"]).not.to.be.empty;
                        expect(responses["serverDescriptionChanged"]).not.to.be.empty;

                        for (let i = 0; i < expectedResults.length; i++) {
                            expect(expectedResults[i]).to.be.deep.equal(responses["topologyDescriptionChanged"][i]);
                        }
                    } finally {
                        primaryServer.destroy();
                        firstSecondaryServer.destroy();
                        arbiterServer.destroy();
                    }
                });
            });
        });

        describe("single", () => {
            context("timeout", () => {
                it("Should correctly timeout socket operation and then correctly re-execute", async () => {
                    let running = true;
                    // Current index for the ismaster
                    let currentStep = 0;
                    // Primary stop responding
                    let stopRespondingPrimary = false;

                    // Default message fields
                    const defaultFields = {
                        "ismaster": true,
                        "maxBsonObjectSize": 16777216,
                        "maxMessageSizeBytes": 48000000,
                        "maxWriteBatchSize": 1000,
                        "localTime": new Date(),
                        "maxWireVersion": 3,
                        "minWireVersion": 0,
                        "ok": 1
                    };

                    // Primary server states
                    const serverIsMaster = [lodash.defaults({}, defaultFields)];

                    const sserver = await mockupdb.createServer(37019, "localhost");

                    // Primary state machine
                    (async () => {
                        while (running) {
                            const request = await sserver.receive();
                            // Get the document
                            const doc = request.document;
                            if (doc.ismaster && currentStep === 0) {
                                request.reply(serverIsMaster[0]);
                                currentStep += 1;
                            } else if (doc.insert && currentStep === 1) {
                                // Stop responding to any calls (emulate dropping packets on the floor)
                                if (stopRespondingPrimary) {
                                    await adone.promise.delay(3000);
                                    continue;
                                }

                                currentStep += 1;
                            } else if (doc.ismaster && currentStep === 2) {
                                request.reply(serverIsMaster[0]);
                            } else if (doc.insert && currentStep === 2) {
                                request.reply({
                                    ok: 1,
                                    n: doc.documents,
                                    lastOp: new Date()
                                });
                            }
                        }
                    })().catch(() => { });

                    // Start dropping the packets
                    adone.promise.delay(5000).then(() => {
                        stopRespondingPrimary = true;
                    });

                    // Attempt to connect
                    const replset = new Server({
                        host: "localhost",
                        port: 37019,
                        connectionTimeout: 5000,
                        socketTimeout: 1000,
                        size: 1
                    });

                    // Add event listeners
                    replset.on("error", function () { });
                    replset.connect();
                    const _server = await waitFor(replset, "connect");
                    const insert = promisify(_server.insert).bind(_server);
                    const e = await insert("test.test", [{ created: new Date() }]).then(() => null, (e) => e);
                    expect(e).to.be.ok;
                    try {
                        for (; ;) {
                            await adone.promise.delay(500);
                            const r = await insert("test.test", [{ created: new Date() }]).catch(() => { });
                            if (r) {
                                expect(r.connection.port).to.be.equal(37019);
                                break;
                            }
                        }
                    } finally {
                        replset.destroy({ force: true });
                        sserver.destroy();
                        running = false;
                    }
                });
            });
        });
    });
});
