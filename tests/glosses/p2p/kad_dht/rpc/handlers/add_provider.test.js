const {
    async: { parallel, waterfall },
    lodash: _
} = adone;
const srcPath = (...args) => adone.getPath("lib", "glosses", "p2p", "kad_dht", ...args);

const Message = require(srcPath("message"));
const handler = require(srcPath("rpc/handlers/add-provider"));

const createPeerInfo = require("../../utils/create_peer_info");
const createValues = require("../../utils/create_values");
const TestDHT = require("../../utils/test_dht");

describe("rpc - handlers - AddProvider", () => {
    let peers;
    let values;
    let tdht;
    let dht;

    before((done) => {
        parallel([
            (cb) => createPeerInfo(3, cb),
            (cb) => createValues(2, cb)
        ], (err, res) => {
            expect(err).to.not.exist();
            peers = res[0];
            values = res[1];
            done();
        });
    });

    beforeEach((done) => {
        tdht = new TestDHT();

        tdht.spawn(1, (err, dhts) => {
            expect(err).to.not.exist();
            dht = dhts[0];
            done();
        });
    });

    afterEach((done) => {
        tdht.teardown(done);
    });

    describe("invalid messages", () => {
        const tests = [{
            message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.alloc(0), 0),
            error: "ERR_MISSING_KEY"
        }, {
            message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.from("hello world"), 0),
            error: "ERR_INVALID_CID"
        }];

        tests.forEach((t) => it(t.error.toString(), (done) => {
            handler(dht)(peers[0], t.message, (err) => {
                expect(err).to.exist();
                expect(err.code).to.eql(t.error);
                done();
            });
        }));
    });

    it("ignore providers that do not match the sender", (done) => {
        const cid = values[0].cid;

        const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0);
        const sender = _.cloneDeep(peers[0]);
        const provider = _.cloneDeep(peers[0]);
        provider.multiaddrs.add("/ip4/127.0.0.1/tcp/1234");
        const other = _.cloneDeep(peers[1]);
        other.multiaddrs.add("/ip4/127.0.0.1/tcp/2345");
        msg.providerPeers = [
            provider,
            other
        ];

        waterfall([
            (cb) => handler(dht)(sender, msg, cb),
            (cb) => dht.providers.getProviders(cid, cb),
            (provs, cb) => {
                expect(provs).to.have.length(1);
                expect(provs[0].id).to.eql(provider.id.id);
                const bookEntry = dht.peerBook.get(provider.id);
                // Favour peerInfo from payload over peerInfo from sender
                expect(bookEntry.multiaddrs.toArray()).to.eql(
                    provider.multiaddrs.toArray()
                );
                cb();
            }
        ], done);
    });

    it("fall back to sender if providers have no multiaddrs", (done) => {
        const cid = values[0].cid;
        const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0);
        const sender = _.cloneDeep(peers[0]);
        const provider = _.cloneDeep(peers[0]);
        provider.multiaddrs.clear();
        msg.providerPeers = [provider];

        waterfall([
            (cb) => handler(dht)(sender, msg, cb),
            (cb) => dht.providers.getProviders(cid, cb),
            (provs, cb) => {
                expect(dht.peerBook.has(provider.id)).to.equal(false);
                expect(provs).to.have.length(1);
                expect(provs[0].id).to.eql(provider.id.id);
                cb();
            }
        ], done);
    });
});
