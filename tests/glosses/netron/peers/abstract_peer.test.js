const {
    is,
    netron: { AbstractPeer, Netron },
    error
} = adone;

describe("AbstractPeer", () => {
    let peer;
    let netron;

    before(() => {
        netron = new Netron();
        peer = new AbstractPeer(netron);
    });

    describe("abstract methods", () => {
        const methods = [
            "disconnect",
            "isConnected",
            "subscribe",
            "unsubscribe",
            "attachContext",
            "detachContext",
            "detachAllContexts",
            "hasContexts",
            "hasContext",
            "set",
            "get",
            "_runTask",
            "_getContextDefinition",
            "_queryInterfaceByDefinition"
        ];

        for (const m of methods) {
            // eslint-disable-next-line
            it(`${m}()`, () => {
                assert.isTrue(is.function(peer[m]));
                const e = assert.throws(() => peer[m]());
                assert.instanceOf(e, error.NotImplementedException);
                assert.match(e.message, new RegExp(`Method ${m}()`));
            });
        }
    });
});
