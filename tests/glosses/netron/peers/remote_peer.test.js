import testInterface from "./interface";

const {
    p2p: { PeerInfo },
    netron: { P2PNetCore, Netron }
} = adone;

describe("RemotePeer", () => {
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
        async createNetCore(netron) {
            const p2pNC = new P2PNetCore({
                peerInfo: await P2PNetCore.createPeerInfo({
                    addrs: "/ip4/0.0.0.0/tcp/0",
                    peerId: this.otherPeerId
                })
            });
            await p2pNC.start(netron);
            return p2pNC;
        }

        async before() {
            await this._reset();
            this.peerIdS = await P2PNetCore.createPeerId({ bits: 512 });
            this.peerIdC = await P2PNetCore.createPeerId({ bits: 512 });
            this.otherPeerId = await P2PNetCore.createPeerId({ bits: 512 });
        }

        after() {
        }

        async beforeEach() {
            this.netronS = new Netron({
                proxifyContexts: true
            });
            this.peerInfoS = await P2PNetCore.createPeerInfo({
                addrs: "/ip4/0.0.0.0/tcp/0",
                peerId: this.peerIdS
            });
            this.p2pNetCoreS = new P2PNetCore({ peerInfo: this.peerInfoS });
            await this.p2pNetCoreS.start(this.netronS);


            
            this.netronC = new Netron();
            this.peerInfoC = await P2PNetCore.createPeerInfo({
                addrs: "/ip4/0.0.0.0/tcp/0",
                peerId: this.peerIdC
            });
            this.p2pNetCoreC = new P2PNetCore({ peerInfo: this.peerInfoC });
            await this.p2pNetCoreC.start(this.netronC);

            this.netron = this.netronS;
            this.peer = await this.p2pNetCoreC.connect(this.p2pNetCoreS.peerInfo, this.netronC);

            return [this.p2pNetCoreS, this.netron, this.peer];
        }

        async afterEach() {
            await this._reset();
        }

        async _reset() {
            if (this.p2pNetCoreS) {
                await this.p2pNetCoreS.stop();
                this.p2pNetCoreS = null;
            }
            if (this.p2pNetCoreC) {
                await this.p2pNetCoreC.stop();
                this.p2pNetCoreC = null;
            }
            this.netronC = null;
            this.netronS = null;
            this.peer = null;
            this.netron = null;
        }
    }

    testInterface(new TestInterface());
});
