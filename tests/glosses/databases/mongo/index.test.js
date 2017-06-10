import Dispatcher from "./dispatcher";

describe("databases", "mongo", function () {
    const { x, database: { mongo } } = adone;

    this.tmpdir = null;
    this.dispatcher = null;
    this.db = null;
    this.DB = null;
    this.database = "tests";
    this.host = null;
    this.port = null;

    before("create tmpdir", async () => {
        this.tmpdir = await adone.fs.Directory.createTmp();
    });

    after("unlink tmpdir", async () => {
        if (this.tmpdir) {
            await this.tmpdir.unlink();
        }
    });

    before("create dispatcher", () => {
        this.dispatcher = new Dispatcher(this.tmpdir);
    });

    after("destroy dispatcher", async function () {
        this.timeout(120000);

        await this.dispatcher.destroy();
    });

    before("mondodb check", async () => {
        adone.info(`Running tests against MongoDB version ${await this.dispatcher.getVersion()}`);
    });

    const initConnection = () => {
        beforeEach("open connection", async () => {
            if (!this.DB) {
                throw new x.IllegalState("There is no DB instance");
            }
            this.db = await this.DB.open();
        });

        this.closeDB = async () => {
            if (this.db) {
                const { db } = this;
                this.db = null;
                await db.close();
            }
        };

        afterEach("close connection", async () => {
            await this.closeDB();
        });
    };

    this.init = {
        single: async () => {
            beforeEach("create single db instance", async function () {
                this.timeout(120000);

                [this.host, this.port] = await this.dispatcher.getSingleServer();

                this.DB = new mongo.Db(this.database, new mongo.Server("localhost", 27017, {
                    poolSize: 1,
                    autoReconnect: false
                }), {
                    w: 1
                });
                this.topology = "single";
            });
            initConnection();
        },
        sharded: async () => {
            beforeEach("create sharded db instance", async function () {
                this.timeout(120000);

                [this.host, this.port] = await this.dispatcher.getShardedServer();

                this.DB = new mongo.Db(this.database, new mongo.Mongos([
                    new mongo.Server("localhost", 51000, {
                        poolSize: 1,
                        autoReconnect: false
                    })
                ], {
                    w: "majority",
                    wtimeout: 30000
                }), {
                    w: 1
                });
                this.topology = "sharded";
            });
            initConnection();
        },
        replicaset: async () => {
            beforeEach("create replicaset db instance", async function () {
                this.timeout(120000);

                [this.host, this.port] = await this.dispatcher.getReplicasetServer();

                this.DB = new mongo.Db(this.database, new mongo.ReplSet([
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
                this.topology = "replicaset";
            });
            initConnection();
        }
    };

    describe("core", () => {

    });

    describe("driver", () => {
        for (const topology of [
            "single",
            "sharded",
            "replicaset"
        ]) {
            describe(topology, () => {

                this.init[topology]();

                include("./crud_api");
                include("./crud");
                include("./cursor");
            });
        }
    });
});
