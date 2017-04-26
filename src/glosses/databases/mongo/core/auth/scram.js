const {
    is,
    std: { crypto },
    data: { bson: { Binary } },
    database: { mongo: { core: { Query, MongoError, auth: { Session, Schema } } } }
} = adone;

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

// Create a final digest
const hi = (data, salt, iterations) => {
    // Create digest
    const digest = (msg) => {
        const hmac = crypto.createHmac("sha1", data);
        hmac.update(msg);
        return Buffer.from(hmac.digest("base64"), "base64");
    };

    // Create variables
    salt = Buffer.concat([salt, Buffer.from("\x00\x00\x00\x01")]);
    let ui = digest(salt);
    let u1 = ui;

    for (let i = 0; i < iterations - 1; i++) {
        u1 = digest(u1);
        ui = xor(ui, u1);
    }

    return ui;
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

                // Generate server key
                hmac = crypto.createHmac("sha1", saltedPassword);
                hmac.update(Buffer.from("Server Key"));
                const serverKey = Buffer.from(hmac.digest("base64"), "base64");

                // Generate server signature
                hmac = crypto.createHmac("sha1", serverKey);
                hmac.update(Buffer.from(authMsg));

                //
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
