import mongodbVersionManager from "mongodb-version-manager";
import mongodbTopologyManager from "mongodb-topology-manager";

const url = ({ username, password, host, port, database, search }) => {
    return adone.std.url.format({
        protocol: "mongodb:",
        slashes: true,
        username,
        password,
        hostname: host,
        port,
        pathname: `/${database}`,
        search: new adone.std.url.URLSearchParams(search).toString()
    });
};

export default class Dispatcher {
    constructor(tmpdir) {
        this.tmpdir = tmpdir;
        this._replicaset = null;
        this._single = null;
        this._sharded = null;
        this._auth = null;
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
        return {
            host: "localhost",
            port: 27017,
            server: this._single,
            url: (opts) => url(Object.assign({
                host: "localhost",
                port: 27017,
                database: "tests"
            }, opts))
        };
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
        return {
            host: "localhost",
            port: 31000,
            server: this._replicaset,
            url: (opts) => url(Object.assign({
                host: "localhost",
                port: 31000,
                database: "tests",

            }, opts))
        };
    }

    async getAuthServer() {
        if (!this._auth) {
            this._auth = new mongodbTopologyManager.Server("mongod", {
                dbpath: (await this.tmpdir.addDirectory("27018")).path(),
                setParameter: ["enableTestCommands=1"],
                auth: null,
                port: 27018
            });
            await this._auth.purge();
            await this._auth.start();
        }
        return {
            host: "localhost",
            port: 27018,
            server: this._auth,
            url: (opts) => url(Object.assign({
                host: "localhost",
                port: 27018,
                database: "tests"
            }, opts))
        };
    }

    async getReplicasetAuthServer({ start = true , purge = true } = {}) {
        if (!this._replicasetAuth) {
            const keyFile = adone.std.path.resolve(__dirname, "data", "keyfile.txt");
            this._replicasetAuth = new mongodbTopologyManager.ReplSet("mongod", [{
                tags: { loc: "ny" },
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31010,
                    dbpath: (await this.tmpdir.addDirectory("31010")).path(),
                    setParameter: ["enableTestCommands=1"],
                    keyFile,
                    auth: null,
                    replSet: "rs"
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31011,
                    dbpath: (await this.tmpdir.addDirectory("31011")).path(),
                    setParameter: ["enableTestCommands=1"],
                    keyFile,
                    auth: null,
                    replSet: "rs"
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31012,
                    dbpath: (await this.tmpdir.addDirectory("31012")).path(),
                    setParameter: ["enableTestCommands=1"],
                    keyFile,
                    auth: null,
                    replSet: "rs"
                }
            }], {
                replSet: "rs"
            });
            if (start) {
                if (purge) {
                    await this._replicasetAuth.purge();
                }
                await this._replicasetAuth.start();
            }
        }
        return {
            host: "localhost",
            port: 31010,
            server: this._replicasetAuth.addListener,
            url: (opts) => url(adone.util.assignDeep({
                host: "localhost",
                port: 31010,
                database: "tests",
                search: {
                    rs_name: "rs"
                }
            }, opts))
        };
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
        return {
            host: "localhost",
            port: 51000,
            server: this._sharded,
            url: (opts) => url(Object.assign({
                host: "localhost",
                port: 51000,
                database: "tests"
            }, opts))
        };
    }

    async getShardedAuthServer({ start = true, purge = true } = {}) {
        if (!this._shardedAuth) {
            const keyFile = adone.std.path.resolve(__dirname, "data", "keyfile.txt");
            this._shardedAuth = new mongodbTopologyManager.Sharded({
                mongod: "mongod",
                mongos: "mongos"
            });
            await this._shardedAuth.addShard([{
                tags: { loc: "ny" },
                options: {
                    bind_ip: "localhost",
                    port: 31050,
                    dbpath: (await this.tmpdir.addDirectory("31050")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31051,
                    dbpath: (await this.tmpdir.addDirectory("31051")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }, {
                // Type of node
                arbiter: true,
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31052,
                    dbpath: (await this.tmpdir.addDirectory("31052")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }], {
                replSet: "rs1"
            });

            await this._shardedAuth.addShard([{
                tags: { loc: "ny" },
                options: {
                    bind_ip: "localhost",
                    port: 31060,
                    dbpath: (await this.tmpdir.addDirectory("31060")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }, {
                tags: { loc: "sf" },
                options: {
                    bind_ip: "localhost",
                    port: 31061,
                    dbpath: (await this.tmpdir.addDirectory("31061")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }, {
                // Type of node
                arbiter: true,
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31062,
                    dbpath: (await this.tmpdir.addDirectory("31062")).path(),
                    shardsvr: null,
                    auth: null,
                    keyFile
                }
            }], {
                replSet: "rs2"
            });

            await this._shardedAuth.addConfigurationServers([{
                options: {
                    bind_ip: "localhost",
                    port: 35040,
                    dbpath: (await this.tmpdir.addDirectory("35040")).path(),
                    auth: null,
                    keyFile
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 35041,
                    dbpath: (await this.tmpdir.addDirectory("35041")).path(),
                    auth: null,
                    keyFile
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 35042,
                    dbpath: (await this.tmpdir.addDirectory("35042")).path(),
                    auth: null,
                    keyFile
                }
            }], {
                replSet: "rs3"
            });

            await this._shardedAuth.addProxies([{
                bind_ip: "localhost",
                port: 51010,
                configdb: "localhost:35040,localhost:35041,localhost:35042",
                keyFile
            }, {
                bind_ip: "localhost",
                port: 51011,
                configdb: "localhost:35040,localhost:35041,localhost:35042",
                keyFile
            }], {
                binary: "mongos"
            });

            if (start) {
                if (purge) {
                    await this._shardedAuth.purge();
                }
                await this._shardedAuth.start();
            }
        }
        return {
            host: "localhost",
            port: 51010,
            server: this._shardedAuth,
            url: (opts) => url(Object.assign({
                host: "localhost",
                port: 51010,
                database: "tests"
            }, opts))
        };
    }

    async destroy() {
        await Promise.all([
            this._replicaset && this._replicaset.stop(),
            this._single && this._single.stop(),
            this._sharded && this._sharded.stop(),
            this._auth && this._auth.stop(),
            // this._replicasetAuth && this._replicasetAuth.stop(),
            // this._shardedAuth && this._shardedAuth.stop()
        ]);
    }
}
