export const executeCommand = (configuration, db, cmd, options) => {
    // Set the default options object if none passed in
    options = options || {};

    // Alternative options
    const host = options.host || configuration.host;
    const port = options.port || configuration.port;

    return new Promise((resolve, reject) => {
        const { Pool, Query } = adone.database.mongo.core;

        // Attempt to connect
        const pool = new Pool({
            host, port, bson: new adone.data.bson.BSON()
        });

        // Add event listeners
        pool.on("connect", (_pool) => {
            const query = new Query(new adone.data.bson.BSON(), `${db}.$cmd`, cmd, { numberToSkip: 0, numberToReturn: 1 });
            _pool.write(query, {
                command: true
            }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                }
                // Close the pool
                _pool.destroy();
                // If we have an error return
                if (err) {
                    return reject(err);
                }
                // Return the result
                resolve(result.result);
            });
        });
        pool.connect.apply(pool, options.auth);
    });
};

export const locateAuthMethod = (configuration) => {
    return new Promise((resolve, reject) => {
        const { Pool, Query } = adone.database.mongo.core;

        // Set up operations
        const db = "admin";
        const cmd = { ismaster: true };

        // Attempt to connect
        // console.log("connecting to", configuration.host, configuration.port);
        const pool = new Pool({
            host: configuration.host, port: configuration.port, bson: new adone.data.bson.BSON()
        });
        // Add event listeners
        pool.on("connect", (_pool) => {
            // console.log("connected");
            const query = new Query(new adone.data.bson.BSON(), `${db}.$cmd`, cmd, { numberToSkip: 0, numberToReturn: 1 });
            _pool.write(query, {
                command: true
            }, (err, result) => {
                if (err) {
                    console.log(err.stack);
                }
                // Close the pool
                _pool.destroy();
                // If we have an error return
                if (err) {
                    return reject(err);
                }

                // Establish the type of auth method
                if (!result.result.maxWireVersion || result.result.maxWireVersion == 2) {
                    resolve("mongocr");
                } else {
                    resolve("scram-sha-1");
                }
            });
        }).on("error", reject);

        pool.connect.apply(pool);
    });
};
