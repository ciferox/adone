import testInterface from "./interface";
// import { createNetron } from "../common";

const {
    netron: { Netron, AbstractPeer }
} = adone;

describe.todo("OwnPeer", () => {
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
            this.peerInfo = null;

            this._reset();
        }

        before() {
        }

        after() {
        }

        async beforeEach() {
            this.netron = new Netron();
            this.peer = this.netron.peer;
            return [this.netron, this.peer];
        }

        async afterEach() {
            this._reset();
        }

        _reset() {
            this.netron = null;
            this.peer = null;
        }
    }

    testInterface(new TestInterface());
});
