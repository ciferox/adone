import mongodbTopologyManager from "mongodb-topology-manager";

const { database: { mongo } } = adone;

export const single = () => {
    before("start mongod", async function () {
        this.server = new mongodbTopologyManager.Server("mongod", {
            dbpath: (await this.tmpdir.addDirectory("27017")).path(),
            setParameter: ["enableTestCommands=1"]
        });
        await this.server.purge();
        await this.server.start();
    });

    beforeEach("create DB instance", async function () {
        this.DB = new mongo.Db("tests", new mongo.Server("localhost", 27017, {
            poolSize: 1,
            autoReconnect: false
        }), {
            w: 1
        });
    });

    after("stop mongod", async function () {
        if (this.server) {
            await this.server.stop();
        }
    });
};

export const sharded = () => {
    before("start mongos", async function () {
        this.timeout(120000);

        this.server = new mongodbTopologyManager.Sharded({
            mongod: "mongod",
            mongos: "mongos"
        });
        await this.server.addShard([{
            tags: { loc: "ny" },
            options: {
                bind_ip: "localhost",
                port: 31010,
                dbpath: (await this.tmpdir.addDirectory("31010")).path(),
                shardsvr: null
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31011,
                dbpath: (await this.tmpdir.addDirectory("31011")).path(),
                shardsvr: null
            }
        }, {
            // Type of node
            arbiter: true,
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31012,
                dbpath: (await this.tmpdir.addDirectory("31012")).path(),
                shardsvr: null
            }
        }], {
            replSet: "rs1"
        });

        await this.server.addShard([{
            tags: { loc: "ny" },
            options: {
                bind_ip: "localhost",
                port: 31020,
                dbpath: (await this.tmpdir.addDirectory("31020")).path(),
                shardsvr: null
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31021,
                dbpath: (await this.tmpdir.addDirectory("31021")).path(),
                shardsvr: null
            }
        }, {
            // Type of node
            arbiter: true,
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31022,
                dbpath: (await this.tmpdir.addDirectory("31022")).path(),
                shardsvr: null
            }
        }], {
            replSet: "rs2"
        });

        await this.server.addConfigurationServers([{
            options: {
                bind_ip: "localhost",
                port: 35000,
                dbpath: (await this.tmpdir.addDirectory("35000")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 35001,
                dbpath: (await this.tmpdir.addDirectory("35001")).path()
            }
        }, {
            options: {
                bind_ip: "localhost",
                port: 35002,
                dbpath: (await this.tmpdir.addDirectory("35002")).path()
            }
        }], {
            replSet: "rs3"
        });

        await this.server.addProxies([{
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

        await this.server.purge();
        await this.server.start();
    });

    beforeEach("create DB instance", function () {
        this.DB = new mongo.Db("tests", new mongo.Mongos([
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
        if (this.server) {
            await this.server.stop();
        }
    });
};

export const replicaset = () => {
    before("start mongod", async function () {
        this.timeout(120000);
        this.server = new mongodbTopologyManager.ReplSet("mongod", [{
            tags: { loc: "ny" },
            // mongod process options
            options: {
                bind_ip: "localhost",
                port: 31000,
                dbpath: (await this.tmpdir.addDirectory("31000")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31001,
                dbpath: (await this.tmpdir.addDirectory("31001")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            options: {
                bind_ip: "localhost",
                port: 31002,
                dbpath: (await this.tmpdir.addDirectory("31002")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            tags: { loc: "sf" },
            priority: 0,
            options: {
                bind_ip: "localhost",
                port: 31003,
                dbpath: (await this.tmpdir.addDirectory("31003")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }, {
            arbiter: true,
            options: {
                bind_ip: "localhost",
                port: 31004,
                dbpath: (await this.tmpdir.addDirectory("31004")).path(),
                setParameter: ["enableTestCommands=1"]
            }
        }], {
            replSet: "rs"
        });

        await this.server.purge();
        await this.server.start();
    });

    beforeEach("create DB instance", function () {
        this.DB = new mongo.Db("tests", new mongo.ReplSet([
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
        if (this.server) {
            await this.server.stop();
        }
    });
};
