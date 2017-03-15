const { lazify } = adone;

const mysql = lazify({
    c: "./constants",
    command: "./commands",
    packet: "./packets",
    Connection: "./connection",
    ConnectionConfig: "./connection_config",
    PacketParser: "./packet_parser",
    auth: "./auth",
    PoolConnection: "./pool_connection",
    PoolConfig: "./pool_config",
    Pool: "./pool",
    PoolCluster: "./pool_cluster",
    PromiseConnection: "./promise_connection",
    compileBinaryParser: "./compile_binary_parser",
    compileTextParser: "./compile_text_parser",
    stringParser: "./string_parser",
    helper: "./helpers",
    namedPlaceholders: "./named_placeholders",
    enableCompression: "./compressed_protocol",
    Server: "./server"
}, exports, require);

export const createConnection = (config = {}) => {
    const connection = new mysql.Connection({
        config: new mysql.ConnectionConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return connection;
    }
    return new Promise((resolve, reject) => {
        connection.once("connect", (connectParams) => {
            resolve(new mysql.PromiseConnection(connection, connectParams));
        });
        connection.once("error", reject);
    });
};

const getPromisePool = (pool) => ({
    pool,
    getConnection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, coreConnection) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(new mysql.PromiseConnection(coreConnection));
                }
            });
        });
    },

    query(sql, args) {
        return new Promise((resolve, reject) => {
            const done = (err, rows, columns) => {
                if (err) {
                    reject(err);
                } else {
                    resolve([rows, columns]);
                }
            };
            if (args) {
                this.pool.query(sql, args, done);
            } else {
                this.pool.query(sql, done);
            }
        });
    },

    execute(sql, values) {
        return new Promise((resolve, reject) => {
            const done = (err, rows, columns) => {
                if (err) {
                    reject(err);
                } else {
                    resolve([rows, columns]);
                }
            };
            this.pool.execute(sql, values, done);
        });
    },

    end() {
        return new Promise((resolve, reject) => {
            this.pool.end((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },
    get config() {
        return this.pool.config;
    }
});

export const createPool = (config) => {
    const pool = new mysql.Pool({
        config: new mysql.PoolConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return pool;
    }
    return getPromisePool(pool);
};

export const createPoolCluster = (config) => {
    // todo: promise
    return new mysql.PoolCluster(config);
};

export const createServer = (handler) => {
    const s = new mysql.Server();
    if (handler) {
        s.on("connection", handler);
    }
    return s;
};
