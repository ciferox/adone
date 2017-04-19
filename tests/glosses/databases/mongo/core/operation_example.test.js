import Server from "adone/glosses/databases/mongo/core/lib/topologies/server";
import ReplSet from "adone/glosses/databases/mongo/core/lib/topologies/replset";
import Mongos from "adone/glosses/databases/mongo/core/lib/topologies/mongos";
import mongodbVersionManager from "mongodb-version-manager";
import configuration from "./configuration";

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

                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                            $set: {
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

                const _server = await new Promise((resolve) => {
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

                const _server = await new Promise((resolve) => {
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

                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                            $set: {
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
                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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

                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                            $set: {
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
                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
                const _server = await new Promise((resolve) => {
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
});
