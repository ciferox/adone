const abstractTest = require("./abstract_store");

describe("in-memory store", () => {
    abstractTest((done) => {
        done(null, new adone.net.mqtt.client.Store());
    });
});
