const abstract = require("./abstract");
const Memory = adone.net.mqtt.server.persistence.Memory;

describe("mosca.persistence.Memory", function () {

    this.timeout(2000);

    const opts = {
        ttl: {
            checkFrequency: 250,
            subscriptions: 250,
            packets: 250
        }
    };

    abstract(Memory, opts);
});
