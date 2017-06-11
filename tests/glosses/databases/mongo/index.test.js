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
    this.server = null;

    this.url = ({ username, password, db = this.database } = {}) => {
        let creds = "";
        if (username && password) {
            creds = `${username}:${password}@`;
        }
        return `mongodb://${creds}${this.host}:${this.port}/${db}`;
    };

    this.restart = async (opts) => {
        await this.db.close();
        await this.server.restart(opts);
        this.db = await this.DB.open();
    };

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

                [this.host, this.port, this.server] = await this.dispatcher.getSingleServer();

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

                [this.host, this.port, this.server] = await this.dispatcher.getShardedServer();

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

                [this.host, this.port, this.server] = await this.dispatcher.getReplicasetServer();

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
        },
        auth: async () => {
            beforeEach("create auth db instance", async function () {
                this.timeout(120000);

                [this.host, this.port, this.server] = await this.dispatcher.getAuthServer();

                this.DB = new mongo.Db(this.database, new mongo.Server(this.host, this.port, {
                    poolSize: 1,
                    autoReconnect: false
                }), {
                    w: 1
                });
                this.topology = "single";
            });
            initConnection();
        },
    };

    describe("core", () => {

    });

    describe("driver", () => {
        for (const topology of [
            "single",
            "sharded",
            "replicaset",
            "auth"
        ]) {
            this.topology = topology;

            describe(topology, () => {

                this.init[topology]();

                if (topology !== "auth") {
                    include("./crud_api");
                    include("./crud");
                    include("./cursor");
                    include("./aggregation");
                    include("./apm");
                    include("./buffering_proxy");
                    include("./bulk");
                    include("./collations");
                    include("./collection");
                }

                include("./authentication");
            });
        }
    });
});
