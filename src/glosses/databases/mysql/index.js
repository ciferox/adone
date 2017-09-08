const { lazify } = adone;

const mysql = lazify({
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

adone.lazifyPrivate({
    command: "./__/commands",
    packet: "./__/packets",
    ConnectionConfig: "./__/connection_config",
    PacketParser: "./__/packet_parser",
    auth: "./__/auth",
    PoolConfig: "./__/pool_config",
    PoolConnection: "./__/pool_connection",
    PromisePool: "./__/promise_pool",
    PromiseConnection: "./__/promise_connection",
    compileBinaryParser: "./__/compile_binary_parser",
    compileTextParser: "./__/compile_text_parser",
    stringParser: "./__/string_parser",
    helper: "./__/helpers",
    namedPlaceholders: "./__/named_placeholders"
}, exports, require);

const __ = adone.private(mysql);

export const createConnection = (config = {}) => {
    const connection = new mysql.Connection({
        config: new __.ConnectionConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return connection;
    }
    return new Promise((resolve, reject) => {
        connection.once("connect", (connectParams) => {
            resolve(new __.PromiseConnection(connection, connectParams));
        });
        connection.once("error", reject);
    });
};

export const createPool = (config) => {
    const pool = new mysql.Pool({
        config: new __.PoolConfig(config)
    });
    const { promise = true } = config;
    if (!promise) {
        return pool;
    }
    return new __.PromisePool(pool);
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
