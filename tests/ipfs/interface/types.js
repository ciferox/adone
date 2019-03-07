const {
    p2p: { PeerId, PeerInfo },
    multiformat: { CID, multibase, multiaddr, multihash }
} = adone;

const { getDescribe, getIt } = require("./utils/shani");

module.exports = (createCommon, options) => {
    const describe = getDescribe(options);
    const it = getIt(options);
    const common = createCommon();

    describe(".types", () => {
        let ipfs;

        before(function (done) {
            // CI takes longer to instantiate the daemon, so we need to increase the
            // timeout for the before step
            this.timeout(60 * 1000);

            common.setup((err, factory) => {
                expect(err).to.not.exist();
                factory.spawnNode((err, node) => {
                    expect(err).to.not.exist();
                    ipfs = node;
                    done();
                });
            });
        });

        after((done) => common.teardown(done));

        it("should have a types object with the required values", () => {
            expect(ipfs.types).to.be.deep.equal({
                Buffer,
                PeerId,
                PeerInfo,
                multiaddr,
                multibase,
                multihash,
                CID
            });
        });
    });
};
