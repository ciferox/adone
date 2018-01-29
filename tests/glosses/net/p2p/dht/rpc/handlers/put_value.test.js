import { makePeers, teardown, setupDHT } from "../../utils";

const {
    net: { p2p: { dht, record: { Record } } }
} = adone;
const { utils, rpcHandler: { putValue }, Message } = adone.private(dht);

const T = Message.TYPES.PUT_VALUE;

describe("dht", "KadDHT", "rpc - handlers - PutValue", () => {
    let peers;
    let dht;

    before(() => {
        peers = makePeers(2);
    });

    afterEach(() => teardown());

    beforeEach(async () => {
        dht = await setupDHT();
    });

    it("errors on missing record", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        putValue(dht)(peers[0], msg, (err, response) => {
            expect(err).to.match(/Empty record/);
            done();
        });
    });

    it("stores the record in the datastore", (done) => {
        const msg = new Message(T, Buffer.from("hello"), 5);
        const record = new Record(
            Buffer.from("hello"),
            Buffer.from("world"),
            peers[0].id
        );
        msg.record = record;

        putValue(dht)(peers[1], msg, (err, response) => {
            assert.notExists(err);
            expect(response).to.be.eql(msg);

            const key = utils.bufferToKey(Buffer.from("hello"));
            dht.datastore.get(key, (err, res) => {
                assert.notExists(err);
                const rec = Record.deserialize(res);

                expect(rec).to.have.property("key").eql(Buffer.from("hello"));

                // make sure some time has passed
                setTimeout(() => {
                    expect(rec.timeReceived < new Date()).to.be.eql(true);
                    done();
                }, 10);
            });
        });
    });
});
