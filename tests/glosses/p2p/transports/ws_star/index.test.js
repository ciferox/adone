const each = require("async/each");
const series = require("async/series");
const map = require("async/map");

const {
    multiformat: { multiaddr },
    p2p: { PeerId, transport: { WSStar } },
    stream: { pull2: pull }
} = adone;

describe("p2p", "transport", "WSStar", () => {
    describe("instantiate the transport", () => {
        it("create", () => {
            const wstar = new WSStar();
            expect(wstar).to.exist();
        });

        it("create without new", () => {
            expect(() => WSStar()).to.throw();
        });
    });

    describe("dial", () => {
        const listeners = [];
        let ws1;
        let ma1;
        // let ma1v6

        let ws2;
        let ma2;
        let ma2v6;

        const peerId1 = "QmS8BL7M8jrXYhHo2ofEVeiq5aDKTr29ksmpcqWxjZGvpX";
        const peerId2 = "QmeJGHUQ4hsMvPzAoXCdkT1Z9NBgjT7BenVPENUgpufENP";

        const maDNS = "/dnsaddr/ws-star-signal-3.servep2p.com";
        const maDNS6 = "/dns6/ws-star-signal-2.servep2p.com";
        const maRemoteIP4 = "/ip4/148.251.206.162/tcp/9090";
        const maRemoteIP6 = "/ip6/2a01:4f8:212:e0::1/tcp/4287";

        const maLocalIP4 = "/ip4/127.0.0.1/tcp/15001";
        // const maLocalIP6 = '/ip6/::1/tcp/15003'
        const maGen = (base, id, sec) => multiaddr(`/${base}/${sec ? "wss" : "ws"}/p2p-websocket-star/ipfs/${id}`);

        if (process.env.REMOTE_DNS) {
            // test with deployed signalling server using DNS
            console.log("Using DNS:", maDNS, maDNS6); // eslint-disable-line no-console
            ma1 = maGen(maDNS, peerId1, true);
            // ma1v6 = maGen(maDNS6, peerId1)

            ma2 = maGen(maDNS, peerId2, true);
            ma2v6 = maGen(maDNS6, peerId2, true);
        } else if (process.env.REMOTE_IP) {
            // test with deployed signalling server using IP
            console.log("Using IP:", maRemoteIP4, maRemoteIP6); // eslint-disable-line no-console
            ma1 = maGen(maRemoteIP4, peerId1);
            // ma1v6 = maGen(maRemoteIP6, peerId1)

            ma2 = maGen(maRemoteIP4, peerId2);
            ma2v6 = maGen(maRemoteIP6, peerId2);
        } else {
            ma1 = maGen(maLocalIP4, peerId1);
            // ma1v6 = maGen(maLocalIP6, peerId1)

            ma2 = maGen(maLocalIP4, peerId2);
            ma2v6 = maGen(maLocalIP4, peerId2);
        }

        before((done) => {
            map(require("./ids.json"), PeerId.createFromJSON, (err, ids) => {
                if (err) {
                    return done(err);
                }
                ws1 = new WSStar({ id: ids[0], allowJoinWithDisabledChallenge: true });
                ws2 = new WSStar({ id: ids[1], allowJoinWithDisabledChallenge: true });

                each([
                    [ws1, ma1],
                    [ws2, ma2]
                    // [ws1, ma1v6],
                    // [ws2, ma2v6]
                ], (i, n) => listeners[listeners.push(i[0].createListener((conn) => pull(conn, conn))) - 1].listen(i[1], n), done);
            });
        });

        it("dial on IPv4, check callback", (done) => {
            ws1.dial(ma2, (err, conn) => {
                expect(err).to.not.exist();

                const data = Buffer.from("some data");

                pull(
                    pull.values([data]),
                    conn,
                    pull.collect((err, values) => {
                        expect(err).to.not.exist();
                        values[0] = Buffer.from(values[0]);
                        expect(values).to.eql([data]);
                        done();
                    })
                );
            });
        });

        it("dial on IPv4, close listener, prevent end, re-start listener", (done) => {
            ws1.dial(ma2, (err, conn) => {
                expect(err).to.not.exist();

                let endFn;
                let ended = false;
                pull(
                    // Prevent end until test has completed
                    (end, cb) => {
                        endFn = cb;
                    },
                    conn,
                    pull.drain(() => {
                        // Should not be called until test has completed
                        ended = true;
                    })
                );

                listeners[0].close(() => { });
                listeners[0].listen(ma1, () => {
                    expect(ended).to.be.equal(false);
                    endFn(true);
                    done();
                });
            });
        });

        it("dial offline / non-exist()ent node on IPv4, check callback", (done) => {
            const maOffline = multiaddr("/ip4/127.0.0.1/tcp/40404/ws/p2p-websocket-star/ipfs/ABCD");

            ws1.dial(maOffline, (err) => {
                expect(err).to.exist();
                done();
            });
        });

        it.skip("dial on IPv6, check callback", (done) => {
            ws1.dial(ma2v6, (err, conn) => {
                expect(err).to.not.exist();

                const data = Buffer.from("some data");

                pull(
                    pull.values([data]),
                    conn,
                    pull.collect((err, values) => {
                        expect(err).to.not.exist();
                        values[0] = Buffer.from(values[0]);
                        expect(values).to.be.eql([data]);
                        done();
                    })
                );
            });
        });

        after((done) => each(listeners, (l, next) => l.close(next), done));
    });

    describe("disconnect", () => {
        let ws1;
        const ma1 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5a");

        let ws2;
        const ma2 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5b");

        let conn;
        let otherConn;
        const listeners = [];

        before((done) => {
            const first = function (next) {
                ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

                const listener = ws1.createListener((conn) => pull(conn, conn));
                listener.listen(ma1, next);
                listeners.push(listener);
            };

            const second = function (next) {
                ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

                const listener = ws2.createListener((conn) => (otherConn = conn));
                listener.listen(ma2, next);
                listeners.push(listener);
            };

            const dial = function () {
                conn = ws1.dial(ma2, done);
            };

            series([first, second], dial);
        });

        after((done) => each(listeners, (l, next) => l.close(next), done));

        it("all conns die when one peer quits", (done) => {
            let endFn;
            pull(
                (end, cb) => {
                    endFn = cb;
                },
                conn,
                pull.collect((err) => {
                    if (err) {
                        return done(err);
                    }
                    pull(
                        otherConn,
                        pull.collect((err) => {
                            if (err) {
                                return done(err);
                            }
                            endFn(true);
                            done();
                        })
                    );
                })
            );
            const url = Object.keys(ws2.listeners_list).shift();
            ws2.listeners_list[url]._down();
        });
    });

    describe("peer discovery", () => {
        const listeners = [];
        let ws1;
        const ma1 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4A");
        let ws2;
        const ma2 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4B");
        let ws3;
        const ma3 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo4C");

        after((done) => each(listeners, (l, next) => l.close(next), done));

        it("listen on the first", (done) => {
            ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const listener = ws1.createListener((/* conn */) => { });

            listeners.push(listener);
            listener.listen(ma1, (err) => {
                expect(err).to.not.exist();
                done();
            });
        });

        it("listen on the second, discover the first", (done) => {
            ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

            ws1.discovery.once("peer", (peerInfo) => {
                expect(peerInfo.multiaddrs.has(ma2)).to.equal(true);
                done();
            });

            const listener = ws2.createListener((/* conn */) => { });

            listeners.push(listener);
            listener.listen(ma2, (err) => {
                expect(err).to.not.exist();
            });
        });

        it("new peer receives peer events for all other peers on connect", (done) => {
            ws3 = new WSStar({ allowJoinWithDisabledChallenge: true });

            const discovered = [];
            ws3.discovery.on("peer", (peerInfo) => {
                discovered.push(peerInfo.multiaddrs);
                if (discovered.length === 2) {
                    gotAllPeerEvents();
                }
            });

            const gotAllPeerEvents = () => {
                const allMas = new Set();
                discovered.forEach((mas) => {
                    mas.forEach((ma) => allMas.add(ma.toString()));
                });
                expect(allMas.has(ma1.toString())).to.equal(true);
                expect(allMas.has(ma2.toString())).to.equal(true);
                done();
            };

            const listener = ws3.createListener((/* conn */) => { });

            listeners.push(listener);
            listener.listen(ma3, (err) => {
                expect(err).to.not.exist();
            });
        });
    });

    describe("filter", () => {
        it("filters non valid websocket-star multiaddrs", () => {
            const ws = new WSStar();

            const maArr = [
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star"),
                multiaddr("/dnsaddr/libp2p.io/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multiaddr("/dnsaddr/signal.libp2p.io/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multiaddr("/dnsaddr/signal.libp2p.io/wss/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo2"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo3"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multiaddr("/ip4/127.0.0.1/tcp/9090/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4"),
                multiaddr("/p2p-websocket-star/ip4/127.0.0.1/tcp/9090/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo4")
            ];

            const filtered = ws.filter(maArr);
            expect(filtered.length).to.not.equal(maArr.length);
            expect(filtered.length).to.equal(8);
        });

        it("filter a single addr for this transport", () => {
            const ws = new WSStar();
            const ma = multiaddr("/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSoooo1");

            const filtered = ws.filter(ma);
            expect(filtered.length).to.equal(1);
        });
    });

    describe("listen", () => {
        let ws;

        const ma = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooA");
        const mav6 = multiaddr("/ip6/::1/tcp/15003/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooooB");

        before(() => {
            ws = new WSStar({ allowJoinWithDisabledChallenge: true });
        });

        it("listen, check for callback", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.listen(ma, (err) => {
                expect(err).to.not.exist();
                listener.close(done);
            });
        });

        it("listen, check for listening event", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.once("listening", () => listener.close(done));
            listener.listen(ma);
        });

        it("listen, check for the close event", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.listen(ma, (err) => {
                expect(err).to.not.exist();
                listener.once("close", done);
                listener.close();
            });
        });

        it.skip("close listener with connections, through timeout", (done) => {
            // TODO ? Should this apply ?
        });

        // travis ci has some ipv6 issues. circle ci is fine.
        // Also, aegir is failing to propagate the environment variables
        // into the browser: https://github.com/ipfs/aegir/issues/177
        // ..., which was causing this test to fail.
        // Activate this test after the issue is solved.
        // skiptravis('listen on IPv6 addr', (done) => {
        it.skip("listen on IPv6 addr", (done) => {
            const listener = ws.createListener((conn) => { });

            listener.listen(mav6, (err) => {
                expect(err).to.not.exist();
                listener.close(done);
            });
        });

        it("getAddrs", (done) => {
            const listener = ws.createListener((conn) => { });
            listener.listen(ma, (err) => {
                expect(err).to.not.exist();
                listener.getAddrs((err, addrs) => {
                    expect(err).to.not.exist();
                    expect(addrs[0]).to.deep.equal(ma);
                    listener.close(done);
                });
            });
        });
    });



    describe("strict", () => {
        const SERVER_PORT = 15004;

        let id1;
        let ma1;
        let l1;
        let w1;

        let id2;
        let ma2;
        let l2;
        let w2;

        before((done) => {
            map(require("./ids.json"), PeerId.createFromJSON, (err, keys) => {
                expect(err).to.not.exist();

                id1 = keys.shift();
                id2 = keys.shift();
                ma1 = multiaddr(`/ip4/127.0.0.1/tcp/${SERVER_PORT}/ws/p2p-websocket-star/ipfs/${id1.toB58String()}`);
                ma2 = multiaddr(`/ip4/127.0.0.1/tcp/${SERVER_PORT}/ws/p2p-websocket-star/ipfs/${id2.toB58String()}`);

                done();
            });
        });

        it("listen on the server", (done) => {
            w1 = new WSStar({ id: id1 });
            w2 = new WSStar({ id: id2 });

            l1 = w1.createListener((conn) => pull(conn, conn));
            l2 = w2.createListener((conn) => pull(conn, conn));

            each([
                [l1, ma1],
                [l2, ma2]
            ], (i, n) => i[0].listen(i[1], n), done);
        });

        it("dial peer 1 to peer 2", (done) => {
            w1.dial(ma2, (err, conn) => {
                expect(err).to.not.exist();
                const buf = Buffer.from("hello");

                pull(
                    pull.values([buf]),
                    conn,
                    pull.collect((err, res) => {
                        expect(err).to.not.exist();
                        expect(res).to.eql([buf]);
                        done();
                    })
                );
            });
        });
    });

    describe("valid Connection", () => {
        let ws1;
        const ma1 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5a");

        let ws2;
        const ma2 = multiaddr("/ip4/127.0.0.1/tcp/15001/ws/p2p-websocket-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo5b");

        let conn;

        before((done) => {
            const first = function (next) {
                ws1 = new WSStar({ allowJoinWithDisabledChallenge: true });

                const listener = ws1.createListener((conn) => pull(conn, conn));
                listener.listen(ma1, next);
            };

            const second = function (next) {
                ws2 = new WSStar({ allowJoinWithDisabledChallenge: true });

                const listener = ws2.createListener((conn) => pull(conn, conn));
                listener.listen(ma2, next);
            };

            const dial = function () {
                conn = ws1.dial(ma2, done);
            };

            series([first, second], dial);
        });

        it("get observed addrs", (done) => {
            conn.getObservedAddrs((err, addrs) => {
                expect(err).to.not.exist();
                expect(addrs[0].toString()).to.equal(ma2.toString());
                done();
            });
        });

        it("get Peer Info", (done) => {
            conn.getPeerInfo((err, peerInfo) => {
                expect(err).to.exist();
                done();
            });
        });

        it("set Peer Info", (done) => {
            conn.setPeerInfo("info");
            conn.getPeerInfo((err, peerInfo) => {
                expect(err).to.not.exist();
                expect(peerInfo).to.equal("info");
                done();
            });
        });
    });

    describe("utils", () => {
        const srcPath = (...args) => adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "p2p", "transports", "ws_star", ...args);
        const cleanUrlSIO = require(srcPath("utils")).cleanUrlSIO;

        const modernMultiaddrStringDNS = "/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

        const modernMultiaddrStringDNS2 = "/dns4/star-signal.cloud.ipfs.team/tcp/9999/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
        const modernMultiaddrStringDNS3 = "/dns4/star-signal.cloud.ipfs.team/tcp/80/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
        const modernMultiaddrStringDNS4 = "/dns4/star-signal.cloud.ipfs.team/tcp/8080/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

        const invalidMultiaddrStringDNS = "/dns4/star-signal.cloud.ipfs.team/udp/8080/wss/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
        const invalidMultiaddrStringDNS2 = "/dns4/star-signal.cloud.ipfs.team/tcp/8080/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";
        const invalidMultiaddrStringDNS3 = "/dns4/star-signal.cloud.ipfs.team/ws/p2p-websocket-star/ipfs/QmWxLfixekyv6GAzvDEtXfXjj7gb1z3G8i5aQNHLhw1zA1";

        // Create actual multiaddrs
        const modernMultiaddrDNS = multiaddr(modernMultiaddrStringDNS);
        const modernMultiaddrDNS2 = multiaddr(modernMultiaddrStringDNS2);
        const modernMultiaddrDNS3 = multiaddr(modernMultiaddrStringDNS3);
        const modernMultiaddrDNS4 = multiaddr(modernMultiaddrStringDNS4);

        const invalidMultiaddrDNS = multiaddr(invalidMultiaddrStringDNS);
        const invalidMultiaddrDNS2 = multiaddr(invalidMultiaddrStringDNS2);
        const invalidMultiaddrDNS3 = multiaddr(invalidMultiaddrStringDNS3);

        it("cleanUrlSIO websocket-star modern", () => {
            const newUrlSIOStringDNS = cleanUrlSIO(modernMultiaddrDNS);
            const newUrlSIOStringDNS2 = cleanUrlSIO(modernMultiaddrDNS2);
            const newUrlSIOStringDNS3 = cleanUrlSIO(modernMultiaddrDNS3);
            const newUrlSIOStringDNS4 = cleanUrlSIO(modernMultiaddrDNS4);

            expect(() => cleanUrlSIO(modernMultiaddrDNS)).to.not.throw();
            expect(() => cleanUrlSIO(invalidMultiaddrDNS)).to.throw(Error, "invalid multiaddr");
            expect(() => cleanUrlSIO(invalidMultiaddrDNS2)).to.throw(Error, "invalid multiaddr");
            expect(() => cleanUrlSIO(invalidMultiaddrDNS3)).to.throw(Error, "invalid multiaddr");

            expect(newUrlSIOStringDNS).to.equal("https://star-signal.cloud.ipfs.team");
            expect(newUrlSIOStringDNS2).to.equal("https://star-signal.cloud.ipfs.team:9999");
            expect(newUrlSIOStringDNS3).to.equal("http://star-signal.cloud.ipfs.team");
            expect(newUrlSIOStringDNS4).to.equal("http://star-signal.cloud.ipfs.team:8080");
        });
    });
});
