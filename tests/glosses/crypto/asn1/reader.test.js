describe("crypto", "asn1", "ber", "reader", () => {
    const { crypto: { asn1: { ber: { Reader: BerReader } } } } = adone;

    it("load library", () => {
        assert.isOk(BerReader);
        try {
            new BerReader();
            assert.fail("Should have thrown");
        } catch (e) {
            assert.isOk(e instanceof TypeError, "Should have been a type error");
        }
    });


    it("read byte", () => {
        const reader = new BerReader(Buffer.from([0xde]));
        assert.isOk(reader);
        assert.equal(reader.readByte(), 0xde, "wrong value");
    });


    it("read 1 byte int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x01, 0x03]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), 0x03, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("read 2 byte int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x02, 0x7e, 0xde]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), 0x7ede, "wrong value");
        assert.equal(reader.length, 0x02, "wrong length");
    });


    it("read 3 byte int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x03, 0x7e, 0xde, 0x03]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), 0x7ede03, "wrong value");
        assert.equal(reader.length, 0x03, "wrong length");
    });


    it("read 4 byte int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x04, 0x7e, 0xde, 0x03, 0x01]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), 0x7ede0301, "wrong value");
        assert.equal(reader.length, 0x04, "wrong length");
    });


    it("read 1 byte negative int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x01, 0xdc]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), -36, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("read 2 byte negative int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x02, 0xc0, 0x4e]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), -16306, "wrong value");
        assert.equal(reader.length, 0x02, "wrong length");
    });


    it("read 3 byte negative int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x03, 0xff, 0x00, 0x19]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), -65511, "wrong value");
        assert.equal(reader.length, 0x03, "wrong length");
    });


    it("read 4 byte negative int", () => {
        const reader = new BerReader(Buffer.from([0x02, 0x04, 0x91, 0x7c, 0x22, 0x1f]));
        assert.isOk(reader);
        assert.equal(reader.readInt(), -1854135777, "wrong value");
        assert.equal(reader.length, 0x04, "wrong length");
    });


    it("read boolean true", () => {
        const reader = new BerReader(Buffer.from([0x01, 0x01, 0xff]));
        assert.isOk(reader);
        assert.equal(reader.readBoolean(), true, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("read boolean false", () => {
        const reader = new BerReader(Buffer.from([0x01, 0x01, 0x00]));
        assert.isOk(reader);
        assert.equal(reader.readBoolean(), false, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("read enumeration", () => {
        const reader = new BerReader(Buffer.from([0x0a, 0x01, 0x20]));
        assert.isOk(reader);
        assert.equal(reader.readEnumeration(), 0x20, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("read string", () => {
        const dn = "cn=foo,ou=unit,o=it";
        const buf = Buffer.alloc(dn.length + 2);
        buf[0] = 0x04;
        buf[1] = Buffer.byteLength(dn);
        buf.write(dn, 2);
        const reader = new BerReader(buf);
        assert.isOk(reader);
        assert.equal(reader.readString(), dn, "wrong value");
        assert.equal(reader.length, dn.length, "wrong length");
    });


    it("read sequence", () => {
        const reader = new BerReader(Buffer.from([0x30, 0x03, 0x01, 0x01, 0xff]));
        assert.isOk(reader);
        assert.equal(reader.readSequence(), 0x30, "wrong value");
        assert.equal(reader.length, 0x03, "wrong length");
        assert.equal(reader.readBoolean(), true, "wrong value");
        assert.equal(reader.length, 0x01, "wrong length");
    });


    it("anonymous LDAPv3 bind", () => {
        const BIND = Buffer.alloc(14);
        BIND[0] = 0x30; // Sequence
        BIND[1] = 12; // len
        BIND[2] = 0x02; // ASN.1 Integer
        BIND[3] = 1; // len
        BIND[4] = 0x04; // msgid (make up 4)
        BIND[5] = 0x60; // Bind Request
        BIND[6] = 7; // len
        BIND[7] = 0x02; // ASN.1 Integer
        BIND[8] = 1; // len
        BIND[9] = 0x03; // v3
        BIND[10] = 0x04; // String (bind dn)
        BIND[11] = 0; // len
        BIND[12] = 0x80; // ContextSpecific (choice)
        BIND[13] = 0; // simple bind

        // Start testing ^^
        const ber = new BerReader(BIND);
        assert.equal(ber.readSequence(), 48, "Not an ASN.1 Sequence");
        assert.equal(ber.length, 12, "Message length should be 12");
        assert.equal(ber.readInt(), 4, "Message id should have been 4");
        assert.equal(ber.readSequence(), 96, "Bind Request should have been 96");
        assert.equal(ber.length, 7, "Bind length should have been 7");
        assert.equal(ber.readInt(), 3, "LDAP version should have been 3");
        assert.equal(ber.readString(), "", "Bind DN should have been empty");
        assert.equal(ber.length, 0, "string length should have been 0");
        assert.equal(ber.readByte(), 0x80, "Should have been ContextSpecific (choice)");
        assert.equal(ber.readByte(), 0, "Should have been simple bind");
        assert.equal(null, ber.readByte(), "Should be out of data");
    });


    it("long string", () => {
        const buf = Buffer.alloc(256);
        const s =
            "2;649;CN=Red Hat CS 71GA Demo,O=Red Hat CS 71GA Demo,C=US;" +
            "CN=RHCS Agent - admin01,UID=admin01,O=redhat,C=US [1] This is " +
            "Teena Vradmin's description.";
        buf[0] = 0x04;
        buf[1] = 0x81;
        buf[2] = 0x94;
        buf.write(s, 3);
        const ber = new BerReader(buf.slice(0, 3 + s.length));
        assert.equal(ber.readString(), s);
    });
});
