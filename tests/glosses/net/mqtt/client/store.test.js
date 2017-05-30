const abstractTest = require("./abstract_store");

describe("net", "mqtt", "client", "in-memory store", () => {
    abstractTest((done) => {
        done(null, new adone.net.mqtt.client.Store());
    });
});
