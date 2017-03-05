// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

/* global describe it */

const BerWriter = adone.crypto.asn1.BerWriter;


describe("ASN.1", function () {
    describe("BerWriter", function () {
        it("load library", function() {
            assert.isOk(BerWriter);
            assert.isOk(new BerWriter());
        });

        it("write byte", function() {
            let writer = new BerWriter();

            writer.writeByte(0xC2);
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 1, "Wrong length");
            assert.equal(ber[0], 0xC2, "value wrong");
        });

        it("write 1 byte int", function() {
            let writer = new BerWriter();

            writer.writeInt(0x7f);
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 3, "Wrong length for an int: " + ber.length);
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong (2) -> " + ber[0]);
            assert.equal(ber[1], 0x01, "length wrong(1) -> " + ber[1]);
            assert.equal(ber[2], 0x7f, "value wrong(3) -> " + ber[2]);
        });

        it("write 2 byte int", function() {
            let writer = new BerWriter();

            writer.writeInt(0x7ffe);
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 4, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x02, "length wrong");
            assert.equal(ber[2], 0x7f, "value wrong (byte 1)");
            assert.equal(ber[3], 0xfe, "value wrong (byte 2)");
        });

        it("write 3 byte int", function() {
            let writer = new BerWriter();

            writer.writeInt(0x7ffffe);
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 5, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x03, "length wrong");
            assert.equal(ber[2], 0x7f, "value wrong (byte 1)");
            assert.equal(ber[3], 0xff, "value wrong (byte 2)");
            assert.equal(ber[4], 0xfe, "value wrong (byte 3)");
        });

        it("write 4 byte int", function() {
            let writer = new BerWriter();

            writer.writeInt(0x7ffffffe);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 6, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x04, "length wrong");
            assert.equal(ber[2], 0x7f, "value wrong (byte 1)");
            assert.equal(ber[3], 0xff, "value wrong (byte 2)");
            assert.equal(ber[4], 0xff, "value wrong (byte 3)");
            assert.equal(ber[5], 0xfe, "value wrong (byte 4)");
        });

        it("write 1 byte negative int", function() {
            let writer = new BerWriter();

            writer.writeInt(-128);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 3, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x01, "length wrong");
            assert.equal(ber[2], 0x80, "value wrong (byte 1)");
        });

        it("write 2 byte negative int", function() {
            let writer = new BerWriter();

            writer.writeInt(-22400);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 4, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x02, "length wrong");
            assert.equal(ber[2], 0xa8, "value wrong (byte 1)");
            assert.equal(ber[3], 0x80, "value wrong (byte 2)");
        });

        it("write 3 byte negative int", function() {
            let writer = new BerWriter();

            writer.writeInt(-481653);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 5, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x03, "length wrong");
            assert.equal(ber[2], 0xf8, "value wrong (byte 1)");
            assert.equal(ber[3], 0xa6, "value wrong (byte 2)");
            assert.equal(ber[4], 0x8b, "value wrong (byte 3)");
        });

        it("write 4 byte negative int", function() {
            let writer = new BerWriter();

            writer.writeInt(-1522904131);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 6, "Wrong length for an int");
            assert.equal(ber[0], 0x02, "ASN.1 tag wrong");
            assert.equal(ber[1], 0x04, "length wrong");
            assert.equal(ber[2], 0xa5, "value wrong (byte 1)");
            assert.equal(ber[3], 0x3a, "value wrong (byte 2)");
            assert.equal(ber[4], 0x53, "value wrong (byte 3)");
            assert.equal(ber[5], 0xbd, "value wrong (byte 4)");
        });

        it("write boolean", function() {
            let writer = new BerWriter();

            writer.writeBoolean(true);
            writer.writeBoolean(false);
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 6, "Wrong length");
            assert.equal(ber[0], 0x01, "tag wrong");
            assert.equal(ber[1], 0x01, "length wrong");
            assert.equal(ber[2], 0xff, "value wrong");
            assert.equal(ber[3], 0x01, "tag wrong");
            assert.equal(ber[4], 0x01, "length wrong");
            assert.equal(ber[5], 0x00, "value wrong");
        });

        it("write string", function() {
            let writer = new BerWriter();
            writer.writeString("hello world");
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 13, "wrong length");
            assert.equal(ber[0], 0x04, "wrong tag");
            assert.equal(ber[1], 11, "wrong length");
            assert.equal(ber.slice(2).toString("utf8"), "hello world", "wrong value");
        });

        it("write buffer", function() {
            let writer = new BerWriter();
            // write some stuff to start with
            writer.writeString("hello world");
            let ber = writer.buffer;
            let buf = new Buffer([0x04, 0x0b, 0x30, 0x09, 0x02, 0x01, 0x0f, 0x01, 0x01,
                0xff, 0x01, 0x01, 0xff
            ]);
            writer.writeBuffer(buf.slice(2, buf.length), 0x04);
            ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 26, "wrong length");
            assert.equal(ber[0], 0x04, "wrong tag");
            assert.equal(ber[1], 11, "wrong length");
            assert.equal(ber.slice(2, 13).toString("utf8"), "hello world", "wrong value");
            assert.equal(ber[13], buf[0], "wrong tag");
            assert.equal(ber[14], buf[1], "wrong length");
            for (let i = 13, j = 0; i < ber.length && j < buf.length; i++, j++) {
                assert.equal(ber[i], buf[j], "buffer contents not identical");
            }
        });

        it("write string array", function() {
            let writer = new BerWriter();
            writer.writeStringArray(["hello world", "fubar!"]);
            let ber = writer.buffer;

            assert.isOk(ber);

            assert.equal(ber.length, 21, "wrong length");
            assert.equal(ber[0], 0x04, "wrong tag");
            assert.equal(ber[1], 11, "wrong length");
            assert.equal(ber.slice(2, 13).toString("utf8"), "hello world", "wrong value");

            assert.equal(ber[13], 0x04, "wrong tag");
            assert.equal(ber[14], 6, "wrong length");
            assert.equal(ber.slice(15).toString("utf8"), "fubar!", "wrong value");
        });

        it("resize internal buffer", function() {
            let writer = new BerWriter({
                size: 2
            });
            writer.writeString("hello world");
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 13, "wrong length");
            assert.equal(ber[0], 0x04, "wrong tag");
            assert.equal(ber[1], 11, "wrong length");
            assert.equal(ber.slice(2).toString("utf8"), "hello world", "wrong value");
        });

        it("sequence", function() {
            let writer = new BerWriter({
                size: 25
            });
            writer.startSequence();
            writer.writeString("hello world");
            writer.endSequence();
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 15, "wrong length");
            assert.equal(ber[0], 0x30, "wrong tag");
            assert.equal(ber[1], 13, "wrong length");
            assert.equal(ber[2], 0x04, "wrong tag");
            assert.equal(ber[3], 11, "wrong length");
            assert.equal(ber.slice(4).toString("utf8"), "hello world", "wrong value");
        });

        it("nested sequence", function() {
            let writer = new BerWriter({
                size: 25
            });
            writer.startSequence();
            writer.writeString("hello world");
            writer.startSequence();
            writer.writeString("hello world");
            writer.endSequence();
            writer.endSequence();
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 30, "wrong length");
            assert.equal(ber[0], 0x30, "wrong tag");
            assert.equal(ber[1], 28, "wrong length");
            assert.equal(ber[2], 0x04, "wrong tag");
            assert.equal(ber[3], 11, "wrong length");
            assert.equal(ber.slice(4, 15).toString("utf8"), "hello world", "wrong value");
            assert.equal(ber[15], 0x30, "wrong tag");
            assert.equal(ber[16], 13, "wrong length");
            assert.equal(ber[17], 0x04, "wrong tag");
            assert.equal(ber[18], 11, "wrong length");
            assert.equal(ber.slice(19, 30).toString("utf8"), "hello world", "wrong value");
        });

        it("LDAP bind message", function() {
            let dn = "cn=foo,ou=unit,o=test";
            let writer = new BerWriter();
            writer.startSequence();
            writer.writeInt(3); // msgid = 3
            writer.startSequence(0x60); // ldap bind
            writer.writeInt(3); // ldap v3
            writer.writeString(dn);
            writer.writeByte(0x80);
            writer.writeByte(0x00);
            writer.endSequence();
            writer.endSequence();
            let ber = writer.buffer;

            assert.isOk(ber);
            assert.equal(ber.length, 35, "wrong length (buffer)");
            assert.equal(ber[0], 0x30, "wrong tag");
            assert.equal(ber[1], 33, "wrong length");
            assert.equal(ber[2], 0x02, "wrong tag");
            assert.equal(ber[3], 1, "wrong length");
            assert.equal(ber[4], 0x03, "wrong value");
            assert.equal(ber[5], 0x60, "wrong tag");
            assert.equal(ber[6], 28, "wrong length");
            assert.equal(ber[7], 0x02, "wrong tag");
            assert.equal(ber[8], 1, "wrong length");
            assert.equal(ber[9], 0x03, "wrong value");
            assert.equal(ber[10], 0x04, "wrong tag");
            assert.equal(ber[11], dn.length, "wrong length");
            assert.equal(ber.slice(12, 33).toString("utf8"), dn, "wrong value");
            assert.equal(ber[33], 0x80, "wrong tag");
            assert.equal(ber[34], 0x00, "wrong len");
        });

        it("Write OID", function() {
            let oid = "1.2.840.113549.1.1.1";
            let writer = new BerWriter();
            writer.writeOID(oid);

            let ber = writer.buffer;
            assert.isOk(ber);
        });
    });
});
