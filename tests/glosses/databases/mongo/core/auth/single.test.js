import {
    locateAuthMethod,
    executeCommand
} from "../shared";

import mongodbVersionManager from "mongodb-version-manager";
import configuration from "../configuration";

const {
    data: { bson: { BSON } }
} = adone;
const promisify = adone.promise.promisify;

describe("mongodb", function () {
    this.timeout(120000);

    const { database: { mongo } } = adone;
    const { core: { Server, Connection } } = adone.private(mongo);

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
            const _server = await new Promise((resolve) => {
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

            const _server = await new Promise((resolve) => {
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
            const _server = await new Promise((resolve) => {
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
            const _server = await new Promise((resolve) => {
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
});
