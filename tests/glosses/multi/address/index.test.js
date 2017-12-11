const {
    data: { varint },
    multi: { address }
} = adone;

describe("multi", "address", () => {
    describe("construction", () => {
        let udpAddr;

        it("create multiaddr", () => {
            udpAddr = address.create("/ip4/127.0.0.1/udp/1234");
            assert.isTrue(udpAddr instanceof address.Multiaddr);
        });

        it("clone multiaddr", () => {
            const udpAddrClone = address.create(udpAddr);
            assert.isTrue(udpAddrClone !== udpAddr);
        });

        it("reconstruct with buffer", () => {
            assert.isFalse(address.create(udpAddr.buffer).buffer === udpAddr.buffer);
            assert.deepEqual(address.create(udpAddr.buffer).buffer, udpAddr.buffer);
        });

        it("reconstruct with string", () => {
            assert.isFalse(address.create(udpAddr.toString()).buffer === udpAddr.buffer);
            assert.deepEqual(address.create(udpAddr.toString()).buffer, udpAddr.buffer);
        });

        it("reconstruct with object", () => {
            assert.isFalse(address.create(udpAddr).buffer === udpAddr.buffer);
            assert.deepEqual(address.create(udpAddr).buffer, udpAddr.buffer);
        });

        it("empty construct still works", () => {
            assert.equal(address.create("").toString(), "/");
        });

        it("throws on non string or buffer", () => {
            assert.throws(() => address.create({}), /addr must be a string/);
        });
    });

    describe("requiring varint", () => {
        let uTPAddr;

        it("create multiaddr", () => {
            uTPAddr = address.create("/ip4/127.0.0.1/udp/1234/utp");
            assert.isTrue(uTPAddr instanceof address.Multiaddr);
        });

        it("clone multiaddr", () => {
            const uTPAddrClone = address.create(uTPAddr);
            assert.isTrue(uTPAddrClone !== uTPAddr);
        });

        it("reconstruct with buffer", () => {
            assert.isFalse(address.create(uTPAddr.buffer).buffer === uTPAddr.buffer);
            assert.deepEqual(address.create(uTPAddr.buffer).buffer, uTPAddr.buffer);
        });

        it("reconstruct with string", () => {
            assert.isFalse(address.create(uTPAddr.toString()).buffer === uTPAddr.buffer);
            assert.deepEqual(address.create(uTPAddr.toString()).buffer, uTPAddr.buffer);
        });

        it("reconstruct with object", () => {
            assert.isFalse(address.create(uTPAddr).buffer === uTPAddr.buffer);
            assert.deepEqual(address.create(uTPAddr).buffer, uTPAddr.buffer);
        });

        it("empty construct still works", () => {
            assert.equal(address.create("").toString(), "/");
        });
    });

    describe("manipulation", () => {
        it("basic", () => {
            const udpAddrStr = "/ip4/127.0.0.1/udp/1234";
            const udpAddrBuf = Buffer.from("047f0000011104d2", "hex");
            const udpAddr = address.create(udpAddrStr);

            assert.equal(udpAddr.toString(), udpAddrStr);
            assert.deepEqual(udpAddr.buffer, udpAddrBuf);

            assert.deepEqual(udpAddr.protoCodes(), [4, 17]);
            assert.deepEqual(udpAddr.protoNames(), ["ip4", "udp"]);
            assert.deepEqual(udpAddr.protos(), [address.protocols.codes[4], address.protocols.codes[17]]);
            assert.isFalse(udpAddr.protos()[0] === address.protocols.codes[4]);

            const udpAddrBuf2 = udpAddr.encapsulate("/udp/5678");
            assert.equal(udpAddrBuf2.toString(), "/ip4/127.0.0.1/udp/1234/udp/5678");
            assert.equal(udpAddrBuf2.decapsulate("/udp").toString(), "/ip4/127.0.0.1/udp/1234");
            assert.equal(udpAddrBuf2.decapsulate("/ip4").toString(), "/");
            assert.throws(() => {
                udpAddr.decapsulate("/").toString();
            });
            assert.equal(address.create("/").encapsulate(udpAddr).toString(), udpAddr.toString());
            assert.equal(address.create("/").decapsulate("/").toString(), "/");
        });

        it("ipfs", () => {
            const ipfsAddr = address.create("/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");
            const ip6Addr = address.create("/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095");
            const tcpAddr = address.create("/tcp/8000");
            const webAddr = address.create("/ws");

            assert.equal(address.create("/")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(webAddr)
                .encapsulate(ipfsAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), webAddr.toString(), ipfsAddr.toString()].join(""));

            assert.equal(address.create("/")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(webAddr)
                .encapsulate(ipfsAddr)
                .decapsulate(ipfsAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), webAddr.toString()].join(""));

            assert.equal(address.create("/")
                .encapsulate(ip6Addr)
                .encapsulate(tcpAddr)
                .encapsulate(ipfsAddr)
                .encapsulate(webAddr)
                .decapsulate(webAddr)
                .toString(), [ip6Addr.toString(), tcpAddr.toString(), ipfsAddr.toString()].join(""));
        });
    });

    describe("variants", () => {
        it("ip4", () => {
            const str = "/ip4/127.0.0.1";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp", () => {
            const str = "/ip4/127.0.0.1/tcp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + udp", () => {
            const str = "/ip4/127.0.0.1/udp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + udp", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/udp/5000";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + ipfs", () => {
            const str = "/ip4/127.0.0.1/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC/tcp/1234";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + ipfs", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC/tcp/1234";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it.skip("ip4 + dccp", () => { });
        it.skip("ip6 + dccp", () => { });

        it.skip("ip4 + sctp", () => { });
        it.skip("ip6 + sctp", () => { });

        it("ip4 + udp + utp", () => {
            const str = "/ip4/127.0.0.1/udp/5000/utp";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + udp + utp", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/udp/5000/utp";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.protoNames());
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + http", () => {
            const str = "/ip4/127.0.0.1/tcp/8000/http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + http", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/8000/http";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + https", () => {
            const str = "/ip4/127.0.0.1/tcp/8000/https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + https", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/8000/https";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip4 + tcp + websockets", () => {
            const str = "/ip4/127.0.0.1/tcp/8000/ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + websockets", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/8000/ws";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ip6 + tcp + websockets + ipfs", () => {
            const str = "/ip6/2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095/tcp/8000/ws/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("ipfs", () => {
            const str = "/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-circuit", () => {
            const str = "/p2p-circuit/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-circuit ipfs", () => {
            const str = "/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC/p2p-circuit";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-webrtc-star", () => {
            const str = "/ip4/127.0.0.1/tcp/9090/ws/p2p-webrtc-star/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-webrtc-direct", () => {
            const str = "/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });

        it("p2p-websocket-star", () => {
            const str = "/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star";
            const addr = address.create(str);
            expect(addr).to.have.property("buffer");
            expect(addr.toString()).to.equal(str);
        });
    });

    describe("helpers", () => {
        describe(".toOptions", () => {
            it("returns a well formed options object", () => {
                expect(address.create("/ip4/0.0.0.0/tcp/1234").toOptions())
                    .to.eql({
                        family: "ipv4",
                        host: "0.0.0.0",
                        transport: "tcp",
                        port: "1234"
                    });
            });
        });

        describe(".inspect", () => {
            it("renders the buffer as hex", () => {
                expect(address.create("/ip4/0.0.0.0/tcp/1234").inspect())
                    .to.eql("<Multiaddr 04000000000604d2 - /ip4/0.0.0.0/tcp/1234>");
            });
        });

        describe(".protos", () => {
            it("returns a list of all protocols in the address", () => {
                expect(address.create("/ip4/0.0.0.0/utp").protos())
                    .to.eql([{
                        code: 4,
                        name: "ip4",
                        size: 32,
                        resolvable: false
                    }, {
                        code: 302,
                        name: "utp",
                        size: 0,
                        resolvable: false
                    }]);
            });

            it("works with ipfs", () => {
                expect(
                    address.create("/ip4/0.0.0.0/utp/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC").protos()
                ).to.be.eql([{
                    code: 4,
                    name: "ip4",
                    size: 32,
                    resolvable: false
                }, {
                    code: 302,
                    name: "utp",
                    size: 0,
                    resolvable: false
                }, {
                    code: 421,
                    name: "ipfs",
                    size: -1,
                    resolvable: false
                }]);
            });
        });

        describe(".tuples", () => {
            it("returns the tuples", () => {
                expect(address.create("/ip4/0.0.0.0/utp").tuples())
                    .to.eql([
                        [4, Buffer.from([0, 0, 0, 0])],
                        [302]
                    ]);
            });
        });

        describe(".stringTuples", () => {
            it("returns the string partss", () => {
                expect(address.create("/ip4/0.0.0.0/utp").stringTuples())
                    .to.eql([
                        [4, "0.0.0.0"],
                        [302]
                    ]);
            });
        });

        describe(".decapsulate", () => {
            it("throws on address with no matching subaddress", () => {
                expect(
                    () => address.create("/ip4/127.0.0.1").decapsulate("/ip4/198.168.0.0")
                ).to.throw(/does not contain subaddress/);
            });
        });

        describe(".equals", () => {
            it("returns true for equal addresses", () => {
                const addr1 = address.create("/ip4/192.168.0.1");
                const addr2 = address.create("/ip4/192.168.0.1");

                expect(addr1.equals(addr2)).to.equal(true);
            });

            it("returns false for non equal addresses", () => {
                const addr1 = address.create("/ip4/192.168.1.1");
                const addr2 = address.create("/ip4/192.168.0.1");

                expect(addr1.equals(addr2)).to.equal(false);
            });
        });

        describe(".nodeAddress", () => {
            it("throws on non thinWaistAddress", () => {
                expect(
                    () => address.create("/ip4/192.168.0.1/utp").nodeAddress()
                ).to.throw(/thin waist/);
            });

            it("returns a node friendly address", () => {
                expect(
                    address.create("/ip4/192.168.0.1/tcp/1234").nodeAddress()
                ).to.be.eql({
                    address: "192.168.0.1",
                    family: "IPv4",
                    port: "1234"
                });
            });
        });

        describe(".fromNodeAddress", () => {
            it("throws on missing address object", () => {
                expect(
                    () => address.fromNodeAddress()
                ).to.throw(/requires node address/);
            });

            it("throws on missing transport", () => {
                expect(
                    () => address.fromNodeAddress({ address: "0.0.0.0" })
                ).to.throw(/requires transport protocol/);
            });

            it("parses a node address", () => {
                expect(
                    address.fromNodeAddress({
                        address: "192.168.0.1",
                        family: "IPv4",
                        port: "1234"
                    }, "tcp").toString()
                ).to.be.eql("/ip4/192.168.0.1/tcp/1234");
            });
        });

        describe(".isThinWaistAddress", () => {
            const families = ["ip4", "ip6"];
            const transports = ["tcp", "udp"];
            const addresses = {
                ip4: "192.168.0.1",
                ip6: "2001:8a0:7ac5:4201:3ac9:86ff:fe31:7095"
            };
            families.forEach((family) => {
                transports.forEach((transport) => {
                    it(`returns true for ${family}-${transport}`, () => {
                        expect(
                            address.create(
                                `${family}/${addresses[family]}/${transport}/1234`
                            ).isThinWaistAddress()
                        ).to.be.eql(true);
                    });
                });
            });

            it("returns false for two protocols not using {IPv4, IPv6}/{TCP, UDP}", () => {
                expect(
                    address.create("/ip4/192.168.0.1/utp").isThinWaistAddress()
                ).to.be.eql(false);

                expect(
                    address.create("/sctp/192.168.0.1/tcp/1234").isThinWaistAddress()
                ).to.be.eql(false);

                expect(
                    address.create("/http/utp").isThinWaistAddress()
                ).to.be.eql(false);
            });

            it("returns false for more than two protocols", () => {
                expect(
                    address.create("/ip4/0.0.0.0/tcp/1234/utp").isThinWaistAddress()
                ).to.be.eql(false);
            });
        });

        describe(".fromStupidString", () => {
            it("parses an address in the format <proto><IPv>://<IP Addr>[:<proto port>]", () => {
                expect(
                    () => address.create("/").fromStupidString()
                ).to.throw(/Not Implemented/);
            });
        });

        describe(".getPeerId should parse id from multiaddr", () => {
            it("parses extracts the peer Id from a multiaddr", () => {
                expect(
                    address.create("/p2p-circuit/ipfs/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC").getPeerId()
                ).to.equal("QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSupNKC");
            });
        });

        describe(".getPeerId should return null on missing peer id in multiaddr", () => {
            it("parses extracts the peer Id from a multiaddr", () => {
                assert.isNull(address.create("/ip4/0.0.0.0/tcp/1234/utp").getPeerId());
            });
        });

        describe("address.isMultiaddr", () => {
            it("handles different inputs", () => {
                expect(address.isMultiaddr(address.create("/"))).to.be.eql(true);
                expect(address.isMultiaddr("/")).to.be.eql(false);
                expect(address.isMultiaddr(123)).to.be.eql(false);

                expect(address.isMultiaddr(Buffer.from("/hello"))).to.be.eql(false);
            });
        });

        describe("resolvable multiaddrs", () => {
            describe(".isName", () => {
                it("valid name dns", () => {
                    const str = "/dns/ipfs.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("valid name dns4", () => {
                    const str = "/dns4/ipfs.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("valid name dns6", () => {
                    const str = "/dns6/ipfs.io";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(true);
                });

                it("invalid name", () => {
                    const str = "/ip4/127.0.0.1";
                    const addr = address.create(str);
                    expect(address.isName(addr)).to.equal(false);
                });
            });

            describe(".resolve", () => {
                it.skip("valid and active DNS name", (done) => { });
                it.skip("valid but inactive DNS name", (done) => { });
                it("invalid DNS name", (done) => {
                    const str = "/ip4/127.0.0.1";
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
                expect(
                    () => address.protocols(1234)
                ).to.throw(/no protocol with code/);
            });

            it("string", () => {
                expect(
                    () => address.protocols("hello")
                ).to.throw(/no protocol with name/);
            });

            it("else", () => {
                expect(
                    () => address.protocols({ hi: 34 })
                ).to.throw(/invalid protocol id type/);
            });
        });
    });

    describe("convert", () => {
        it("handles buffers", () => {
            expect(
                address.convert("ip4", Buffer.from("c0a80001", "hex"))
            ).to.be.eql("192.168.0.1");
        });

        it("handles strings", () => {
            expect(
                address.convert("ip4", "192.168.0.1")
            ).to.be.eql(Buffer.from("c0a80001", "hex"));
        });

        describe(".toBuffer", () => {
            it("defaults to hex conversion", () => {
                expect(
                    address.toBuffer("ws", "c0a80001")
                ).to.be.eql(Buffer.from([192, 168, 0, 1]));
            });
        });

        describe(".toString", () => {
            it("throws on inconsistent ipfs links", () => {
                const valid = Buffer.from("03221220d52ebb89d85b02a284948203a62ff28389c57c9f42beec4ec20db76a68911c0b", "hex");
                expect(
                    () => address.toString("ipfs", valid.slice(0, valid.length - 8))
                ).to.throw(/inconsistent length/);
            });

            it("defaults to hex conversion", () => {
                expect(
                    address.toString("ws", Buffer.from([192, 168, 0, 1]))
                ).to.be.eql("c0a80001");
            });
        });
    });

    describe("codec", () => {
        describe(".stringToStringTuples", () => {
            it("throws on invalid addresses", () => {
                expect(
                    () => address.codec.stringToStringTuples("/ip4/0.0.0.0/ip4")
                ).to.throw(/invalid address/);
            });
        });

        describe(".stringTuplesToTuples", () => {
            it("handles non array tuples", () => {
                expect(
                    address.codec.stringTuplesToTuples([["ip4", "0.0.0.0"], "utp"])
                ).to.be.eql(
                    [[4, Buffer.from([0, 0, 0, 0])], [302]]
                    );
            });
        });

        describe(".tuplesToStringTuples", () => {
            it("single element tuples", () => {
                expect(
                    address.codec.tuplesToStringTuples([[302]])
                ).to.be.eql([[302]]);
            });
        });

        describe(".bufferToTuples", () => {
            it("throws on invalid address", () => {
                expect(() => address.codec.bufferToTuples(address.codec.tuplesToBuffer([[4, Buffer.from("192")]]))).to.throw(/Invalid address buffer/);
            });
        });

        describe(".fromBuffer", () => {
            it("throws on invalid buffer", () => {
                expect(
                    () => address.codec.fromBuffer(Buffer.from("hello/world"))
                ).to.throw();
            });
        });

        describe(".isValidBuffer", () => {
            it("returns true for valid buffers", () => {
                expect(
                    address.codec.isValidBuffer(Buffer.from(varint.encode(302)))
                ).to.be.eql(true);
            });

            it("returns false for invalid buffers", () => {
                expect(
                    address.codec.isValidBuffer(Buffer.from(varint.encode(1234)))
                ).to.be.eql(false);
            });
        });
    });
});
