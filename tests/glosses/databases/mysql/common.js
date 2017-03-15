const { database: { mysql } } = adone;

export const config = {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "root",
    database: process.env.MYSQL_DATABASE || "node_mysql_test",
    compress: process.env.MYSQL_USE_COMPRESSION,
    port: process.env.MYSQL_PORT || 3306
};

export const createConnection = (args = {}) => {
    const params = {
        host: args.host || config.host,
        rowsAsArray: args.rowsAsArray,
        user: (args && args.user) || config.user,
        password: (args && args.password) || config.password,
        database: (args && args.database) || config.database,
        multipleStatements: args ? args.multipleStatements : false,
        port: (args && args.port) || config.port,
        debug: process.env.DEBUG || (args && args.debug),
        supportBigNumbers: args && args.supportBigNumbers,
        bigNumberStrings: args && args.bigNumberStrings,
        compress: (args && args.compress) || config.compress,
        decimalNumbers: args && args.decimalNumbers,
        charset: args && args.charset,
        dateStrings: args && args.dateStrings,
        authSwitchHandler: args && args.authSwitchHandler,
        typeCast: args && args.typeCast,
        promise: args.promise
    };

    return mysql.createConnection(params);
};

export const createPool = (args = {}) => {
    const params = {
        host: args.host || config.host,
        rowsAsArray: args.rowsAsArray,
        user: (args && args.user) || config.user,
        password: (args && args.password) || config.password,
        database: (args && args.database) || config.database,
        multipleStatements: args ? args.multipleStatements : false,
        port: (args && args.port) || config.port,
        debug: process.env.DEBUG || (args && args.debug),
        supportBigNumbers: args && args.supportBigNumbers,
        bigNumberStrings: args && args.bigNumberStrings,
        compress: (args && args.compress) || config.compress,
        decimalNumbers: args && args.decimalNumbers,
        charset: args && args.charset,
        dateStrings: args && args.dateStrings,
        authSwitchHandler: args && args.authSwitchHandler,
        typeCast: args && args.typeCast,
        promise: args.promise
    };

    return mysql.createPool(params);
};


export const createServer = (handler) => {
    const server = mysql.createServer();
    server.on("connection", (conn) => {
        conn.on("error", () => {
            // we are here when client drops connection
        });
        let flags = 0xffffff;
        flags = flags ^ mysql.c.client.COMPRESS;

        conn.serverHandshake({
            protocolVersion: 10,
            serverVersion: "node.js rocks",
            connectionId: 1234,
            statusFlags: 2,
            characterSet: 8,
            capabilityFlags: flags
        });
        if (handler) {
            handler(conn);
        }
    });
    return new Promise((resolve) => {
        server.listen(0, () => resolve(server));
    });
};
