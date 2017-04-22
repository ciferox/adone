import mongodbTopologyManager from "mongodb-topology-manager";

const { database: { mongo } } = adone;

export const single = async (context) => {
    before("start mongod", async () => {
        context.server = new mongodbTopologyManager.Server("mongod", {
            dbpath: (await context.tmpdir.addDirectory("27017")).path(),
            setParameter: ["enableTestCommands=1"]
        });
        await context.server.purge();
        await context.server.start();
    });

    beforeEach("create DB instance", async () => {
        context.DB = new mongo.Db("tests", new mongo.Server("localhost", 27017, {
            poolSize: 1,
            autoReconnect: false
        }), {
            w: 1
        });
    });

    after("stop mongod", async () => {
        if (context.server) {
            await context.server.stop();
        }
    });
};

export const sharded = async (context) => {
    before("start mongos", async function () {
        this.timeout(120000);

        context.server = new mongodbTopologyManager.Sharded({
            mongod: "mongod",
            mongos: "mongos"
        });
        await context.server.addShard([{
            tags: { loc: "ny" },
            options: {
                bind_ip: "localhost",
                port: 31010,
                dbpath: (await context.tmpdir.addDirectory("31010")).path(),
                shardsvr: null
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31011,
                dbpath: (await context.tmpdir.addDirectory("31011")).path(),
                shardsvr: null
            }
        }, {
            // Type of node
            arbiter: true,
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31012,
                dbpath: (await context.tmpdir.addDirectory("31012")).path(),
                shardsvr: null
            }
        }], {
            replSet: "rs1"
        });

        await context.server.addShard([{
            tags: { loc: "ny" },
            options: {
                bind_ip: "localhost",
                port: 31020,
                dbpath: (await context.tmpdir.addDirectory("31020")).path(),
                shardsvr: null
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31021,
                dbpath: (await context.tmpdir.addDirectory("31021")).path(),
                shardsvr: null
            }
        }, {
            // Type of node
            arbiter: true,
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31022,
                dbpath: (await context.tmpdir.addDirectory("31022")).path(),
                shardsvr: null
            }
        }], {
            replSet: "rs2"
        });

        await context.server.addConfigurationServers([{
            options: {
                bind_ip: "localhost",
                port: 35000,
                dbpath: (await context.tmpdir.addDirectory("35000")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 35001,
                dbpath: (await context.tmpdir.addDirectory("35001")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 35002,
                dbpath: (await context.tmpdir.addDirectory("35002")).path()
            }
        }], {
            replSet: "rs3"
        });

        await context.server.addProxies([{
            bind_ip: "localhost",
            port: 51000,
            configdb: "localhost:35000,localhost:35001,localhost:35002"
        }, {
            bind_ip: "localhost",
            port: 51001,
            configdb: "localhost:35000,localhost:35001,localhost:35002"
        }], {
            binary: "mongos"
        });

        await context.server.purge();
        await context.server.start();
    });

    beforeEach("create DB instance", () => {
        context.DB = new mongo.Db("tests", new mongo.Mongos([
            new mongo.Server("localhost", 51000, {
                poolSize: 1,
                autoReconnect: false
            })], {
                w: "majority",
                wtimeout: 30000
            }), {
                w: 1
            });
    });

    after("stop mongos", async function () {
        this.timeout(120000);
        if (context.server) {
            await context.server.stop();
        }
    });
};

export const replicaset = async (context) => {
    before("start mongod", async function () {
        this.timeout(120000);
        context.server = new mongodbTopologyManager.ReplSet("mongod", [{
            tags: { loc: "ny" },
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31000,
                dbpath: (await context.tmpdir.addDirectory("31000")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31001,
                dbpath: (await context.tmpdir.addDirectory("31001")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31002,
                dbpath: (await context.tmpdir.addDirectory("31002")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            priority: 0,
            options: {
                bind_ip: "localhost",
                port: 31003,
                dbpath: (await context.tmpdir.addDirectory("31003")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            arbiter: true,
            options: {
                bind_ip: "localhost",
                port: 31004,
                dbpath: (await context.tmpdir.addDirectory("31004")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }], {
            replSet: "rs"
        });

        await context.server.purge();
        await context.server.start();
    });

    beforeEach("create DB instance", () => {
        context.DB = new mongo.Db("tests", new mongo.ReplSet([
            new mongo.Server("localhost", 31000, {
                poolSize: 1,
                autoReconnect: false
            })
        ], {
            poolSize: 1,
            autoReconnect: false,
            rs_name: "rs"
        }), {
            w: 1
        });
    });

    after("stop mongod", async function () {
        this.timeout(120000);
        if (context.server) {
            await context.server.stop();
        }
    });
};
