const {
    is,
    std: { crypto },
    database: { mongo }
} = adone;
const {
    core: {
        Query,
        MongoError,
        auth: {
            Session,
            Schema
        }
    }
} = adone.private(mongo);

export default class MongoCR extends Schema {
    auth(server, connections, db, username, password, callback) {
        // Total connections
        let count = connections.length;
        if (count === 0) {
            return callback(null, null);
        }

        // Valid connections
        let numberOfValidConnections = 0;
        let errorObject = null;

        // Execute MongoCR
        const executeMongoCR = (connection) => {
            // Write the commmand on the connection
            server(connection, new Query(this.bson, `${db}.$cmd`, {
                getnonce: 1
            }, {
                numberToSkip: 0, numberToReturn: 1
            }), (err, r) => {
                let nonce = null;
                let key = null;

                if (is.nil(err)) {
                    nonce = r.result.nonce;
                    let md5 = crypto.createHash("md5");
                    md5.update(`${username}:mongo:${password}`, "utf8");
                    const hash = md5.digest("hex");
                    md5 = crypto.createHash("md5");
                    md5.update(nonce + username + hash, "utf8");
                    key = md5.digest("hex");
                }

                server(connection, new Query(this.bson, `${db}.$cmd`, {
                    authenticate: 1,
                    user: username,
                    nonce,
                    key
                }, {
                    numberToSkip: 0, numberToReturn: 1
                }), (err, r) => {
                    count = count - 1;

                    if (err) {
                        errorObject = err;
                    } else if (r.result.$err) {
                        errorObject = r.result;
                    } else if (r.result.errmsg) {
                        errorObject = r.result;
                    } else {
                        numberOfValidConnections = numberOfValidConnections + 1;
                    }

                    if (count === 0 && numberOfValidConnections > 0) {
                        Session.add(this.authStore, new Session(db, username, password));
                        callback(null, true);
                    } else if (count === 0) {
                        if (is.nil(errorObject)) {
                            errorObject = new MongoError("failed to authenticate using mongocr");
                        }
                        callback(errorObject, false);
                    }
                });
            });
        };

        const _execute = (_connection) => {
            process.nextTick(() => {
                executeMongoCR(_connection);
            });
        };

        // For each connection we need to authenticate
        while (connections.length > 0) {
            _execute(connections.shift());
        }
    }
}
