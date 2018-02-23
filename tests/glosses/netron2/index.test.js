const {
    is,
    crypto: { Identity },
    net: { p2p: { PeerInfo } },
    netron2: { Netron, DContext, DPublic }
} = adone;

describe("functional and complex cases", () => {
    @DContext()
    class A {
        @DPublic()
        method() { }
    }

    @DContext()
    class B {
        @DPublic()
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
        peerS.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
        peerC = new PeerInfo(idClient);
        peerC.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
    });
});
