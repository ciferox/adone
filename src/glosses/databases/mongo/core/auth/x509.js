const {
    is,
    database: { mongo: { core: { Query, MongoError, auth: { Session, Schema } } } }
} = adone;

export default class X509 extends Schema {
    auth(server, connections, db, username, password, callback) {
        // Total connections
        let count = connections.length;
        if (count === 0) {
            return callback(null, null);
        }

        // Valid connections
        let numberOfValidConnections = 0;
        let errorObject = null;

        const execute = (connection) => {
            // Let's start the sasl process
            const command = {
                authenticate: 1,
                mechanism: "MONGODB-X509"
            };

            // Add username if specified
            if (username) {
                command.user = username;
            }

            // Let's start the process
            server(connection, new Query(this.bson, "$external.$cmd", command, {
                numberToSkip: 0,
                numberToReturn: 1
            }), (err, r) => {
                // Adjust count
                count = count - 1;

                // If we have an error
                if (err) {
                    errorObject = err;
                } else if (r.result.$err) {
                    errorObject = r.result;
                } else if (r.result.errmsg) {
                    errorObject = r.result;
                } else {
                    numberOfValidConnections = numberOfValidConnections + 1;
                }

                // We have authenticated all connections
                if (count === 0 && numberOfValidConnections > 0) {
                    // Store the auth details
                    Session.add(this.authStore, new Session(db, username, password));
                    // Return correct authentication
                    callback(null, true);
                } else if (count === 0) {
                    if (is.nil(errorObject)) {
                        errorObject = new MongoError("failed to authenticate using mongocr");
                    }
                    callback(errorObject, false);
                }
            });
        };

        const _execute = (_connection) => {
            process.nextTick(() => {
                execute(_connection);
            });
        };

        // For each connection we need to authenticate
        while (connections.length > 0) {
            // Execute MongoCR
            _execute(connections.shift());
        }
    }
}
