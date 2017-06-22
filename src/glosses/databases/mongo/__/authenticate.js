const { is, database: { mongo } } = adone;
const { MongoError, __: { utils: { shallowClone, handleCallback } } } = mongo;

const _authenticate = (self, username, password, options, callback) => {
    // Did the user destroy the topology
    if (self.serverConfig && self.serverConfig.isDestroyed()) {
        return callback(new MongoError("topology was destroyed"));
    }

    // the default db to authenticate against is 'self'
    // if authententicate is called from a retry context, it may be another one, like admin
    let authdb = options.dbName ? options.dbName : self.databaseName;
    authdb = self.authSource ? self.authSource : authdb;
    authdb = options.authdb ? options.authdb : authdb;
    authdb = options.authSource ? options.authSource : authdb;

    // Callback
    const _callback = (err, result) => {
        if (self.listeners("authenticated").length > 0) {
            self.emit("authenticated", err, result);
        }

        // Return to caller
        handleCallback(callback, err, result);
    };

    // authMechanism
    let authMechanism = options.authMechanism || "";
    authMechanism = authMechanism.toUpperCase();

    // If classic auth delegate to auth command
    if (authMechanism === "MONGODB-CR") {
        self.s.topology.auth("mongocr", authdb, username, password, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            _callback(null, true);
        });
    } else if (authMechanism === "PLAIN") {
        self.s.topology.auth("plain", authdb, username, password, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            _callback(null, true);
        });
    } else if (authMechanism === "MONGODB-X509") {
        self.s.topology.auth("x509", authdb, username, password, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            _callback(null, true);
        });
    } else if (authMechanism === "SCRAM-SHA-1") {
        self.s.topology.auth("scram-sha-1", authdb, username, password, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            _callback(null, true);
        });
    } else if (authMechanism === "GSSAPI") {
        if (process.platform === "win32") {
            self.s.topology.auth("sspi", authdb, username, password, options, (err) => {
                if (err) {
                    return handleCallback(callback, err, false);
                }
                _callback(null, true);
            });
        } else {
            self.s.topology.auth("gssapi", authdb, username, password, options, (err) => {
                if (err) {
                    return handleCallback(callback, err, false);
                }
                _callback(null, true);
            });
        }
    } else if (authMechanism === "DEFAULT") {
        self.s.topology.auth("default", authdb, username, password, (err) => {
            if (err) {
                return handleCallback(callback, err, false);
            }
            _callback(null, true);
        });
    } else {
        handleCallback(callback, MongoError.create({
            message: `authentication mechanism ${options.authMechanism} not supported`,
            driver: true
        }));
    }
};

export default function authenticate(self, username, password, options, callback) {
    if (is.function(options)) {
        callback = options, options = {};
    }
    // Shallow copy the options
    options = shallowClone(options);

    // Set default mechanism
    if (!options.authMechanism) {
        options.authMechanism = "DEFAULT";
    } else if (
        options.authMechanism !== "GSSAPI" &&
        options.authMechanism !== "DEFAULT" &&
        options.authMechanism !== "MONGODB-CR" &&
        options.authMechanism !== "MONGODB-X509" &&
        options.authMechanism !== "SCRAM-SHA-1" &&
        options.authMechanism !== "PLAIN"
    ) {
        return handleCallback(callback, MongoError.create({
            message: "only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism",
            driver: true
        }));
    }

    // If we have a callback fallback
    if (is.function(callback)) {
        return _authenticate(self, username, password, options, (err, r) => {
            // Support failed auth method
            if (err && err.message && err.message.includes("saslStart")) {
                err.code = 59;
            }
            // Reject error
            if (err) {
                return callback(err, r);
            }
            callback(null, r);
        });
    }

    // Return a promise
    return new self.s.promiseLibrary((resolve, reject) => {
        _authenticate(self, username, password, options, (err, r) => {
            // Support failed auth method
            if (err && err.message && err.message.includes("saslStart")) {
                err.code = 59;
            }
            // Reject error
            if (err) {
                return reject(err);
            }
            resolve(r);
        });
    });
}
