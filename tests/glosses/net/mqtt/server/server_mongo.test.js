require("./common");
const mqtt = require("mqtt");
const steed = require("steed");
const ascoltatori = require("ascoltatori");
const abstractServerTests = require("./abstract_server");
const MongoClient = require("mongodb").MongoClient;
const clean = require("mongo-clean");
const createConnection = require("./helpers/createConnection");

describe("mosca.Server with mongo persistence", function () {
    this.timeout(10000);

    let mongoConnection;
    const mongoUrl = "mongodb://localhost:27017/mosca";

    before((done) => {
        // Connect to the db
        MongoClient.connect(mongoUrl, { w: 1 }, (err, db) => {
            mongoConnection = db;
            done(err);
        });
    });

    after((done) => {
        mongoConnection.close(done);
    });

    beforeEach((done) => {
        clean(mongoConnection, done);
    });

    function moscaSettings() {
        return {
            port: nextPort(),
            stats: false,
            publishNewClient: false,
            publishClientDisconnect: false,
            logger: {
                level: "error"
            },
            backend: {
                type: "mongo"
                // not reusing the connection
                // because ascoltatori has not an autoClose option
                // TODO it must be handled in mosca.Server
            },
            persistence: {
                factory: adone.net.mqtt.server.persistence.Mongo,
                connection: mongoConnection,
                autoClose: false
            }
        };
    }

    abstractServerTests(moscaSettings, createConnection);
});
