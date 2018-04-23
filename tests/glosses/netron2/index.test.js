const {
    is,
    crypto: { Identity },
    net: { p2p: { PeerInfo } },
    netron2: { Netron, meta: { Context, Public } }
} = adone;

describe("functional and complex cases", () => {
    @Context()
    class A {
        @Public()
        method() { }
    }

    @Context()
    class B {
        @Public()
        method() { }
    }

    let idServer;
    let idClient;
    let peerS;
    let peerC;
    const peerId = Identity.create();

    before(() => {
        idServer = Identity.create();
        idClient = Identity.create();
    });

    beforeEach(async () => {
        peerS = new PeerInfo(idServer);
        peerS.multiaddrs.add("//ip4/0.0.0.0//tcp/0");
        peerC = new PeerInfo(idClient);
        peerC.multiaddrs.add("//ip4/0.0.0.0//tcp/0");
    });
});
