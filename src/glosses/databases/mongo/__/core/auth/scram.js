const {
    is,
    std: { crypto },
    data: {
        bson: { Binary }
    },
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

const parsePayload = (payload) => {
    const dict = {};
    const parts = payload.split(",");

    for (const part of parts) {
        const valueParts = part.split("=");
        dict[valueParts[0]] = valueParts[1];
    }

    return dict;
};

const passwordDigest = (username, password) => {
    if (!is.string(username)) {
        throw new MongoError("username must be a string");
    }
    if (!is.string(password)) {
        throw new MongoError("password must be a string");
    }
    if (password.length === 0) {
        throw new MongoError("password cannot be empty");
    }
    // Use node md5 generator
    const md5 = crypto.createHash("md5");
    // Generate keys used for authentication
    md5.update(`${username}:mongo:${password}`, "utf8");
    return md5.digest("hex");
};

const xor = (a, b) => {
    if (!is.buffer(a)) {
        a = Buffer.from(a);
    }
    if (!is.buffer(b)) {
        b = Buffer.from(b);
    }
    const res = [];
    if (a.length > b.length) {
        for (let i = 0; i < b.length; i++) {
            res.push(a[i] ^ b[i]);
        }
    } else {
        for (let i = 0; i < a.length; i++) {
            res.push(a[i] ^ b[i]);
        }
    }
    return Buffer.from(res);
};

let _hiCache = {};
let _hiCacheCount = 0;
const _hiCachePurge = function () {
    _hiCache = {};
    _hiCacheCount = 0;
};

const hi = function (data, salt, iterations) {
    // omit the work if already generated
    const key = [data, salt.toString("base64"), iterations].join("_");
    if (!is.undefined(_hiCache[key])) {
        return _hiCache[key];
    }

    // generate the salt
    const saltedData = crypto.pbkdf2Sync(data, salt, iterations, 20, "sha1");

    // cache a copy to speed up the next lookup, but prevent unbounded cache growth
    if (_hiCacheCount >= 200) {
        _hiCachePurge();
    }

    _hiCache[key] = saltedData;
    _hiCacheCount += 1;
    return saltedData;
};

let id = 0;

export default class ScramSHA1 extends Schema {
    constructor(bson) {
        super(bson);
        this.id = id++;
    }

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
        const executeScram = (connection) => {
            // Clean up the user
            username = username.replace("=", "=3D").replace(",", "=2C");

            // Create a random nonce
            const nonce = crypto.randomBytes(24).toString("base64");
            // var nonce = 'MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc'
            const firstBare = `n=${username},r=${nonce}`;

            // Build command structure
            const cmd = {
                saslStart: 1,
                mechanism: "SCRAM-SHA-1",
                payload: new Binary(`n,,${firstBare}`),
                autoAuthorize: 1
            };

            // Handle the error
            const handleError = (err, r) => {
                if (err) {
                    numberOfValidConnections = numberOfValidConnections - 1;
                    errorObject = err;
                    return false;
                } else if (r.result.$err) {
                    errorObject = r.result;
                    return false;
                } else if (r.result.errmsg) {
                    errorObject = r.result;
                    return false;
                }
                numberOfValidConnections = numberOfValidConnections + 1;


                return true;
            };

            // Finish up
            const finish = (_count, _numberOfValidConnections) => {
                if (_count === 0 && _numberOfValidConnections > 0) {
                    // Store the auth details
                    Session.add(this.authStore, new Session(db, username, password));
                    // Return correct authentication
                    return callback(null, true);
                } else if (_count === 0) {
                    if (is.nil(errorObject)) {
                        errorObject = new MongoError("failed to authenticate using scram");
                    }
                    return callback(errorObject, false);
                }
            };

            const handleEnd = function (_err, _r) {
                // Handle any error
                handleError(_err, _r);
                // Adjust the number of connections
                count = count - 1;
                // Execute the finish
                finish(count, numberOfValidConnections);
            };

            // Write the commmand on the connection
            server(connection, new Query(this.bson, `${db}.$cmd`, cmd, {
                numberToSkip: 0, numberToReturn: 1
            }), (err, r) => {
                // Do we have an error, handle it
                if (handleError(err, r) === false) {
                    count = count - 1;

                    if (count === 0 && numberOfValidConnections > 0) {
                        // Store the auth details
                        Session.add(this.authStore, new Session(db, username, password));
                        // Return correct authentication
                        return callback(null, true);
                    } else if (count === 0) {
                        if (is.nil(errorObject)) {
                            errorObject = new MongoError("failed to authenticate using scram");
                        }
                        return callback(errorObject, false);
                    }

                    return;
                }

                // Get the dictionary
                const dict = parsePayload(r.result.payload.value());

                // Unpack dictionary
                const iterations = parseInt(dict.i, 10);
                const salt = dict.s;
                const rnonce = dict.r;

                // Set up start of proof
                const withoutProof = `c=biws,r=${rnonce}`;
                const passwordDig = passwordDigest(username, password);
                const saltedPassword = hi(passwordDig
                    , Buffer.from(salt, "base64")
                    , iterations);

                // Create the client key
                let hmac = crypto.createHmac("sha1", saltedPassword);
                hmac.update(Buffer.from("Client Key"));
                const clientKey = Buffer.from(hmac.digest("base64"), "base64");

                // Create the stored key
                const hash = crypto.createHash("sha1");
                hash.update(clientKey);
                const storedKey = Buffer.from(hash.digest("base64"), "base64");

                // Create the authentication message
                const authMsg = [firstBare, r.result.payload.value().toString("base64"), withoutProof].join(",");

                // Create client signature
                hmac = crypto.createHmac("sha1", storedKey);
                hmac.update(Buffer.from(authMsg));
                const clientSig = Buffer.from(hmac.digest("base64"), "base64");

                // Create client proof
                const clientProof = `p=${Buffer.from(xor(clientKey, clientSig)).toString("base64")}`;

                // Create client final
                const clientFinal = [withoutProof, clientProof].join(",");

                // Create continue message
                const cmd = {
                    saslContinue: 1,
                    conversationId: r.result.conversationId,
                    payload: new Binary(Buffer.from(clientFinal))
                };

                //
                // Execute sasl continue
                // Write the commmand on the connection
                server(connection, new Query(this.bson, `${db}.$cmd`, cmd, {
                    numberToSkip: 0,
                    numberToReturn: 1
                }), (err, r) => {
                    if (r && r.result.done === false) {
                        const cmd = {
                            saslContinue: 1,
                            conversationId: r.result.conversationId,
                            payload: Buffer.alloc(0)
                        };

                        // Write the commmand on the connection
                        server(connection, new Query(this.bson, `${db}.$cmd`, cmd, {
                            numberToSkip: 0,
                            numberToReturn: 1
                        }), (err, r) => {
                            handleEnd(err, r);
                        });
                    } else {
                        handleEnd(err, r);
                    }
                });
            });
        };

        const _execute = function (_connection) {
            process.nextTick(() => {
                executeScram(_connection);
            });
        };

        // For each connection we need to authenticate
        while (connections.length > 0) {
            _execute(connections.shift());
        }
    }
}
