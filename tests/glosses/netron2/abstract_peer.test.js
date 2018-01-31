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
            "set",
            "get",
            {
                name: "call",
                err: "get"
            },
            {
                name: "callVoid",
                err: "set"
            },
            "requestMeta",
            "getDefinitionByName",
            "getInterfaceById"
        ];

        for (const m of methods) {
            // eslint-disable-next-line
            it(`${is.string(m) ? m : m.name}()`, () => {
                let name;
                let err;
                if (is.string(m)) {
                    name = err = m;
                } else {
                    name = m.name;
                    err = m.err;
                }
                assert.true(is.function(peer[name]));
                const e = assert.throws(() => peer[name]());
                assert.instanceOf(e, x.NotImplemented);
                assert.match(e.message, new RegExp(`Method ${err}()`));
            });
        }
    });
});
