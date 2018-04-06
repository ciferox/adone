const {
    is,
    data: { varint },
    multi: { address }
} = adone;

describe("multi", "address", () => {
    const port2buf = (port) => {
        if (is.string(port)) {
            port = parseInt(port);
        }
        const buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(port, 0);
        return buf;
    };

    describe("construction", () => {
        let udpAddr;

        const protocols = [
            "tcp",
            "sctp",
            "dccp",
            "udp",
            "udt",
            "utp",
            "quic"
        ];

        for (const prot of protocols) {
            // eslint-disable-next-line
            describe(prot, () => {
                it("create multiaddr", () => {
                    udpAddr = address.create(`//ip4/127.0.0.1//${prot}/1234`);
                    assert.true(udpAddr instanceof address.Multiaddr);
                });

                it("clone multiaddr", () => {
                    const udpAddrClone = address.create(udpAddr);
                    assert.true(udpAddrClone !== udpAddr);
                });

                it("reconstruct with buffer", () => {
                    assert.false(address.create(udpAddr.buffer).buffer === udpAddr.buffer);
                    assert.deepEqual(address.create(udpAddr.buffer).buffer, udpAddr.buffer);
                });

                it("reconstruct with string", () => {
                    assert.false(address.create(udpAddr.toString()).buffer === udpAddr.buffer);
                    assert.deepEqual(address.create(udpAddr.toString()).buffer, udpAddr.buffer);
                });

                it("reconstruct with object", () => {
                    assert.false(address.create(udpAddr).buffer === udpAddr.buffer);
                    assert.deepEqual(address.create(udpAddr).buffer, udpAddr.buffer);
                });

                it("empty construct still works", () => {
                    assert.equal(address.create("").toString(), "//");
                });
            });
        }

        it("null/undefined construct still works", () => {
            assert.equal(address.create().toString(), "//");
            assert.equal(address.create(null).toString(), "//");
            assert.equal(address.create(undefined).toString(), "//");
        });

        it("throws on truthy non string or buffer", () => {
            const errRegex = /Address must be a string/;
            assert.throws(() => address.create({}), errRegex);
            assert.throws(() => address.create([]), errRegex);
            assert.throws(() => address.create(138), errRegex);
            assert.throws(() => address.create(true), errRegex);
        });

        it("throws on falsy non string or buffer", () => {
            const errRegex = /Address must be a string/;
            assert.throws(() => address.create(NaN), errRegex);
            assert.throws(() => address.create(false), errRegex);
            assert.throws(() => address.create(0), errRegex);
        });
    });

    describe("manipulation", () => {
        it("basic", () => {
            const udpAddrStr = "//ip4/127.0.0.1//udp/1234";
            const udpAddrBuf = Buffer.from("047f0000010704d2", "hex");
            const udpAddr = address.create(udpAddrStr);

            assert.equal(udpAddr.toString(), udpAddrStr);
            assert.deepEqual(udpAddr.buffer, udpAddrBuf);

            assert.deepEqual(udpAddr.protoCodes(), [4, 7]);
            assert.deepEqual(udpAddr.protoNames(), ["ip4", "udp"]);
            assert.deepEqual(udpAddr.protos(), [address.protocols.codes[4], address.protocols.codes[7]]);
            assert.false(udpAddr.protos()[0] === address.protocols.codes[4]);

            const udpAddrBuf2 = udpAddr.encapsulate("//udp/5678");
            assert.equal(udpAddrBuf2.toString(), "//ip4/127.0.0.1//udp/1234//udp/5678");
            assert.equal(udpAddrBuf2.decapsulate("//udp").toString(), "//ip4/127.0.0.1//udp/1234");
            assert.equal(udpAddrBuf2.decapsulate("//ip4").toString(), "//");
            assert.equal(address.create("//").encapsulate(udpAddr).toString(), udpAddr.toString());
            assert.equal(address.create("//").decapsulate("//").toString(), "//");
        });

        it("p2p", () => {
            const p2pAddr = address.create("//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");
            const ip6Addr = address.create("//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095");
            const tcpAddr = address.create("//tcp/8000");
            const webAddr = address.create("//ws");

            assert.equal(address.create("//")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(webAddr)
                .encapsulate(p2pAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), webAddr.toString(), p2pAddr.toString()].join(""));

            assert.equal(address.create("//")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(webAddr)
                .encapsulate(p2pAddr)
                .decapsulate(p2pAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), webAddr.toString()].join(""));

            assert.equal(address.create("//")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(p2pAddr)
                .encapsulate(webAddr)
                .decapsulate(webAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), p2pAddr.toString()].join(""));
        });
    });

    describe("variants", () => {
        it("ip4", () => {
            const str = "//ip4/127.0.0.1";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp", () => {
            const str = "//ip4/127.0.0.1//tcp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//tcp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + udp", () => {
            const str = "//ip4/127.0.0.1//udp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + udp", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//udp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + p2p", () => {
            const str = "//ip4/127.0.0.1//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC//tcp/1234";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + p2p", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC//tcp/1234";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("unix", () => {
            const str = "//unix/home/user/inhost.sock";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("winpipe", () => {
            const str = "//winpipe/\\\\.\\pipe\\realm\\inhost.sock";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it.skip("ip4 + dccp", () => { });
        it.skip("ip6 + dccp", () => { });

        it.skip("ip4 + sctp", () => { });
        it.skip("ip6 + sctp", () => { });

        it("ip4 + utp", () => {
            const str = "//ip4/127.0.0.1//utp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + utp", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//utp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.protoNames());
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + http", () => {
            const str = "//ip4/127.0.0.1//tcp/8000//http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + http", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//tcp/8000//http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("unix + http", () => {
            const str = "//unix/home/user/inhost.sock//http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("winpipe + http", () => {
            const str = "//winpipe/\\\\.\\pipe\\realm\\inhost.sock//http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + https", () => {
            const str = "//ip4/127.0.0.1//tcp/8000//https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + https", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//tcp/8000//https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("unix + https", () => {
            const str = "//unix/home/user/inhost.sock//https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("winpipe + https", () => {
            const str = "//winpipe/\\\\.\\pipe\\realm\\inhost.sock//https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + websockets", () => {
            const str = "//ip4/127.0.0.1//tcp/8000//ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + websockets", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//tcp/8000//ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("unix + websockets", () => {
            const str = "//unix/home/user/inhost.sock//ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("winpipe + websockets", () => {
            const str = "//winpipe/\\\\.\\pipe\\realm\\inhost.sock//ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + websockets + p2p", () => {
            const str = "//ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095//tcp/8000//ws//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("unix + secure websockets + p2p", () => {
            const str = "//unix/home/user/inhost.sock//wss//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("winpipe + secure websockets + p2p", () => {
            const str = "//winpipe/\\\\.\\pipe\\realm\\inhost.sock//wss//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p", () => {
            const str = "//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-circuit", () => {
            const str = "//p2p-circuit//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-circuit p2p", () => {
            const str = "//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC//p2p-circuit";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-webrtc-star", () => {
            const str = "//ip4/127.0.0.1//tcp/9090//ws//p2p-webrtc-star//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-webrtc-direct", () => {
            const str = "//ip4/127.0.0.1//tcp/9090//http//p2p-webrtc-direct";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-websocket-star", () => {
            const str = "//ip4/127.0.0.1//tcp/9090//ws//p2p-websocket-star";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });
    });

    describe("helpers", () => {
        describe(".toOptions", () => {
            it("returns a well formed options object", () => {
                expect(address.create("//ip4/0.0.0.0//tcp/1234").toOptions()).to.eql({
                    family: "ipv4",
                    host: "0.0.0.0",
                    transport: "tcp",
                    port: "1234"
                });
            });
        });

        describe("inspect()", () => {
            it("renders the buffer as hex", () => {
                expect(address.create("//ip4/0.0.0.0//tcp/1234").inspect()).to.eql("<Multiaddr 04000000000604d2 - //ip4/0.0.0.0//tcp/1234>");
            });
        });

        describe("protos()", () => {
            it("returns a list of all protocols in the address", () => {
                expect(address.create("//ip4/0.0.0.0//utp/1234").protos()).to.eql([{
                    code: 4,
                    name: "ip4",
                    size: 32,
                    resolvable: false
                }, {
                    code: 18,
                    name: "utp",
                    size: 16,
                    resolvable: false
                }]);
            });

            it("works with p2p", () => {
                expect(address.create("//ip4/0.0.0.0//utp/1234//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC").protos()).to.be.eql([{
                    code: 4,
                    name: "ip4",
                    size: 32,
                    resolvable: false
                }, {
                    code: 18,
                    name: "utp",
                    size: 16,
                    resolvable: false
                }, {
                    code: 420,
                    name: "p2p",
                    size: -1,
                    resolvable: false
                }]);
            });
        });

        describe("tuples()", () => {
            it("returns the tuples", () => {
                expect(address.create("//ip4/0.0.0.0//utp/1234").tuples()).to.eql([
                    [4, Buffer.from([0, 0, 0, 0])],
                    [18, port2buf(1234)]
                ]);
            });
        });

        describe("stringTuples()", () => {
            it("returns the string partss", () => {
                expect(address.create("//ip4/0.0.0.0//utp/1234").stringTuples()).to.eql([
                    [4, "0.0.0.0"],
                    [18, 1234]
                ]);
            });
        });

        describe("decapsulate()", () => {
            it("throws on address with no matching subaddress", () => {
                expect(() => address.create("//ip4/127.0.0.1").decapsulate("//ip4/198.168.0.0")).to.throw(/does not contain subaddress/);
            });
        });

        describe("equals()", () => {
            it("returns true for equal addresses", () => {
                const addr1 = address.create("//ip4/192.168.0.1");
                const addr2 = address.create("//ip4/192.168.0.1");

                expect(addr1.equals(addr2)).to.equal(true);
            });

            it("returns false for non equal addresses", () => {
                const addr1 = address.create("//ip4/192.168.1.1");
                const addr2 = address.create("//ip4/192.168.0.1");

                expect(addr1.equals(addr2)).to.equal(false);
            });
        });

        describe("nodeAddress()", () => {
            it("throws on non thinWaistAddress", () => {
                expect(() => address.create("//ip4/192.168.0.1//ws").nodeAddress()).to.throw(/thin waist/);
            });

            it("returns a node friendly address", () => {
                expect(address.create("//ip4/192.168.0.1//tcp/1234").nodeAddress()).to.be.eql({
                    address: "192.168.0.1",
                    family: "IPv4",
                    port: "1234"
                });
            });

            it("returns a node friendly address for unix socket", () => {
                expect(address.create("//unix/home/user/inhost.sock").nodeAddress()).to.be.eql({
                    path: "/home/user/inhost.sock"
                });
            });

            it("returns a node friendly address for windows pipe", () => {
                expect(address.create("//winpipe/\\\\.\\pipe\\realm\\inhost.sock").nodeAddress()).to.be.eql({
                    path: "\\\\.\\pipe\\realm\\inhost.sock"
                });
            });
        });

        describe("fromNodeAddress()", () => {
            it("throws on missing address object", () => {
                expect(() => address.fromNodeAddress()).to.throw(/Requires node address/);
            });

            it("throws on missing transport", () => {
                expect(() => address.fromNodeAddress({ address: "0.0.0.0" })).to.throw(/Requires transport protocol/);
            });

            it("parses a node address", () => {
                expect(
                    address.fromNodeAddress({
                        address: "192.168.0.1",
                        family: "IPv4",
                        port: "1234"
                    }, "tcp").toString()
                ).to.be.eql("//ip4/192.168.0.1//tcp/1234");
            });

            it("parses a node address (unix socket)", () => {
                expect(
                    address.fromNodeAddress({
                        path: "/home/user/inhost.sock"
                    }).toString()
                ).to.be.eql("//unix/home/user/inhost.sock");
            });

            it("parses a node address (windows pipe)", () => {
                expect(
                    address.fromNodeAddress({
                        path: "\\\\.\\pipe\\realm\\inhost.sock"
                    }).toString()
                ).to.be.eql("//winpipe/\\\\.\\pipe\\realm\\inhost.sock");
            });
        });

        describe("isThinWaistAddress()", () => {
            const families = ["ip4", "ip6"];
            const transports = ["tcp", "udp"];
            const addresses = {
                ip4: "192.168.0.1",
                ip6: "2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095"
            };
            families.forEach((family) => {
                transports.forEach((transport) => {
                    it(`returns true for ${family}-${transport}`, () => {
                        expect(address.create(`${family}/${addresses[family]}//${transport}/1234`).isThinWaistAddress()).to.be.eql(true);
                    });
                });
            });

            it("returns false for two protocols not using {IPv4, IPv6}/{TCP, UDP}", () => {
                expect(address.create("//ip4/192.168.0.1//wss").isThinWaistAddress()).to.be.eql(false);

                expect(address.create("//sctp/192.168.0.1//tcp/1234").isThinWaistAddress()).to.be.eql(false);

                expect(address.create("//http//ws").isThinWaistAddress()).to.be.eql(false);
            });

            it("returns false for more than two protocols", () => {
                expect(address.create("//ip4/0.0.0.0//tcp/1234//wss").isThinWaistAddress()).to.be.eql(false);
            });
        });

        describe("fromStupidString()", () => {
            it("parses an address in the format <proto><IPv>://<IP Addr>[:<proto port>]", () => {
                expect(() => address.create("//").fromStupidString()).to.throw(/Not Implemented/);
            });
        });

        describe("getPeerId() should parse id from multiaddr", () => {
            it("parses extracts the peer Id from a multiaddr", () => {
                expect(address.create("//p2p-circuit//p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC").getPeerId()).to.equal("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");
            });
        });

        describe("getPeerId() should return null on missing peer id in multiaddr", () => {
            it("parses extracts the peer Id from a multiaddr", () => {
                assert.null(address.create("//ip4/0.0.0.0//utp/1234//wss").getPeerId());
            });
        });

        describe("is.multiAddress()", () => {
            it("handles different inputs", () => {
                expect(is.multiAddress(address.create("//"))).to.be.eql(true);
                expect(is.multiAddress("/")).to.be.eql(false);
                expect(is.multiAddress(123)).to.be.eql(false);

                expect(is.multiAddress(Buffer.from("//hello"))).to.be.eql(false);
            });
        });

        describe("resolvable multiaddrs", () => {
            describe("isName()", () => {
                it("valid name dns", () => {
                    const str = "//dns/adone.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("valid name dns4", () => {
                    const str = "//dns4/adone.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("valid name dns6", () => {
                    const str = "//dns6/adone.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("invalid name", () => {
                    const str = "//ip4/127.0.0.1";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(false);
                });
            });

            describe("resolve()", () => {
                it.skip("valid and active DNS name", (done) => { });
                it.skip("valid but inactive DNS name", (done) => { });
                it("invalid DNS name", (done) => {
                    const str = "//ip4/127.0.0.1";
                    const addr = address.create(str);
                    address.resolve(addr, (err, multiaddrs) => {
                        assert.exists(err);
                        done();
                    });
                });
            });
        });
    });

    describe("protocols", () => {
        describe("throws on non existent protocol", () => {
            it("number", () => {
                expect(() => address.protocols(1234)).to.throw(adone.error.Unknown);
            });

            it("string", () => {
                expect(() => address.protocols("hello")).to.throw(adone.error.Unknown);
            });

            it("else", () => {
                expect(() => address.protocols({ hi: 34 })).to.throw(adone.error.NotValid);
            });
        });
    });

    describe("convert", () => {
        it("handles ip4 buffers", () => {
            expect(address.convert("ip4", Buffer.from("c0a80001", "hex"))).to.be.eql("192.168.0.1");
        });

        it("handles ip6 buffers", () => {
            expect(address.convert("ip6", Buffer.from("abcd0000000100020003000400050006", "hex"))).to.eql("abcd:0:1:2:3:4:5:6");
        });

        it("handles ipv6 strings", () => {
            expect(address.convert("ip6", "ABCD::1:2:3:4:5:6")).to.eql(Buffer.from("ABCD0000000100020003000400050006", "hex"));
        });

        it("handles ip4 strings", () => {
            expect(address.convert("ip4", "192.168.0.1")).to.be.eql(Buffer.from("c0a80001", "hex"));
        });

        it("throws on invalid ip4 conversion", () => {
            expect(() => address.convert("ip4", "555.168.0.1")).to.throw(/Invalid ip address/);
        });

        it("throws on invalid ip6 conversion", () => {
            expect(() => address.convert("ip6", "FFFF::GGGG")).to.throw(/Invalid ip address/);
        });

        describe("toBuffer()", () => {
            it("defaults to hex conversion", () => {
                expect(address.toBuffer("ws", "c0a80001")).to.be.eql(Buffer.from([192, 168, 0, 1]));
            });
        });

        describe("toString()", () => {
            it("throws on inconsistent p2p links", () => {
                const valid = Buffer.from("03221220d52ebb89d85b02a284948203a62ff28389c57c9f42beec4ec20db76a68911c0b", "hex");
                expect(
                    () => address.toString("p2p", valid.slice(0, valid.length - 8))
                ).to.throw(/inconsistent length/);
            });

            it("defaults to hex conversion", () => {
                expect(address.toString("ws", Buffer.from([192, 168, 0, 1]))).to.be.eql("c0a80001");
            });
        });
    });

    describe("codec", () => {
        describe("stringToStringTuples()", () => {
            it("throws on invalid addresses", () => {
                expect(() => address.codec.stringToStringTuples("//ip4/0.0.0.0//ip4")).to.throw(/Invalid address/);
            });
        });

        describe("stringTuplesToTuples()", () => {
            it("handles non array tuples", () => {
                expect(address.codec.stringTuplesToTuples([["ip4", "0.0.0.0"], "ws"])).to.be.eql([[4, Buffer.from([0, 0, 0, 0])], [477]]);
            });
        });

        describe("tuplesToStringTuples()", () => {
            it("single element tuples", () => {
                expect(address.codec.tuplesToStringTuples([[480]])).to.be.eql([[480]]);
            });
        });

        describe("bufferToTuples()", () => {
            it("throws on invalid address", () => {
                expect(() => address.codec.bufferToTuples(address.codec.tuplesToBuffer([[4, Buffer.from("192")]]))).to.throw(/Invalid address buffer/);
            });
        });

        describe("fromBuffer()", () => {
            it("throws on invalid buffer", () => {
                expect(() => address.codec.fromBuffer(Buffer.from("hello/world"))).to.throw();
            });
        });

        describe("isValidBuffer()", () => {
            it("returns true for valid buffers", () => {
                expect(address.codec.isValidBuffer(Buffer.from(varint.encode(480)))).to.be.eql(true);
            });

            it("returns false for invalid buffers", () => {
                expect(address.codec.isValidBuffer(Buffer.from(varint.encode(1234)))).to.be.eql(false);
            });
        });
    });
});
