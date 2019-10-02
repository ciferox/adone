/**
 * eslint-env mocha
 */


const chai = require("chai");
chai.use(require("dirty-chai"));
const expect = chai.expect;

const Prepare = require("./utils/prepare");

const PEER_COUNT = 3;

describe("setPeerValue", () => {
    const prepare = Prepare(PEER_COUNT, [{
        maxPeers: 1,
        defaultPeerValue: 0
    }]);
    before(prepare.create);
    after(prepare.after);

    it("kicks out lower valued peer first", (done) => {
        let disconnects = 0;
        let firstConnectedPeer;
        const manager = prepare.connManagers()[0];

        manager.once("connected", (peerId) => {
            if (!firstConnectedPeer) {
                firstConnectedPeer = peerId;
                manager.setPeerValue(peerId, 1);
            }
        });

        manager.on("disconnected", (peerId) => {
            disconnects++;
            expect(disconnects).to.be.most(PEER_COUNT - 2);
            expect(peerId).to.not.be.equal(firstConnectedPeer);
            manager.removeAllListeners("disconnected");
            done();
        });

        prepare.tryConnectAll((err) => {
            expect(err).to.not.exist();
        });
    });
});