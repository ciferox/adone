const { lazify } = adone;

const mysql = lazify({
    __: "./__",
    c: "./constants",
    auth: "./auth",
    Connection: "./connection",
    PromiseConnection: "./promise_connection",
    Pool: "./pool",
    PromisePool: "./promise_pool",
    PoolCluster: "./pool_cluster",
    Server: "./server",
    enableCompression: "./compressed_protocol"
}, exports, require);

export const createConnection = (config = {}) => {
    const connection = new mysql.Connection({
        config: new mysql.__.ConnectionConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return connection;
    }
    return new Promise((resolve, reject) => {
        connection.once("connect", (connectParams) => {
            resolve(new mysql.__.PromiseConnection(connection, connectParams));
        });
        connection.once("error", reject);
    });
};

export const createPool = (config) => {
    const pool = new mysql.Pool({
        config: new mysql.__.PoolConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return pool;
    }
    return new mysql.__.PromisePool(pool);
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
