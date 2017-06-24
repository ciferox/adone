import Dispatcher from "./dispatcher";

describe("databases", "mongo", function () {
    const { x, database: { mongo } } = adone;

    this.timeout(300000);

    this.tmpdir = null;
    this.dispatcher = null;
    this.db = null;
    this.DB = null;
    this.database = "tests";
    this.host = null;
    this.port = null;
    this.server = null;

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

    // before("mondodb check", async () => {
    //     // const version = await this.dispatcher.getVersion();
    //     // adone.info(`Running tests against MongoDB version ${version}`);
    // });

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

                ({
                    host: this.host,
                    port: this.port,
                    server: this.server,
                    url: this.url
                } = await this.dispatcher.getSingleServer());

                this.DB = new mongo.__.Db(this.database, new mongo.__.Server("localhost", 27017, {
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

                ({
                    host: this.host,
                    port: this.port,
                    server: this.server,
                    url: this.url
                } = await this.dispatcher.getShardedServer());

                this.DB = new mongo.__.Db(this.database, new mongo.__.Mongos([
                    new mongo.__.Server("localhost", 51000, {
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

                ({
                    host: this.host,
                    port: this.port,
                    server: this.server,
                    url: this.url
                } = await this.dispatcher.getReplicasetServer());

                this.DB = new mongo.__.Db(this.database, new mongo.__.ReplSet([
                    new mongo.__.Server("localhost", 31000, {
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

                ({
                    host: this.host,
                    port: this.port,
                    server: this.server,
                    url: this.url
                } = await this.dispatcher.getAuthServer());

                this.DB = new mongo.__.Db(this.database, new mongo.__.Server(this.host, this.port, {
                    poolSize: 1,
                    autoReconnect: false
                }), {
                    w: 1
                });
                this.topology = "single";
            });
            initConnection();
        },
        ssl: async () => {
            beforeEach("create ssl db instance", async function () {
                this.timeout(120000);

                ({
                    host: this.host,
                    port: this.port,
                    server: this.server,
                    url: this.url
                } = await this.dispatcher.getSSLServer());

                // this.DB = new mongo.Db(this.database, new mongo.Server(this.host, this.port, {
                //     poolSize: 1,
                //     autoReconnect: false,
                //     ssl: true,
                //     sslValidate: false
                // }), {
                //     w: 1
                // });
                this.DB = null;
                this.topology = "ssl";
            });
            // initConnection();
        }
    };

    describe("core", () => {

    });

    describe("driver", () => {
        for (const topology of [
            "single",
            // "sharded",
            // "replicaset",
            // "auth",
            // "ssl"
        ]) {
            this.topology = topology;

            describe(topology, () => {

                this.init[topology]();

                if (topology !== "auth" && topology !== "ssl") {
                    include("./crud_api");
                    include("./crud");
                    include("./cursor");
                    include("./aggregation");
                    include("./apm");
                    include("./buffering_proxy");
                    include("./bulk");
                    include("./collations");
                    include("./collection");
                    include("./command_write_concern");
                    include("./connection_string");
                    include("./connection");
                    include("./cursor_stream");
                    include("./custom_pk");
                    include("./db");
                    include("./decimal128");
                    include("./disconnect_handler");
                    include("./document_validation");
                    include("./error");
                    include("./examples");
                    include("./find_and_modify");
                    include("./find");
                    include("./gridfs_stream");
                    include("./gridfs");
                    include("./ignore_undefined");
                    include("./index");
                    include("./insert");
                    include("./mapreduce");
                    include("./max_staleness");
                    include("./maxtimems");
                    include("./mongo_client_options");
                    include("./mongo_client");
                    include("./multiple_db");
                    include("./object_id");
                    include("./promote_buffers");
                    include("./promote_values");
                    include("./raw");
                    include("./read_concern");
                    include("./read_preference");
                    include("./reconnect");
                    include("./remove");
                    include("./replset_operations");
                    include("./replset_failover");
                    include("./sdam");
                    include("./unicode");
                    include("./uri");
                    include("./url_parser");
                    include("./view");
                    include("./sharding_connection");
                    include("./sharding_failover");
                    include("./sharding_read_preference");
                    include("./replset_connection");
                    include("./replset_read_preference");
                }

                include("./authentication");
                include("./scram");
                if (this.topology === "ssl") {
                    include("./ssl_client");
                    include("./ssl_validation");
                    include("./ssl_x509");
                }
            });
        }
    });
});
