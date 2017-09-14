const {
    is,
    database: { mongo }
} = adone;
const { MongoError } = mongo;
const {
    utils: { shallowClone }
} = adone.private(mongo);

export default async function authenticate(self, username, password, options = {}) {
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
        throw MongoError.create({
            message: "only DEFAULT, GSSAPI, PLAIN, MONGODB-X509, SCRAM-SHA-1 or MONGODB-CR is supported by authMechanism",
            driver: true
        });
    }

    // Did the user destroy the topology
    if (self.serverConfig && self.serverConfig.isDestroyed()) {
        return new MongoError("topology was destroyed");
    }

    // the default db to authenticate against is 'self'
    // if authententicate is called from a retry context, it may be another one, like admin
    let authdb = options.dbName ? options.dbName : self.databaseName;
    authdb = self.authSource ? self.authSource : authdb;
    authdb = options.authdb ? options.authdb : authdb;
    authdb = options.authSource ? options.authSource : authdb;

    // authMechanism
    let authMechanism = options.authMechanism || "";
    authMechanism = authMechanism.toUpperCase();
    let p;
    // If classic auth delegate to auth command
    if (authMechanism === "MONGODB-CR") {
        p = self.s.topology.auth("mongocr", authdb, username, password);
    } else if (authMechanism === "PLAIN") {
        p = self.s.topology.auth("plain", authdb, username, password);
    } else if (authMechanism === "MONGODB-X509") {
        p = self.s.topology.auth("x509", authdb, username, password);
    } else if (authMechanism === "SCRAM-SHA-1") {
        p = self.s.topology.auth("scram-sha-1", authdb, username, password);
    } else if (authMechanism === "GSSAPI") {
        if (is.windows) {
            p = self.s.topology.auth("sspi", authdb, username, password, options);
        } else {
            p = self.s.topology.auth("gssapi", authdb, username, password, options);
        }
    } else if (authMechanism === "DEFAULT") {
        p = self.s.topology.auth("default", authdb, username, password);
    } else {
        throw MongoError.create({
            message: `authentication mechanism ${options.authMechanism} not supported`,
            driver: true
        });
    }
    let err = null;
    try {
        await p;
    } catch (_err) {
        err = _err;
        if (err.message && err.message.includes("saslStart")) {
            err.code = 59;
        }
    } finally {
        if (self.listeners("authenticated").length > 0) {
            self.emit("authenticated", err, is.null(err));
        }
    }
    if (err) {
        throw err;
    }
    return true;
}
