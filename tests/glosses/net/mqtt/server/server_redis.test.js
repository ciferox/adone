require("./common");
const mqtt = require("mqtt");
const steed = require("steed");
const ascoltatori = require("ascoltatori");
const abstractServerTests = require("./abstract_server");
const redis = require("ioredis");
const createConnection = require("./helpers/createConnection");

describe("mosca.Server with redis persistence", () => {

    beforeEach((cb) => {
        const client = redis.createClient();
        client.on("ready", () => {
            client.flushdb(() => {
                client.quit(cb);
            });
        });
    });

    function moscaSettings() {
        return {
            port: nextPort(),
            stats: false,
            publishNewClient: false,
            logger: {
                level: "error"
            },
            backend: {
                type: "redis"
                // not reusing the connection
                // because ascoltatori has not an autoClose option
                // TODO it must be handled in mosca.Server
            },
            persistence: {
                factory: adone.net.mqtt.server.persistence.Redis
            }
        };
    }

    abstractServerTests(moscaSettings, createConnection);
});
