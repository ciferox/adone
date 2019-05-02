const {
    p2p: { identify, PeerInfo },
    stream: { pull },
    multiformat: { multiaddr }
} = adone;
const { collect, pair, values, lengthPrefixed: lp } = pull;

const srcPath = (...args) => adone.path.join(adone.ROOT_PATH, "lib", "glosses", ...args);

const msg = require(srcPath("p2p", "identify", "message"));

describe("p2p", "identify", () => {
    describe("basic", () => {
        it("multicodec", () => {
            expect(identify.multicodec).to.eql("/ipfs/id/1.0.0");
        });
    });

    describe("dialer", () => {
        let original;
        beforeEach(function (done) {
            this.timeout(20 * 1000);

            PeerInfo.create((err, info) => {
                if (err) {
                    return done(err);
                }

                original = info;
                done();
            });
        });

        it("works", (done) => {
            const p = pair.duplex();
            original.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));
            original.protocols.add("/echo/1.0.0");
            original.protocols.add("/ping/1.0.0");

            const input = msg.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [multiaddr("/ip4/127.0.0.1/tcp/5002").buffer],
                observedAddr: multiaddr("/ip4/127.0.0.1/tcp/5001").buffer,
                protocols: Array.from(original.protocols)
            });

            pull(
                values([input]),
                lp.encode(),
                p[0]
            );

            identify.dialer(p[1], (err, info, observedAddrs) => {
                expect(err).to.not.exist();
                expect(info.id.pubKey.bytes)
                    .to.eql(original.id.pubKey.bytes);

                expect(info.multiaddrs.toArray())
                    .to.eql(original.multiaddrs.toArray());

                expect(observedAddrs)
                    .to.eql([multiaddr("/ip4/127.0.0.1/tcp/5001")]);

                expect(info.protocols).to.eql(original.protocols);

                done();
            });
        });

        it.todo("should handle missing protocols", (done) => {
            const p = pair();
            original.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));

            const input = msg.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [multiaddr("/ip4/127.0.0.1/tcp/5002").buffer],
                observedAddr: multiaddr("/ip4/127.0.0.1/tcp/5001").buffer,
                protocols: Array.from(original.protocols)
            });

            pull(
                values([input]),
                lp.encode(),
                p[0]
            );

            identify.dialer(p[1], (err, info, observedAddrs) => {
                expect(err).to.not.exist();
                expect(info.id.pubKey.bytes)
                    .to.eql(original.id.pubKey.bytes);

                expect(info.multiaddrs.toArray())
                    .to.eql(original.multiaddrs.toArray());

                expect(observedAddrs)
                    .to.eql([multiaddr("/ip4/127.0.0.1/tcp/5001")]);

                expect(Array.from(info.protocols)).to.eql([]);

                done();
            });
        });

        it("does not crash with invalid listen addresses", (done) => {
            const p = pair.duplex();
            original.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));
            const input = msg.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [Buffer.from("ffac010203")],
                observedAddr: Buffer.from("ffac010203")
            });

            pull(
                values([input]),
                lp.encode(),
                p[0]
            );

            identify.dialer(p[1], (err, info, observedAddrs) => {
                expect(err).to.exist();

                done();
            });
        });

        it("does not crash with invalid observed address", (done) => {
            const p = pair.duplex();
            original.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));
            const input = msg.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [multiaddr("/ip4/127.0.0.1/tcp/5002").buffer],
                observedAddr: Buffer.from("ffac010203")
            });

            pull(
                values([input]),
                lp.encode(),
                p[0]
            );

            identify.dialer(p[1], (err, info, observedAddrs) => {
                expect(err).to.exist();

                done();
            });
        });

        it("should return an error with mismatched peerInfo data", (done) => {
            const p = pair.duplex();
            original.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));
            const input = msg.encode({
                protocolVersion: "ipfs/0.1.0",
                agentVersion: "na",
                publicKey: original.id.pubKey.bytes,
                listenAddrs: [multiaddr("/ip4/127.0.0.1/tcp/5002").buffer],
                observedAddr: multiaddr("/ip4/127.0.0.1/tcp/5001").buffer
            });

            PeerInfo.create((err, info) => {
                if (err) {
                    return done(err);
                }

                pull(
                    values([input]),
                    lp.encode(),
                    p[0]
                );

                identify.dialer(p[1], info, (err, peerInfo) => {
                    expect(err).to.exist();
                    expect(peerInfo).to.not.exist();
                    done();
                });
            });
        });
    });

    describe("listener", () => {
        let info;

        beforeEach(function (done) {
            this.timeout(20 * 1000);

            PeerInfo.create((err, _info) => {
                if (err) {
                    return done(err);
                }

                _info.protocols.add("/echo/1.0.0");
                _info.protocols.add("/chat/1.0.0");

                info = _info;
                done();
            });
        });

        it("works", (done) => {
            const p = pair.duplex();

            info.multiaddrs.add(multiaddr("/ip4/127.0.0.1/tcp/5002"));

            pull(
                p[1],
                lp.decode(),
                collect((err, result) => {
                    expect(err).to.not.exist();

                    const input = msg.decode(result[0]);
                    expect(
                        input
                    ).to.be.eql({
                        protocolVersion: "ipfs/0.1.0",
                        agentVersion: "na",
                        publicKey: info.id.pubKey.bytes,
                        listenAddrs: [multiaddr("/ip4/127.0.0.1/tcp/5002").buffer],
                        observedAddr: multiaddr("/ip4/127.0.0.1/tcp/5001").buffer,
                        protocols: ["/echo/1.0.0", "/chat/1.0.0"]
                    });
                    done();
                })
            );

            const conn = p[0];
            conn.getObservedAddrs = (cb) => {
                cb(null, [multiaddr("/ip4/127.0.0.1/tcp/5001")]);
            };

            identify.listener(conn, info);
        });
    });
});
