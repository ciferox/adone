const createNode = require("../utils/create_node");

describe("libp2p", () => {
    it("has stats", (done) => {
        createNode("/ip4/127.0.0.1/tcp/0", {
            config: {
                peerDiscovery: {
                    mdns: {
                        enabled: false
                    }
                }
            }
        }, (err, node) => {
            expect(err).to.not.exist();
            node.start((err) => {
                expect(err).to.not.exist();
                expect(node.stats).to.exist();
                node.stop(done);
            });
        });
    });
});
