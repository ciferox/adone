const {
    is,
    net: { dns: { packet } }
} = adone;

const { rcodes, opcodes } = packet;

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

    const testEncoder = function (rpacket, val) {
        const buf = rpacket.encode(val);
        const val2 = rpacket.decode(buf);

        assert.equal(buf.length, rpacket.encode.bytes, "encode.bytes was set correctly");
        assert.equal(buf.length, rpacket.encodingLength(val), "encoding length matches");
        assert.ok(compare(val, val2), "decoded object match");

        const buf2 = rpacket.encode(val2);
        const val3 = rpacket.decode(buf2);

        assert.equal(buf2.length, rpacket.encode.bytes, "encode.bytes was set correctly on re-encode");
        assert.equal(buf2.length, rpacket.encodingLength(val), "encoding length matches on re-encode");

        assert.ok(compare(val, val3), "decoded object match on re-encode");
        assert.ok(compare(val2, val3), "re-encoded decoded object match on re-encode");

        const bigger = Buffer.allocUnsafe(buf2.length + 10);

        const buf3 = rpacket.encode(val, bigger, 10);
        const val4 = rpacket.decode(buf3, 10);

        assert.ok(buf3 === bigger, "echoes buffer on external buffer");
        assert.equal(rpacket.encode.bytes, buf.length, "encode.bytes is the same on external buffer");
        assert.ok(compare(val, val4), "decoded object match on external buffer");
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

    it("ns", () => {
        testEncoder(packet.ns, "ns.world.com");
    });

    it("soa", () => {
        testEncoder(packet.soa, {
            mname: "hello.world.com",
            rname: "root.hello.world.com",
            serial: 2018010400,
            refresh: 14400,
            retry: 3600,
            expire: 604800,
            minimum: 3600
        });
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
                class: "IN",
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
                class: "CH",
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
                class: "IN",
                name: "hello.a.com",
                data: "127.0.0.1"
            }, {
                type: "SRV",
                class: "IN",
                name: "hello.srv.com",
                data: {
                    port: 9090,
                    target: "hello.target.com"
                }
            }, {
                type: "CNAME",
                class: "IN",
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

    it("rcode", () => {
        const errors = ["NOERROR", "FORMERR", "SERVFAIL", "NXDOMAIN", "NOTIMP", "REFUSED", "YXDOMAIN", "YXRRSET", "NXRRSET", "NOTAUTH", "NOTZONE", "RCODE_11", "RCODE_12", "RCODE_13", "RCODE_14", "RCODE_15"];
        for (const i in errors) {
            const code = rcodes.toRcode(errors[i]);
            assert.ok(errors[i] === rcodes.toString(code), `rcode conversion from/to string matches: ${rcodes.toString(code)}`);
        }

        const ops = ["QUERY", "IQUERY", "STATUS", "OPCODE_3", "NOTIFY", "UPDATE", "OPCODE_6", "OPCODE_7", "OPCODE_8", "OPCODE_9", "OPCODE_10", "OPCODE_11", "OPCODE_12", "OPCODE_13", "OPCODE_14", "OPCODE_15"];
        for (const j in ops) {
            const ocode = opcodes.toOpcode(ops[j]);
            assert.ok(ops[j] === opcodes.toString(ocode), `opcode conversion from/to string matches: ${opcodes.toString(ocode)}`);
        }

        const buf = packet.encode({
            type: "response",
            id: 45632,
            flags: 0x8480,
            answers: [{
                type: "A",
                name: "hello.example.net",
                data: "127.0.0.1"
            }]
        });
        const val = packet.decode(buf);
        assert.ok(val.type === "response", "decode type");
        assert.ok(val.opcode === "QUERY", "decode opcode");
        assert.ok(val.flag_qr === true, "decode flag_auth");
        assert.ok(val.flag_auth === true, "decode flag_auth");
        assert.ok(val.flag_trunc === false, "decode flag_trunc");
        assert.ok(val.flag_rd === false, "decode flag_rd");
        assert.ok(val.flag_ra === true, "decode flag_ra");
        assert.ok(val.flag_z === false, "decode flag_z");
        assert.ok(val.flag_ad === false, "decode flag_ad");
        assert.ok(val.flag_cd === false, "decode flag_cd");
        assert.ok(val.rcode === "NOERROR", "decode rcode");
    });

    it("name_encoding", () => {
        let data = "foo.example.com";
        const buf = Buffer.allocUnsafe(255);
        let offset = 0;
        packet.name.encode(data, buf, offset);
        assert.ok(packet.name.encode.bytes === 17, "name encoding length matches");
        let dd = packet.name.decode(buf, offset);
        assert.ok(data === dd, "encode/decode matches");
        offset += packet.name.encode.bytes;

        data = "com";
        packet.name.encode(data, buf, offset);
        assert.ok(packet.name.encode.bytes === 5, "name encoding length matches");
        dd = packet.name.decode(buf, offset);
        assert.ok(data === dd, "encode/decode matches");
        offset += packet.name.encode.bytes;

        data = "example.com.";
        packet.name.encode(data, buf, offset);
        assert.ok(packet.name.encode.bytes === 13, "name encoding length matches");
        dd = packet.name.decode(buf, offset);
        assert.ok(data.slice(0, -1) === dd, "encode/decode matches");
        offset += packet.name.encode.bytes;

        data = ".";
        packet.name.encode(data, buf, offset);
        assert.ok(packet.name.encode.bytes === 1, "name encoding length matches");
        dd = packet.name.decode(buf, offset);
        assert.ok(data === dd, "encode/decode matches");
    });
});
