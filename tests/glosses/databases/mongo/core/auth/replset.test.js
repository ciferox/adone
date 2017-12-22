import {
    locateAuthMethod,
    executeCommand
} from "../shared";

import {
    ReplSet as ReplSetManager
} from "mongodb-topology-manager";
import mongodbVersionManager from "mongodb-version-manager";
import configuration from "../configuration";

const promisify = adone.promise.promisify;

describe("mongodb", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { ReplSet, Connection } } = adone.private(mongo);

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

        beforeEach("start configuration", function () {
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
                    keyFile: `${__dirname}/../key/keyfile.key`,
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
                    dbpath: configuration.root.getDirectory("db", "31000").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31001,
                    dbpath: configuration.root.getDirectory("db", "31001").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31002,
                    dbpath: configuration.root.getDirectory("db", "31002").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31003,
                    dbpath: configuration.root.getDirectory("db", "31003").path()
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31004,
                    dbpath: configuration.root.getDirectory("db", "31004").path()
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

        it.skip("Should fail to authenticate emitting an error due to it being the initial connect", async () => {
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
                expect(Object.keys(Connection.connections())).to.be.empty();
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
                const _server = await new Promise((resolve) => server.on("connect", resolve));
                try {
                    const r = await new Promise((resolve, reject) => {
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

        it.skip("Should correctly authenticate using auth method instead of connect", async () => {
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

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                // Attempt authentication
                await new Promise((resolve, reject) => {
                    _server.auth(method, "admin", "root", "root", (err) => err ? reject(err) : resolve());
                });
                try {
                    const r = await new Promise((resolve, reject) => {
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
                    expect(Connection.connections()).to.be.empty();
                }
            } finally {
                Connection.disableConnectionAccounting();
                await replicasetManager.stop();
            }
        });

        it.skip("Should correctly authenticate using auth method instead of connect and logout user", async () => {
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

            const _server = await new Promise((resolve) => {
                server.on("connect", resolve);
                server.connect();
            });
            try {
                await new Promise((resolve, reject) => {
                    _server.auth(method, "admin", "root", "root", (err) => err ? reject(err) : resolve());
                });
                const r = await new Promise((resolve, reject) => {
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
                expect(Connection.connections()).to.be.empty();
                Connection.disableConnectionAccounting();
                await replicasetManager.stop();
            }
        });
    });
});
