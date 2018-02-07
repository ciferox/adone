import testInterface from "./interface";

const {
    net: { p2p: { PeerInfo } },
    netron2: { Netron }
} = adone;

describe("netron", "RemotePeer", () => {
    describe("specific", () => {
        let peerInfo;
        let netron;
        let peer;
    
        before(() => {
        });

        beforeEach(() => {
        });
    });

    class TestInterface {
        constructor() {
            this._reset();
        }

        before() {
            this.peerInfoS = PeerInfo.create();
            this.peerInfoS.multiaddrs.add("/ip4/0.0.0.0/tcp/0");

            this.peerInfoC = PeerInfo.create();
            this.peerInfoC.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
        }

        after() {
        }

        async beforeEach() {
            this.netronS = new Netron(this.peerInfoS, {
                proxyContexts: true
            });
            this.peerS = this.netronS.peer;

            this.netronC = new Netron(this.peerInfoC);
            this.peerC = this.netronC.peer;

            this.netronS.createNetCore("default");
            this.netronC.createNetCore("default");

            await this.netronS.start();
            this.netron = this.netronS;
            this.peer = await this.netronC.connect("default", this.peerInfoS);

            return [this.netron, this.peer];
        }

        async afterEach() {
            await this.netronS.stop("default");
            this._reset();
        }

        _reset() {
            this.netronC = null;
            this.netronS = null;
            this.peerS = null;
            this.peerC = null;
            this.peer = null;
            this.netron = null;
        }
    }

    testInterface(new TestInterface());
});
