import mongodbVersionManager from "mongodb-version-manager";
import mongodbTopologyManager from "mongodb-topology-manager";

export default class Dispatcher {
    constructor(tmpdir) {
        this.tmpdir = tmpdir;
        this._replicaset = null;
        this._single = null;
        this._sharded = null;
    }

    async getVersion() {
        return adone.promise.promisify(mongodbVersionManager.current)();
    }

    async getSingleServer() {
        if (!this._single) {
            this._single = new mongodbTopologyManager.Server("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27017")).path(),
                setParameter: ["enableTestCommands=1"]
            });
            await this._single.purge();
            await this._single.start();
        }
        return ["localhost", 27017];
    }

    async getReplicasetServer() {
        if (!this._replicaset) {
            this._replicaset = new mongodbTopologyManager.ReplSet("mongod", [{
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

            await this._replicaset.purge();
            await this._replicaset.start();
        }
        return ["localhost", 31000];
    }

    async getShardedServer() {
        if (!this._sharded) {
            this._sharded = new mongodbTopologyManager.Sharded({
                mongod: "mongod",
                mongos: "mongos"
            });
            await this._sharded.addShard([{
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

            await this._sharded.addShard([{
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

            await this._sharded.addConfigurationServers([{
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

            await this._sharded.addProxies([{
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

            await this._sharded.purge();
            await this._sharded.start();
        }
        return ["localhost", 51000];
    }

    async destroy() {
        await Promise.all([
            this._replicaset && this._replicaset.stop(),
            this._single && this._single.stop(),
            this._sharded && this._sharded.stop()
        ]);
    }
}
