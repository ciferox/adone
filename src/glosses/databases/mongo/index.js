// Core module
const core = require("./core");
const Instrumentation = require("./lib/apm");

// Set up the connect function
const connect = require("./lib/mongo_client").connect;

connect.core = core;
// Expose error class
connect.MongoError = core.MongoError;

// Actual driver classes exported
connect.Admin = require("./lib/admin");
connect.MongoClient = require("./lib/mongo_client");
connect.Db = require("./lib/db");
connect.Collection = require("./lib/collection");
connect.Server = require("./lib/server");
connect.ReplSet = require("./lib/replset");
connect.Mongos = require("./lib/mongos");
connect.ReadPreference = require("./lib/read_preference");
connect.GridStore = require("./lib/gridfs/grid_store");
connect.Chunk = require("./lib/gridfs/chunk");
connect.Logger = core.Logger;
connect.Cursor = require("./lib/cursor");
connect.GridFSBucket = require("./lib/gridfs-stream");
// Exported to be used in tests not to be used anywhere else
connect.CoreServer = core.Server;
connect.CoreConnection = core.Connection;

// BSON types exported
connect.Binary = adone.data.bson.Binary;
connect.Code = adone.data.bson.Code;
connect.Map = adone.data.bson.Map;
connect.DBRef = adone.data.bson.DBRef;
connect.Double = adone.data.bson.Double;
connect.Int32 = adone.data.bson.Int32;
connect.Long = adone.data.bson.Long;
connect.MinKey = adone.data.bson.MinKey;
connect.MaxKey = adone.data.bson.MaxKey;
connect.ObjectID = adone.data.bson.ObjectID;
connect.ObjectID = adone.data.bson.ObjectID;
connect.Symbol = adone.data.bson.Symbol;
connect.Timestamp = adone.data.bson.Timestamp;
connect.Decimal128 = adone.data.bson.Decimal128;

// Add connect method
connect.connect = connect;

// Set up the instrumentation method
connect.instrument = function(options, callback) {
    if (typeof options == "function") callback = options, options = {};
    return new Instrumentation(core, options, callback);
};

// Set our exports to be the connect function
module.exports = connect;
