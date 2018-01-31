const {
    is,
    net: { p2p: { PeerId } },
    netron2: { Netron }
} = adone;

describe("Netron", () => {
    let peerId;

    before(() => {
        peerId = PeerId.create();
    });

    describe("initialization", () => {
        it("default constructor", () => {
            const netron = new Netron();

            assert.instanceOf(netron, adone.event.AsyncEmitter);
            assert.true(is.netron2OwnPeer(netron.peer));
            assert.equal(netron.options.responseTimeout, 3 * 60000);
            assert.equal(netron.options.proxyContexts, false);
            
            assert.instanceOf(netron.contexts, Map);
            assert.equal(netron.contexts.size, 0);
            assert.false(netron.hasContexts());
            assert.lengthOf(netron.getContextNames(), 0);
            
            assert.instanceOf(netron.peers, Map);
            assert.equal(netron.peers.size, 0);
            
            assert.instanceOf(netron.networks, Map);
            assert.equal(netron.networks.size, 0);

            assert.instanceOf(netron._defUniqueId, adone.netron2.FastUniqueId);
        });

        it("with precreated PeerId", () => {
            const n = new Netron(peerId);
            assert.deepEqual(peerId, n.peer.info.id);
        });

        it("custom unique id generator for context definitions", () => {
            const netron = new Netron(peerId, {
                uniqueId: new adone.netron2.UniqueId()
            });
            assert.instanceOf(netron._defUniqueId, adone.netron2.UniqueId);
        });
    });
});
