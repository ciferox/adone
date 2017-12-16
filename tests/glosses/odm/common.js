/**
 * Module dependencies.
 */

const Server = require("mongodb-topology-manager").Server;
const mongoose = adone.odm;
const Collection = mongoose.Collection;
let queryCount = 0;
let opened = 0;
let closed = 0;
let server;

if (process.env.D === "1") {
    mongoose.set("debug", true);
}

/**
 * Override all Collection related queries to keep count
 */

[
    "createIndex",
    "ensureIndex",
    "findAndModify",
    "findOne",
    "find",
    "insert",
    "save",
    "update",
    "remove",
    "count",
    "distinct",
    "isCapped",
    "options"
].forEach((method) => {
    const oldMethod = Collection.prototype[method];

    Collection.prototype[method] = function () {
        queryCount++;
        return oldMethod.apply(this, arguments);
    };
});

/**
 * Override Collection#onOpen to keep track of connections
 */

const oldOnOpen = Collection.prototype.onOpen;

Collection.prototype.onOpen = function () {
    opened++;
    return oldOnOpen.apply(this, arguments);
};

/**
 * Override Collection#onClose to keep track of disconnections
 */

const oldOnClose = Collection.prototype.onClose;

Collection.prototype.onClose = function () {
    closed++;
    return oldOnClose.apply(this, arguments);
};

/**
 * Create a connection to the test database.
 * You can set the environmental variable MONGOOSE_TEST_URI to override this.
 *
 * @api private
 */

module.exports = function (options) {
    options || (options = {});
    let uri;

    if (options.uri) {
        uri = options.uri;
        delete options.uri;
    } else {
        uri = module.exports.uri;
    }

    const noErrorListener = Boolean(options.noErrorListener);
    delete options.noErrorListener;

    const conn = mongoose.createConnection(uri, options);

    if (noErrorListener) {
        return conn;
    }

    conn.on("error", (err) => {
        assert.ok(err);
    });

    return conn;
};

/*!
 * testing uri
 */

module.exports.uri = process.env.MONGOOSE_TEST_URI || "mongodb://localhost/mongoose_test";

/**
 * expose mongoose
 */

module.exports.mongoose = mongoose;

/**
 * expose mongod version helper
 */

module.exports.mongodVersion = function (cb) {
    const db = module.exports();
    db.on("error", cb);

    db.on("open", () => {
        const admin = db.db.admin();
        adone.promise.nodeify(admin.serverStatus(), (err, info) => {
            if (err) {
                return cb(err);
            }
            const version = info.version.split(".").map((n) => {
                return parseInt(n, 10);
            });
            db.close(() => {
                cb(null, version);
            });
        });
    });
};

const dropDBs = (done) => {
    const db = module.exports({ noErrorListener: true });
    db.once("open", () => {
        // drop the default test database
        db.db.dropDatabase().then(() => {
            const db2 = db.useDb("mongoose-test-2");
            db2.db.dropDatabase().then(() => {
                // drop mongos test db if exists
                const mongos = process.env.MONGOOSE_MULTI_MONGOS_TEST_URI;

                if (!mongos) {
                    return done();
                }


                const db = mongoose.connect(mongos, { mongos: true });
                db.once("open", () => {
                    db.db.dropDatabase(done);
                });
            });
        });
    });
};

before(() => {
    return server.purge();
});

after(function () {
    this.timeout(15000);

    return server.stop();
});

before(function (done) {
    this.timeout(10 * 1000);
    dropDBs(done);
});

module.exports.server = server = new Server("mongod", {
    port: 27000,
    dbpath: "./data/db/27000",
    storageEngine: "mmapv1"
});
