const {
    p2p: { PeerId }
} = adone;

const { srcPath } = require("../utils/helpers");

const Ledger = require(srcPath("decision-engine/ledger"));

describe("Ledger", () => {
    let peerId;
    let ledger;

    before((done) => {
        PeerId.create({ bits: 512 }, (err, _peerId) => {
            if (err) {
                return done(err);
            }

            peerId = _peerId;
            done();
        });
    });

    beforeEach(() => {
        ledger = new Ledger(peerId);
    });

    it("accounts", () => {
        expect(ledger.debtRatio()).to.eql(0);

        ledger.sentBytes(100);
        ledger.sentBytes(12000);
        ledger.receivedBytes(223432);
        ledger.receivedBytes(2333);

        expect(ledger.accounting)
            .to.eql({
                bytesSent: 100 + 12000,
                bytesRecv: 223432 + 2333
            });
        expect(ledger.debtRatio())
            .to.eql((100 + 12000) / (223432 + 2333 + 1));
    });
});
