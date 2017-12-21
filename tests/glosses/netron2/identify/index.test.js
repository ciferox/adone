const pair = require("pull-pair/duplex");
const lp = require("pull-length-prefixed");

const {
    multi,
    netron2: { identify, PeerInfo },
    stream: { pull }
} = adone;


describe("netron2", "identify", () => {
    it("multicodec", () => {
        expect(identify.multicodec).to.eql("/ipfs/id/1.0.0");
    });

    describe("dialer", () => {
        let original;
        beforeEach((done) => {
            PeerInfo.create((err, info) => {
                if (err) {
                    return done(err);
                }

                original = info;
                done();
            });
        });

        it("works", (done) => {
            const p = pair();
            original.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/5002"));
            const input = identify.message.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [multi.address.create("/ip4/127.0.0.1/tcp/5002").buffer],
                observedAddr: multi.address.create("/ip4/127.0.0.1/tcp/5001").buffer
            });

            pull(
                pull.values([input]),
                lp.encode(),
                p[0]
            );

            identify.dialer(p[1], (err, info, observedAddrs) => {
                assert.notExists(err);
                expect(info.id.pubKey.bytes)
                    .to.eql(original.id.pubKey.bytes);

                expect(info.multiaddrs.toArray())
                    .to.eql(original.multiaddrs.toArray());

                expect(observedAddrs)
                    .to.eql([multi.address.create("/ip4/127.0.0.1/tcp/5001")]);

                done();
            });
        });
    });

    describe("listener", () => {
        let info;
    
        beforeEach((done) => {
            PeerInfo.create((err, _info) => {
                if (err) {
                    return done(err);
                }
    
                info = _info;
                done();
            });
        });
    
        it("works", (done) => {
            const p = pair();
            info.multiaddrs.add(multi.address.create("/ip4/127.0.0.1/tcp/5002"));
            pull(
                p[1],
                lp.decode(),
                pull.collect((err, result) => {
                    assert.notExists(err);
    
                    const input = identify.message.decode(result[0]);
                    expect(
                        input
                    ).to.be.eql({
                        protocolVersion: "ipfs/0.1.0",
                        agentVersion: "na",
                        publicKey: info.id.pubKey.bytes,
                        listenAddrs: [multi.address.create("/ip4/127.0.0.1/tcp/5002").buffer],
                        observedAddr: multi.address.create("/ip4/127.0.0.1/tcp/5001").buffer,
                        protocols: []
                    });
                    done();
                })
            );
    
            const conn = p[0];
            conn.getObservedAddrs = (cb) => {
                cb(null, [multi.address.create("/ip4/127.0.0.1/tcp/5001")]);
            };
    
            identify.listener(conn, info);
        });
    });
});
