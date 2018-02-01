const {
    is,
    netron2: { AbstractPeer, Netron },
    x
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
            "isConnected",
            "isNetronConnected",
            "hasContexts",
            "hasContext",
            "attachContext",
            "detachContext",
            "detachAllContexts",
            "set",
            "get",
            "requestMeta",
            "_getContextDefinition",
            "_queryInterfaceByDefinition"
        ];

        for (const m of methods) {
            // eslint-disable-next-line
            it(`${m}()`, () => {
                assert.true(is.function(peer[m]));
                const e = assert.throws(() => peer[m]());
                assert.instanceOf(e, x.NotImplemented);
                assert.match(e.message, new RegExp(`Method ${m}()`));
            });
        }
    });
});
