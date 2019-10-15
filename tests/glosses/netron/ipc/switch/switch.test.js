const Switch = require(adone.getPath("src/glosses/netron/ipc/switch"));

describe("Switch", () => {
    describe(".availableTransports", () => {
        it("should always sort circuit last", () => {
            const switchA = new Switch({}, {});
            const transport = {
                filter: (addrs) => addrs
            };
            const mockPeerInfo = {
                multiaddrs: {
                    toArray: () => ["a", "b", "c"]
                }
            };

            switchA.transports = {
                // Circuit: transport,
                TCP: transport,
                WebSocketStar: transport
            };

            expect(switchA.availableTransports(mockPeerInfo)).to.eql([
                "TCP",
                "WebSocketStar",
                // "Circuit"
            ]);
        });
    });
});
