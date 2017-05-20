// MongoDB Topology Manager
import { Sharded as ShardingManager } from "mongodb-topology-manager";


export class Sharded extends ShardingManager {
    constructor(configuration) {
        super({ mongod: "mongod", mongos: "mongos" });
        this.configuration = configuration;
    }

    start() {
        // native async/await ...
        return (async () => {
            // Add one shard
            await this.addShard([{
                options: {
                    bind_ip: "localhost",
                    port: 31000,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31000").path(),
                    shardsvr: null
                }
            }, {
                options: {
                    bind_ip: "localhost",
                    port: 31001,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31001").path(),
                    shardsvr: null
                }
            }, {
                // Type of node
                arbiter: true,
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31002,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31002").path(),
                    shardsvr: null
                }
            }], { replSet: "rs1" });
            // Add one shard
            await this.addShard([{
                options: {
                    bind_ip: "localhost",
                    port: 31010,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31010").path(),
                    shardsvr: null
                }
            }, {
                options: {
                    bind_ip:
                    "localhost",
                    port: 31011,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31011").path(),
                    shardsvr: null
                }
            }, {
                // Type of node
                arbiter: true,
                // mongod process options
                options: {
                    bind_ip: "localhost",
                    port: 31012,
                    dbpath: this.configuration.root.getVirtualDirectory("db", "31012").path(),
                    shardsvr: null
                }
            }], { replSet: "rs2" });
            // Add configuration servers
            await this.addConfigurationServers([{
                options: {
                    bind_ip: "localhost", port: 35000, dbpath: this.configuration.root.getVirtualDirectory("db", "35000").path()
                }
            }, {
                options: {
                    bind_ip: "localhost", port: 35001, dbpath: this.configuration.root.getVirtualDirectory("db", "35001").path()
                }
            }, {
                options: {
                    bind_ip: "localhost", port: 35002, dbpath: this.configuration.root.getVirtualDirectory("db", "35002").path()
                }
            }], { replSet: "rs3" });
            // Add proxies
            await this.addProxies([{
                bind_ip: "localhost",
                port: 51000,
                configdb: "localhost:35000,localhost:35001,localhost:35002"
            }, {
                bind_ip: "localhost",
                port: 51001,
                configdb: "localhost:35000,localhost:35001,localhost:35002"
            }], { binary: "mongos" });
        })().then(() => {
            return super.start();
        });
    }
}
