import { 
    Server as ServerManager,
    ReplSet as ReplSetManager
} from "mongodb-topology-manager";
import { Sharded as ShardingManager } from "./test_topologies";

import mongo from "adone/glosses/databases/mongo/core";

export default {
    skipStart: false,
    skipStop: false,
    useAuth: false,
    useReplicaSet: false,
    useSharding: false,
    manager: null,
    root: null,
    async setup() {
        this.root = await adone.fs.Directory.createTmp();
    },
    async teardown() {
        await this.root.unlink();
    },
    async start() {
        if (this.skipStart) return;
        if (this.useReplicaSet) {
            this.port = 31000;
            this.topology = () => {
                return new mongo.ReplSet([{
                    host: "localhost", port: 31000
                }], { setName: "rs" });
            };
            this.manager = new ReplSetManager("mongod", [{
                tags: { loc: "ny" },
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31000,
                    dbpath: this.root.getVirtualDirectory("db", "31000").path()
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31001,
                    dbpath: this.root.getVirtualDirectory("db", "31001").path()
                }
            }, {
                tags: { loc: "sf" },
                priority: 0,
                options: {
                    bind_ip: "localhost",
                    port: 31002,
                    dbpath: this.root.getVirtualDirectory("db", "31002").path()
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31003,
                    dbpath: this.root.getVirtualDirectory("db", "31003").path()
                }
            }, {
                arbiter: true,
                options: {
                    bind_ip: "localhost",
                    port: 31004,
                    dbpath: this.root.getVirtualDirectory("db", "31004").path()
                }
            }], { replSet: "rs" });
        } else if (this.useSharding) {
            this.port = 51000;
            this.topology = () => {
                return new mongo.Mongos([{
                    host: "localhost",
                    port: 51000
                }]);
            };
            this.manager = new ShardingManager(this);
        } else {  // single
            this.port = 27017;
            this.topology = () => {
                return new mongo.Server({ host: this.host, port: this.port });
            };
            if (this.useAuth) {
                const manager = this.manager = new ServerManager("mongod", {
                    dbpath: this.root.getVirtualDirectory("db", "data-27017").path()
                });
                await manager.purge();
                await manager.start();
                const server = this.topology();
                await new Promise((resolve) => {
                    server.once("connect", resolve);
                    server.connect();
                });
                await adone.promise.promisify(server.command).call(server, "admin.$cmd", {
                    createUser: "root",
                    pwd: "root",
                    roles: [{ role: "root", db: "admin" }],
                    digestPassword: true
                });
                server.destroy();
                await manager.stop();
            }

            const opts = { 
                dbpath: this.root.getVirtualDirectory("db", "data-27017").path()
            };
            if (this.useAuth) {
                opts.auth = null;
            }
            this.manager = new ServerManager("mongod", opts);
        }
        if (!this.useAuth) {
            // Purge the database
            await this.manager.purge();
        }
        // console.log("[purge the directories]");
        await this.manager.start();
        // console.log("[started the topology]");
        const server = this.topology();
        // console.log("[get connection to topology]");
        await new Promise((resolve) => {
            server.once("connect", resolve);
            if (this.useAuth) {
                server.connect({ auth: ["scram-sha-1", "admin", "root", "root"] });
            } else {
                server.connect();
            }
        });
        // console.log("[connected to topology]");
        // Drop the database
        await new Promise((resolve, reject) => {
            server.command(`${this.db}.$cmd`, { dropDatabase: 1 }, function (err) {
                if (err) {
                    return reject(err);
                }
                // console.log("[dropped database]");
                server.destroy();
                resolve();
            });
        });
    },

    stop() {
        if (this.skipStop) return;
        // Stop the servers
        return this.manager.stop();
    },

    async restart(options = { purge: true, kill: true }) {
        if (this.skipStop) return;
        // Stop the servers
        await this.manager.restart(options);
    },

    newTopology() {
        return this.topology();
    },

    newConnection(options, callback) {
        if (typeof options == "function") {
            callback = options;
            options = {};
        }

        const server = this.topology(this, mongo);
        // Set up connect
        server.once("connect", function () {
            callback(null, server);
        });

        // Connect
        server.connect();
    },

    // Additional parameters needed
    require: mongo,
    port: 27017,
    host: "localhost",
    setName: "rs",
    db: "integration_tests",
    writeConcern: () => ({ w: 1 })
};