import testInterface from "./interface";

const {
    net: { p2p: { PeerInfo } },
    netron2: { Netron }
} = adone;

describe("netron", "OwnPeer", () => {
    describe("specific", () => {
        let peerInfo;
        let netron;
        let peer;
    
        before(() => {
            peerInfo = PeerInfo.create();
        });
    
        beforeEach(() => {
            netron = new Netron(peerInfo);
            peer = netron.peer;
        });
    
        it("isConnected() always return true", () => {
            assert.true(peer.isConnected());
        });
    
        it("isNetronConnected() always return true", () => {
            assert.true(peer.isNetronConnected());
        });
    });

    class TestInterface {
        constructor() {
            this._reset();
        }

        before() {
            this.peerInfo = PeerInfo.create();
        }

        after() {
        }
    
        beforeEach() {
            this.netron = new Netron(this.peerInfo);
            this.peer = this.netron.peer;

            return [this.netron, this.peer];
        }

        afterEach() {
            this._reset();
        }

        _reset() {
            this.peerInfo = null;
            this.netron = null;
            this.peer = null;
        }
    }

    testInterface(new TestInterface());
});
