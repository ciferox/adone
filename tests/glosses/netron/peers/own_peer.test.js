import testInterface from "./interface";

const {
    netron: { P2PNetCore, Netron, AbstractPeer }
} = adone;

describe("OwnPeer", () => {
    describe("specific", () => {
        let netron;
        let peer;

        beforeEach(() => {
            netron = new Netron();
            peer = netron.peer;
        });

        it("should be inherited from AbstractPeer", () => {
            assert.isTrue(peer instanceof AbstractPeer);
        });

        it("should have correct instance of projected netron", () => {
            assert.strictEqual(peer.netron, netron);
        });
    });

    class TestInterface {
        constructor() {
            this.peerId = null;
            this.otherPeerId = null;
        }

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
            this.peerId = await P2PNetCore.createPeerId({ bits: 512 });
            this.otherPeerId = await P2PNetCore.createPeerId({ bits: 512 });
        }

        after() {
        }

        async beforeEach() {
            this.peerInfo = await P2PNetCore.createPeerInfo({
                addrs: "/ip4/0.0.0.0/tcp/0",
                peerId: this.peerId
            });
            this.p2pNetCore = new P2PNetCore({ peerInfo: this.peerInfo });
            this.netron = new Netron();
            await this.p2pNetCore.start(this.netron);

            this.peer = this.netron.peer;
            return [this.p2pNetCore, this.netron, this.peer];
        }

        async afterEach() {
            await this._reset();
        }

        async _reset() {
            if (this.p2pNetCore) {
                await this.p2pNetCore.stop();
                this.p2pNetCore = null;
            }
            this.peerInfo = null;
            this.netron = null;
            this.peer = null;
        }
    }

    testInterface(new TestInterface());
});
