const {
    is,
    net: { dns: { packet } }
} = adone;

describe("net", "dns", "packet", () => {
    const compare = function (a, b) {
        if (is.buffer(a)) {
            return a.toString("hex") === b.toString("hex");
        }
        if (typeof a === "object" && a && b) {
            const keys = Object.keys(a);
            for (let i = 0; i < keys.length; i++) {
                if (!compare(a[keys[i]], b[keys[i]])) {
                    return false;
                }
            }
        } else {
            return a === b;
        }
        return true;
    };

    const testEncoder = function (pkt, val) {
        const buf = pkt.encode(val);
        const val2 = pkt.decode(buf);

        assert.equal(buf.length, pkt.encode.bytes, "encode.bytes was set correctly");
        assert.equal(buf.length, pkt.encodingLength(val), "encoding length matches");
        assert.isOk(compare(val, val2), "decoded object match");

        const buf2 = pkt.encode(val2);
        const val3 = pkt.decode(buf2);

        assert.equal(buf2.length, pkt.encode.bytes, "encode.bytes was set correctly on re-encode");
        assert.equal(buf2.length, pkt.encodingLength(val), "encoding length matches on re-encode");

        assert.isOk(compare(val, val3), "decoded object match on re-encode");
        assert.isOk(compare(val2, val3), "re-encoded decoded object match on re-encode");

        const bigger = Buffer.allocUnsafe(buf2.length + 10);

        const buf3 = pkt.encode(val, bigger, 10);
        const val4 = pkt.decode(buf3, 10);

        assert.isOk(buf3 === bigger, "echoes buffer on external buffer");
        assert.equal(pkt.encode.bytes, buf.length, "encode.bytes is the same on external buffer");
        assert.isOk(compare(val, val4), "decoded object match on external buffer");
    };

    it("unknown", () => {
        testEncoder(packet.unknown, Buffer.from("hello world"));
    });

    it("txt", () => {
        testEncoder(packet.txt, Buffer.allocUnsafe(0));
        testEncoder(packet.txt, Buffer.from("hello world"));
        testEncoder(packet.txt, Buffer.from([0, 1, 2, 3, 4, 5]));
    });

    it("null", () => {
        testEncoder(packet.null, Buffer.from([0, 1, 2, 3, 4, 5]));
        
    });

    it("hinfo", () => {
        testEncoder(packet.hinfo, { cpu: "intel", os: "best one" });
        
    });

    it("ptr", () => {
        testEncoder(packet.ptr, "hello.world.com");
        
    });

    it("cname", () => {
        testEncoder(packet.cname, "hello.cname.world.com");
        
    });

    it("dname", () => {
        testEncoder(packet.dname, "hello.dname.world.com");
        
    });

    it("srv", () => {
        testEncoder(packet.srv, { port: 9999, target: "hello.world.com" });
        testEncoder(packet.srv, { port: 9999, target: "hello.world.com", priority: 42, weight: 10 });
        
    });

    it("caa", () => {
        testEncoder(packet.caa, { flags: 128, tag: "issue", value: "letsencrypt.org", issuerCritical: true });
        testEncoder(packet.caa, { tag: "issue", value: "letsencrypt.org", issuerCritical: true });
        testEncoder(packet.caa, { tag: "issue", value: "letsencrypt.org" });
        
    });

    it("a", () => {
        testEncoder(packet.a, "127.0.0.1");
        
    });

    it("aaaa", () => {
        testEncoder(packet.aaaa, "fe80::1");
        
    });

    it("query", () => {
        testEncoder(packet, {
            type: "query",
            questions: [{
                type: "A",
                name: "hello.a.com"
            }, {
                type: "SRV",
                name: "hello.srv.com"
            }]
        });

        testEncoder(packet, {
            type: "query",
            id: 42,
            questions: [{
                type: "A",
                name: "hello.a.com"
            }, {
                type: "SRV",
                name: "hello.srv.com"
            }]
        });

        testEncoder(packet, {
            type: "query",
            id: 42,
            questions: [{
                type: "A",
                class: 100,
                name: "hello.a.com"
            }, {
                type: "SRV",
                name: "hello.srv.com"
            }]
        });

        
    });

    it("response", () => {
        testEncoder(packet, {
            type: "response",
            flags: packet.TRUNCATED_RESPONSE,
            answers: [{
                type: "A",
                name: "hello.a.com",
                data: "127.0.0.1"
            }, {
                type: "SRV",
                name: "hello.srv.com",
                data: {
                    port: 9090,
                    target: "hello.target.com"
                }
            }, {
                type: "CNAME",
                name: "hello.cname.com",
                data: "hello.other.domain.com"
            }]
        });

        testEncoder(packet, {
            type: "response",
            id: 100,
            flags: 0,
            additionals: [{
                type: "AAAA",
                name: "hello.a.com",
                data: "fe80::1"
            }, {
                type: "PTR",
                name: "hello.ptr.com",
                data: "hello.other.ptr.com"
            }, {
                type: "SRV",
                name: "hello.srv.com",
                ttl: 42,
                data: {
                    port: 9090,
                    target: "hello.target.com"
                }
            }],
            answers: [{
                type: "NULL",
                name: "hello.null.com",
                data: Buffer.from([1, 2, 3, 4, 5])
            }]
        });

        
    });
});
