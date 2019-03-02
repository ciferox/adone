import testInterface from "./interface";
import { createNetron } from "../common";

const {
    net: { p2p: { PeerInfo } },
    netron: { Netron }
} = adone;

describe("OwnPeer", () => {
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
            assert.isTrue(peer.isConnected());
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

        async beforeEach() {
            this.netron = createNetron(this.peerInfo, "//ip4/0.0.0.0//tcp/0");
            this.peer = this.netron.peer;

            await this.netron.start();

            return [this.netron, this.peer];
        }

        async afterEach() {
            await this.netron.stop();
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
