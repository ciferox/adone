const {
    is,
    netron2: { AbstractPeer, Netron },
    exception
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
            "isNetronConnected",
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
                assert.true(is.function(peer[m]));
                const e = assert.throws(() => peer[m]());
                assert.instanceOf(e, exception.NotImplemented);
                assert.match(e.message, new RegExp(`Method ${m}()`));
            });
        }
    });
});
