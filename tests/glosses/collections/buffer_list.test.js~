const {
    is,
    std: { crypto },
    collection: { BufferList },
    fs
} = adone;

describe("collection", "BufferList", () => {
    const encodings = (`hex utf8 utf-8 ascii binary base64${process.browser ? "" : " ucs2 ucs-2 utf16le utf-16le"}`).split(" ");

    it("single bytes from single buffer", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abcd"));

        assert.equal(bl.length, 4);
        assert.equal(bl.get(-1), undefined);
        assert.equal(bl.get(0), 97);
        assert.equal(bl.get(1), 98);
        assert.equal(bl.get(2), 99);
        assert.equal(bl.get(3), 100);
        assert.equal(bl.get(4), undefined);
    });

    it("single bytes from multiple buffers", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abcd"));
        bl.append(Buffer.from("efg"));
        bl.append(Buffer.from("hi"));
        bl.append(Buffer.from("j"));

        assert.equal(bl.length, 10);

        assert.equal(bl.get(0), 97);
        assert.equal(bl.get(1), 98);
        assert.equal(bl.get(2), 99);
        assert.equal(bl.get(3), 100);
        assert.equal(bl.get(4), 101);
        assert.equal(bl.get(5), 102);
        assert.equal(bl.get(6), 103);
        assert.equal(bl.get(7), 104);
        assert.equal(bl.get(8), 105);
        assert.equal(bl.get(9), 106);
    });

    it("multi bytes from single buffer", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abcd"));

        assert.equal(bl.length, 4);

        assert.equal(bl.slice(0, 4).toString("ascii"), "abcd");
        assert.equal(bl.slice(0, 3).toString("ascii"), "abc");
        assert.equal(bl.slice(1, 4).toString("ascii"), "bcd");
        assert.equal(bl.slice(-4, -1).toString("ascii"), "abc");
    });

    it("multi bytes from single buffer (negative indexes)", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("buffer"));

        assert.equal(bl.length, 6);

        assert.equal(bl.slice(-6, -1).toString("ascii"), "buffe");
        assert.equal(bl.slice(-6, -2).toString("ascii"), "buff");
        assert.equal(bl.slice(-5, -2).toString("ascii"), "uff");
    });

    it("multiple bytes from multiple buffers", () => {
        const bl = new BufferList();

        bl.append(Buffer.from("abcd"));
        bl.append(Buffer.from("efg"));
        bl.append(Buffer.from("hi"));
        bl.append(Buffer.from("j"));

        assert.equal(bl.length, 10);

        assert.equal(bl.slice(0, 10).toString("ascii"), "abcdefghij");
        assert.equal(bl.slice(3, 10).toString("ascii"), "defghij");
        assert.equal(bl.slice(3, 6).toString("ascii"), "def");
        assert.equal(bl.slice(3, 8).toString("ascii"), "defgh");
        assert.equal(bl.slice(5, 10).toString("ascii"), "fghij");
        assert.equal(bl.slice(-7, -4).toString("ascii"), "def");
    });

    it("multiple bytes from multiple buffer lists", () => {
        const bl = new BufferList();

        bl.append(new BufferList([Buffer.from("abcd"), Buffer.from("efg")]));
        bl.append(new BufferList([Buffer.from("hi"), Buffer.from("j")]));

        assert.equal(bl.length, 10);

        assert.equal(bl.slice(0, 10).toString("ascii"), "abcdefghij");

        assert.equal(bl.slice(3, 10).toString("ascii"), "defghij");
        assert.equal(bl.slice(3, 6).toString("ascii"), "def");
        assert.equal(bl.slice(3, 8).toString("ascii"), "defgh");
        assert.equal(bl.slice(5, 10).toString("ascii"), "fghij");
    });

    // same data as previous test, just using nested constructors
    it("multiple bytes from crazy nested buffer lists", () => {
        const bl = new BufferList();

        bl.append(new BufferList([
            new BufferList([
                new BufferList(Buffer.from("abc")),
                Buffer.from("d"),
                new BufferList(Buffer.from("efg"))
            ]),
            new BufferList([Buffer.from("hi")]),
            new BufferList(Buffer.from("j"))
        ]));

        assert.equal(bl.length, 10);

        assert.equal(bl.slice(0, 10).toString("ascii"), "abcdefghij");

        assert.equal(bl.slice(3, 10).toString("ascii"), "defghij");
        assert.equal(bl.slice(3, 6).toString("ascii"), "def");
        assert.equal(bl.slice(3, 8).toString("ascii"), "defgh");
        assert.equal(bl.slice(5, 10).toString("ascii"), "fghij");
    });

    it("append accepts arrays of Buffers", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abc"));
        bl.append([Buffer.from("def")]);
        bl.append([Buffer.from("ghi"), Buffer.from("jkl")]);
        bl.append([Buffer.from("mnop"), Buffer.from("qrstu"), Buffer.from("vwxyz")]);
        assert.equal(bl.length, 26);
        assert.equal(bl.slice().toString("ascii"), "abcdefghijklmnopqrstuvwxyz");
    });

    it("append accepts arrays of BufferLists", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abc"));
        bl.append([new BufferList("def")]);
        bl.append(new BufferList([Buffer.from("ghi"), new BufferList("jkl")]));
        bl.append([Buffer.from("mnop"), new BufferList([Buffer.from("qrstu"), Buffer.from("vwxyz")])]);
        assert.equal(bl.length, 26);
        assert.equal(bl.slice().toString("ascii"), "abcdefghijklmnopqrstuvwxyz");
    });

    it("append chainable", () => {
        const bl = new BufferList();
        assert.ok(bl.append(Buffer.from("abcd")) === bl);
        assert.ok(bl.append([Buffer.from("abcd")]) === bl);
        assert.ok(bl.append(new BufferList(Buffer.from("abcd"))) === bl);
        assert.ok(bl.append([new BufferList(Buffer.from("abcd"))]) === bl);
    });

    it("append chainable (test results)", () => {
        const bl = new BufferList("abc")
            .append([new BufferList("def")])
            .append(new BufferList([Buffer.from("ghi"), new BufferList("jkl")]))
            .append([Buffer.from("mnop"), new BufferList([Buffer.from("qrstu"), Buffer.from("vwxyz")])]);

        assert.equal(bl.length, 26);
        assert.equal(bl.slice().toString("ascii"), "abcdefghijklmnopqrstuvwxyz");
    });

    it("consuming from multiple buffers", () => {
        const bl = new BufferList();

        bl.append(Buffer.from("abcd"));
        bl.append(Buffer.from("efg"));
        bl.append(Buffer.from("hi"));
        bl.append(Buffer.from("j"));

        assert.equal(bl.length, 10);

        assert.equal(bl.slice(0, 10).toString("ascii"), "abcdefghij");

        bl.consume(3);
        assert.equal(bl.length, 7);
        assert.equal(bl.slice(0, 7).toString("ascii"), "defghij");

        bl.consume(2);
        assert.equal(bl.length, 5);
        assert.equal(bl.slice(0, 5).toString("ascii"), "fghij");

        bl.consume(1);
        assert.equal(bl.length, 4);
        assert.equal(bl.slice(0, 4).toString("ascii"), "ghij");

        bl.consume(1);
        assert.equal(bl.length, 3);
        assert.equal(bl.slice(0, 3).toString("ascii"), "hij");

        bl.consume(2);
        assert.equal(bl.length, 1);
        assert.equal(bl.slice(0, 1).toString("ascii"), "j");
    });

    it("complete consumption", () => {
        const bl = new BufferList();

        bl.append(Buffer.from("a"));
        bl.append(Buffer.from("b"));

        bl.consume(2);

        assert.equal(bl.length, 0);
        assert.equal(bl._bufs.length, 0);
    });

    it("test readUInt8 / readInt8", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(3);
        const bl = new BufferList();

        buf2[1] = 0x3;
        buf2[2] = 0x4;
        buf3[0] = 0x23;
        buf3[1] = 0x42;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readUInt8(2), 0x3);
        assert.equal(bl.readInt8(2), 0x3);
        assert.equal(bl.readUInt8(3), 0x4);
        assert.equal(bl.readInt8(3), 0x4);
        assert.equal(bl.readUInt8(4), 0x23);
        assert.equal(bl.readInt8(4), 0x23);
        assert.equal(bl.readUInt8(5), 0x42);
        assert.equal(bl.readInt8(5), 0x42);
    });

    it("test readUInt16LE / readUInt16BE / readInt16LE / readInt16BE", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(3);
        const bl = new BufferList();

        buf2[1] = 0x3;
        buf2[2] = 0x4;
        buf3[0] = 0x23;
        buf3[1] = 0x42;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readUInt16BE(2), 0x0304);
        assert.equal(bl.readUInt16LE(2), 0x0403);
        assert.equal(bl.readInt16BE(2), 0x0304);
        assert.equal(bl.readInt16LE(2), 0x0403);
        assert.equal(bl.readUInt16BE(3), 0x0423);
        assert.equal(bl.readUInt16LE(3), 0x2304);
        assert.equal(bl.readInt16BE(3), 0x0423);
        assert.equal(bl.readInt16LE(3), 0x2304);
        assert.equal(bl.readUInt16BE(4), 0x2342);
        assert.equal(bl.readUInt16LE(4), 0x4223);
        assert.equal(bl.readInt16BE(4), 0x2342);
        assert.equal(bl.readInt16LE(4), 0x4223);
    });

    it("test readUInt32LE / readUInt32BE / readInt32LE / readInt32BE", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(3);
        const bl = new BufferList();

        buf2[1] = 0x3;
        buf2[2] = 0x4;
        buf3[0] = 0x23;
        buf3[1] = 0x42;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readUInt32BE(2), 0x03042342);
        assert.equal(bl.readUInt32LE(2), 0x42230403);
        assert.equal(bl.readInt32BE(2), 0x03042342);
        assert.equal(bl.readInt32LE(2), 0x42230403);
    });

    it("test readUIntLE / readUIntBE / readIntLE / readIntBE", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(3);
        const bl = new BufferList();

        buf2[0] = 0x2;
        buf2[1] = 0x3;
        buf2[2] = 0x4;
        buf3[0] = 0x23;
        buf3[1] = 0x42;
        buf3[2] = 0x61;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readUIntBE(1, 1), 0x02);
        assert.equal(bl.readUIntBE(1, 2), 0x0203);
        assert.equal(bl.readUIntBE(1, 3), 0x020304);
        assert.equal(bl.readUIntBE(1, 4), 0x02030423);
        assert.equal(bl.readUIntBE(1, 5), 0x0203042342);
        assert.equal(bl.readUIntBE(1, 6), 0x020304234261);
        assert.equal(bl.readUIntLE(1, 1), 0x02);
        assert.equal(bl.readUIntLE(1, 2), 0x0302);
        assert.equal(bl.readUIntLE(1, 3), 0x040302);
        assert.equal(bl.readUIntLE(1, 4), 0x23040302);
        assert.equal(bl.readUIntLE(1, 5), 0x4223040302);
        assert.equal(bl.readUIntLE(1, 6), 0x614223040302);
        assert.equal(bl.readIntBE(1, 1), 0x02);
        assert.equal(bl.readIntBE(1, 2), 0x0203);
        assert.equal(bl.readIntBE(1, 3), 0x020304);
        assert.equal(bl.readIntBE(1, 4), 0x02030423);
        assert.equal(bl.readIntBE(1, 5), 0x0203042342);
        assert.equal(bl.readIntBE(1, 6), 0x020304234261);
        assert.equal(bl.readIntLE(1, 1), 0x02);
        assert.equal(bl.readIntLE(1, 2), 0x0302);
        assert.equal(bl.readIntLE(1, 3), 0x040302);
        assert.equal(bl.readIntLE(1, 4), 0x23040302);
        assert.equal(bl.readIntLE(1, 5), 0x4223040302);
        assert.equal(bl.readIntLE(1, 6), 0x614223040302);
    });

    it("test readFloatLE / readFloatBE", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(3);
        const bl = new BufferList();

        buf2[1] = 0x00;
        buf2[2] = 0x00;
        buf3[0] = 0x80;
        buf3[1] = 0x3f;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readFloatLE(2), 0x01);
    });

    it("test readDoubleLE / readDoubleBE", () => {
        const buf1 = Buffer.alloc(1);
        const buf2 = Buffer.alloc(3);
        const buf3 = Buffer.alloc(10);
        const bl = new BufferList();

        buf2[1] = 0x55;
        buf2[2] = 0x55;
        buf3[0] = 0x55;
        buf3[1] = 0x55;
        buf3[2] = 0x55;
        buf3[3] = 0x55;
        buf3[4] = 0xd5;
        buf3[5] = 0x3f;

        bl.append(buf1);
        bl.append(buf2);
        bl.append(buf3);

        assert.equal(bl.readDoubleLE(2), 0.3333333333333333);
    });

    it("test toString", () => {
        const bl = new BufferList();

        bl.append(Buffer.from("abcd"));
        bl.append(Buffer.from("efg"));
        bl.append(Buffer.from("hi"));
        bl.append(Buffer.from("j"));

        assert.equal(bl.toString("ascii", 0, 10), "abcdefghij");
        assert.equal(bl.toString("ascii", 3, 10), "defghij");
        assert.equal(bl.toString("ascii", 3, 6), "def");
        assert.equal(bl.toString("ascii", 3, 8), "defgh");
        assert.equal(bl.toString("ascii", 5, 10), "fghij");
    });

    it("test toString encoding", () => {
        const bl = new BufferList();
        const b = Buffer.from("abcdefghij\xff\x00");

        bl.append(Buffer.from("abcd"));
        bl.append(Buffer.from("efg"));
        bl.append(Buffer.from("hi"));
        bl.append(Buffer.from("j"));
        bl.append(Buffer.from("\xff\x00"));

        encodings.forEach((enc) => {
            assert.equal(bl.toString(enc), b.toString(enc), enc);
        });
    });

    !process.browser && it("test stream", (done) => {
        const random = crypto.randomBytes(65534);
        const md5 = (x) => crypto.createHash("md5").update(x).digest();
        const rndhash = md5(random);
        const md5sum = crypto.createHash("md5");
        const bl = new BufferList(((err, buf) => {
            assert.ok(is.buffer(buf));
            assert.isNull(err);
            assert.deepEqual(rndhash, md5(bl.slice()));
            assert.deepEqual(rndhash, md5(buf));

            bl.pipe(fs.createWriteStream("/tmp/bl_test_rnd_out.dat"))
                .on("close", () => {
                    const s = fs.createReadStream("/tmp/bl_test_rnd_out.dat");
                    s.on("data", md5sum.update.bind(md5sum));
                    s.on("end", () => {
                        assert.equal(rndhash.toString("hex"), md5sum.digest("hex"), "woohoo! correct hash!");
                        done();
                    });
                });

        }));

        fs.writeFileSync("/tmp/bl_test_rnd.dat", random);
        fs.createReadStream("/tmp/bl_test_rnd.dat").pipe(bl);
    });

    it("instantiation with Buffer", () => {
        const buf = crypto.randomBytes(1024);
        const buf2 = crypto.randomBytes(1024);
        let b = new BufferList(buf);

        assert.equal(buf.toString("hex"), b.slice().toString("hex"), "same buffer");
        b = new BufferList([buf, buf2]);
        assert.equal(b.slice().toString("hex"), Buffer.concat([buf, buf2]).toString("hex"), "same buffer");
    });

    it("test String appendage", () => {
        const bl = new BufferList();
        const b = Buffer.from("abcdefghij\xff\x00");

        bl.append("abcd");
        bl.append("efg");
        bl.append("hi");
        bl.append("j");
        bl.append("\xff\x00");

        encodings.forEach((enc) => {
            assert.equal(bl.toString(enc), b.toString(enc));
        });
    });

    it("test Number appendage", () => {
        const bl = new BufferList();
        const b = Buffer.from("1234567890");

        bl.append(1234);
        bl.append(567);
        bl.append(89);
        bl.append(0);

        encodings.forEach((enc) => {
            assert.equal(bl.toString(enc), b.toString(enc));
        });
    });

    it("write nothing, should get empty buffer", (done) => {
        new BufferList((err, data) => {
            assert.notOk(err, "no error");
            assert.ok(is.buffer(data), "got a buffer");
            assert.equal(0, data.length, "got a zero-length buffer");
            done();
        }).end();
    });

    it("unicode string", () => {
        const inp1 = "\u2600";
        const inp2 = "\u2603";
        const exp = `${inp1} and ${inp2}`;
        const bl = new BufferList();
        bl.write(inp1);
        bl.write(" and ");
        bl.write(inp2);
        assert.equal(exp, bl.toString());
        assert.equal(Buffer.from(exp).toString("hex"), bl.toString("hex"));
    });

    it("should emit finish", (done) => {
        const source = new BufferList();
        const dest = new BufferList();

        source.write("hello");
        source.pipe(dest);

        dest.on("finish", () => {
            assert.equal(dest.toString("utf8"), "hello");
            done();
        });
    });

    it("basic copy", () => {
        const buf = crypto.randomBytes(1024);
        const buf2 = Buffer.alloc(1024);
        const b = new BufferList(buf);

        b.copy(buf2);
        assert.equal(b.slice().toString("hex"), buf2.toString("hex"), "same buffer");
    });

    it("copy after many appends", () => {
        const buf = crypto.randomBytes(512);
        const buf2 = Buffer.alloc(1024);
        const b = new BufferList(buf);

        b.append(buf);
        b.copy(buf2);
        assert.equal(b.slice().toString("hex"), buf2.toString("hex"), "same buffer");
    });

    it("copy at a precise position", () => {
        const buf = crypto.randomBytes(1004);
        const buf2 = Buffer.alloc(1024);
        const b = new BufferList(buf);

        b.copy(buf2, 20);
        assert.equal(b.slice().toString("hex"), buf2.slice(20).toString("hex"), "same buffer");
    });

    it("copy starting from a precise location", () => {
        const buf = crypto.randomBytes(10);
        const buf2 = Buffer.alloc(5);
        const b = new BufferList(buf);

        b.copy(buf2, 0, 5);
        assert.equal(b.slice(5).toString("hex"), buf2.toString("hex"), "same buffer");
    });

    it("copy in an interval", () => {
        const rnd = crypto.randomBytes(10);
        const b = new BufferList(rnd); // put the random bytes there
        const actual = Buffer.alloc(3);
        const expected = Buffer.alloc(3);

        rnd.copy(expected, 0, 5, 8);
        b.copy(actual, 0, 5, 8);

        assert.equal(actual.toString("hex"), expected.toString("hex"), "same buffer");
    });

    it("copy an interval between two buffers", () => {
        const buf = crypto.randomBytes(10);
        const buf2 = Buffer.alloc(10);
        const b = new BufferList(buf);

        b.append(buf);
        b.copy(buf2, 0, 5, 15);

        assert.equal(b.slice(5, 15).toString("hex"), buf2.toString("hex"), "same buffer");
    });

    it("shallow slice across buffer boundaries", () => {
        const bl = new BufferList(["First", "Second", "Third"]);

        assert.equal(bl.shallowSlice(3, 13).toString(), "stSecondTh");
    });

    it("shallow slice within single buffer", () => {
        const bl = new BufferList(["First", "Second", "Third"]);

        assert.equal(bl.shallowSlice(5, 10).toString(), "Secon");
        assert.equal(bl.shallowSlice(7, 10).toString(), "con");
    });

    it("shallow slice single buffer", () => {
        const bl = new BufferList(["First", "Second", "Third"]);

        assert.equal(bl.shallowSlice(0, 5).toString(), "First");
        assert.equal(bl.shallowSlice(5, 11).toString(), "Second");
        assert.equal(bl.shallowSlice(11, 16).toString(), "Third");
    });

    it("shallow slice with negative or omitted indices", () => {
        const bl = new BufferList(["First", "Second", "Third"]);

        assert.equal(bl.shallowSlice().toString(), "FirstSecondThird");
        assert.equal(bl.shallowSlice(5).toString(), "SecondThird");
        assert.equal(bl.shallowSlice(5, -3).toString(), "SecondTh");
        assert.equal(bl.shallowSlice(-8).toString(), "ondThird");
    });

    it("shallow slice does not make a copy", () => {
        const buffers = [Buffer.from("First"), Buffer.from("Second"), Buffer.from("Third")];
        const bl = (new BufferList(buffers)).shallowSlice(5, -3);

        buffers[1].fill("h");
        buffers[2].fill("h");

        assert.equal(bl.toString(), "hhhhhhhh");
    });

    it("shallow slice with 0 length", () => {
        const buffers = [Buffer.from("First"), Buffer.from("Second"), Buffer.from("Third")];
        const bl = (new BufferList(buffers)).shallowSlice(0, 0);
        assert.equal(bl.length, 0);
    });

    it("shallow slice with 0 length from middle", () => {
        const buffers = [Buffer.from("First"), Buffer.from("Second"), Buffer.from("Third")];
        const bl = (new BufferList(buffers)).shallowSlice(10, 10);
        assert.equal(bl.length, 0);
    });

    it("duplicate", () => {
        const bl = new BufferList("abcdefghij\xff\x00");
        const dup = bl.duplicate();

        assert.equal(bl.prototype, dup.prototype);
        assert.equal(bl.toString("hex"), dup.toString("hex"));
    });

    it("destroy no pipe", () => {
        const bl = new BufferList("alsdkfja;lsdkfja;lsdk");
        bl.destroy();

        assert.equal(bl._bufs.length, 0);
        assert.equal(bl.length, 0);
    });

    it("destroy with error", () => {
        const bl = new BufferList("alsdkfja;lsdkfja;lsdk");
        const err = new Error("kaboom");
        bl.destroy(err);
        bl.on("error", (_err) => {
            assert.equal(_err, err);
        });

        assert.equal(bl._bufs.length, 0);
        assert.equal(bl.length, 0);
    });

    !process.browser && it("destroy with pipe before read end", () => {
        const bl = new BufferList();
        fs.createReadStream(`${__dirname}/buffer_list.test.js`)
            .pipe(bl);

        bl.destroy();

        assert.equal(bl._bufs.length, 0);
        assert.equal(bl.length, 0);
    });

    !process.browser && it("destroy with pipe before read end with race", (done) => {
        const bl = new BufferList();
        fs.createReadStream(`${__dirname}/buffer_list.test.js`)
            .pipe(bl);

        setTimeout(() => {
            bl.destroy();
            setTimeout(() => {
                assert.equal(bl._bufs.length, 0);
                assert.equal(bl.length, 0);
                done();
            }, 500);
        }, 500);
    });

    !process.browser && it("destroy with pipe after read end", (done) => {
        const bl = new BufferList();
        const onEnd = () => {
            bl.destroy();

            assert.equal(bl._bufs.length, 0);
            assert.equal(bl.length, 0);
            done();
        };

        fs.createReadStream(`${__dirname}/buffer_list.test.js`)
            .on("end", onEnd)
            .pipe(bl);
    });

    !process.browser && it("destroy with pipe while writing to a destination", (done) => {
        const bl = new BufferList();
        const ds = new BufferList();

        const onEnd = function () {
            bl.pipe(ds);

            setTimeout(() => {
                bl.destroy();

                assert.equal(bl._bufs.length, 0);
                assert.equal(bl.length, 0);

                ds.destroy();

                assert.equal(bl._bufs.length, 0);
                assert.equal(bl.length, 0);
                done();
            }, 100);
        };

        fs.createReadStream(`${__dirname}/buffer_list.test.js`)
            .on("end", onEnd)
            .pipe(bl);
    });

    !process.browser && it("handle error", (done) => {
        fs.createReadStream("/does/not/exist").pipe(new BufferList((err, data) => {
            assert.ok(err instanceof Error, "has error");
            assert.notOk(data, "no data");
            done();
        }));
    });


    describe("indexOf", () => {
        it("indexOf single byte needle", () => {
            const bl = new BufferList(["abcdefg", "abcdefg", "12345"]);
            assert.equal(bl.indexOf("e"), 4);
            assert.equal(bl.indexOf("e", 5), 11);
            assert.equal(bl.indexOf("e", 12), -1);
            assert.equal(bl.indexOf("5"), 18);
        });

        it("indexOf multiple byte needle", () => {
            const bl = new BufferList(["abcdefg", "abcdefg"]);
            assert.equal(bl.indexOf("ef"), 4);
            assert.equal(bl.indexOf("ef", 5), 11);
        });

        it("indexOf multiple byte needles across buffer boundaries", () => {
            const bl = new BufferList(["abcdefg", "abcdefg"]);
            assert.equal(bl.indexOf("fgabc"), 5);
        });

        it("indexOf takes a buffer list search", () => {
            const bl = new BufferList(["abcdefg", "abcdefg"]);
            const search = new BufferList("fgabc");
            assert.equal(bl.indexOf(search), 5);
        });

        it("indexOf a zero byte needle", () => {
            const b = new BufferList("abcdef");
            const bufEmpty = Buffer.from("");
            assert.equal(b.indexOf(""), 0);
            assert.equal(b.indexOf("", 1), 1);
            assert.equal(b.indexOf("", b.length + 1), b.length);
            assert.equal(b.indexOf("", Infinity), b.length);
            assert.equal(b.indexOf(bufEmpty), 0);
            assert.equal(b.indexOf(bufEmpty, 1), 1);
            assert.equal(b.indexOf(bufEmpty, b.length + 1), b.length);
            assert.equal(b.indexOf(bufEmpty, Infinity), b.length);
        });

        it("indexOf buffers smaller and larger than the needle", () => {
            const bl = new BufferList(["abcdefg", "a", "bcdefg", "a", "bcfgab"]);
            assert.equal(bl.indexOf("fgabc"), 5);
            assert.equal(bl.indexOf("fgabc", 6), 12);
            assert.equal(bl.indexOf("fgabc", 13), -1);
        })

        // only present in node 6+
        ; (process.version.substr(1).split(".")[0] >= 6) && it("indexOf latin1 and binary encoding", () => {
            const b = new BufferList("abcdef");

            // test latin1 encoding
            assert.equal(
                new BufferList(Buffer.from(b.toString("latin1"), "latin1"))
                    .indexOf("d", 0, "latin1"),
                3
            );
            assert.equal(
                new BufferList(Buffer.from(b.toString("latin1"), "latin1"))
                    .indexOf(Buffer.from("d", "latin1"), 0, "latin1"),
                3
            );
            assert.equal(
                new BufferList(Buffer.from("aa\u00e8aa", "latin1"))
                    .indexOf("\u00e8", "latin1"),
                2
            );
            assert.equal(
                new BufferList(Buffer.from("\u00e8", "latin1"))
                    .indexOf("\u00e8", "latin1"),
                0
            );
            assert.equal(
                new BufferList(Buffer.from("\u00e8", "latin1"))
                    .indexOf(Buffer.from("\u00e8", "latin1"), "latin1"),
                0
            );

            // test binary encoding
            assert.equal(
                new BufferList(Buffer.from(b.toString("binary"), "binary"))
                    .indexOf("d", 0, "binary"),
                3
            );
            assert.equal(
                new BufferList(Buffer.from(b.toString("binary"), "binary"))
                    .indexOf(Buffer.from("d", "binary"), 0, "binary"),
                3
            );
            assert.equal(
                new BufferList(Buffer.from("aa\u00e8aa", "binary"))
                    .indexOf("\u00e8", "binary"),
                2
            );
            assert.equal(
                new BufferList(Buffer.from("\u00e8", "binary"))
                    .indexOf("\u00e8", "binary"),
                0
            );
            assert.equal(
                new BufferList(Buffer.from("\u00e8", "binary"))
                    .indexOf(Buffer.from("\u00e8", "binary"), "binary"),
                0
            );
        });

        it("indexOf the entire nodejs10 buffer test suite", () => {
            const b = new BufferList("abcdef");
            const bufA = Buffer.from("a");
            const bufBc = Buffer.from("bc");
            const bufF = Buffer.from("f");
            const bufZ = Buffer.from("z");

            const stringComparison = "abcdef";

            assert.equal(b.indexOf("a"), 0);
            assert.equal(b.indexOf("a", 1), -1);
            assert.equal(b.indexOf("a", -1), -1);
            assert.equal(b.indexOf("a", -4), -1);
            assert.equal(b.indexOf("a", -b.length), 0);
            assert.equal(b.indexOf("a", NaN), 0);
            assert.equal(b.indexOf("a", -Infinity), 0);
            assert.equal(b.indexOf("a", Infinity), -1);
            assert.equal(b.indexOf("bc"), 1);
            assert.equal(b.indexOf("bc", 2), -1);
            assert.equal(b.indexOf("bc", -1), -1);
            assert.equal(b.indexOf("bc", -3), -1);
            assert.equal(b.indexOf("bc", -5), 1);
            assert.equal(b.indexOf("bc", NaN), 1);
            assert.equal(b.indexOf("bc", -Infinity), 1);
            assert.equal(b.indexOf("bc", Infinity), -1);
            assert.equal(b.indexOf("f"), b.length - 1);
            assert.equal(b.indexOf("z"), -1);
            // empty search tests
            assert.equal(b.indexOf(bufA), 0);
            assert.equal(b.indexOf(bufA, 1), -1);
            assert.equal(b.indexOf(bufA, -1), -1);
            assert.equal(b.indexOf(bufA, -4), -1);
            assert.equal(b.indexOf(bufA, -b.length), 0);
            assert.equal(b.indexOf(bufA, NaN), 0);
            assert.equal(b.indexOf(bufA, -Infinity), 0);
            assert.equal(b.indexOf(bufA, Infinity), -1);
            assert.equal(b.indexOf(bufBc), 1);
            assert.equal(b.indexOf(bufBc, 2), -1);
            assert.equal(b.indexOf(bufBc, -1), -1);
            assert.equal(b.indexOf(bufBc, -3), -1);
            assert.equal(b.indexOf(bufBc, -5), 1);
            assert.equal(b.indexOf(bufBc, NaN), 1);
            assert.equal(b.indexOf(bufBc, -Infinity), 1);
            assert.equal(b.indexOf(bufBc, Infinity), -1);
            assert.equal(b.indexOf(bufF), b.length - 1);
            assert.equal(b.indexOf(bufZ), -1);
            assert.equal(b.indexOf(0x61), 0);
            assert.equal(b.indexOf(0x61, 1), -1);
            assert.equal(b.indexOf(0x61, -1), -1);
            assert.equal(b.indexOf(0x61, -4), -1);
            assert.equal(b.indexOf(0x61, -b.length), 0);
            assert.equal(b.indexOf(0x61, NaN), 0);
            assert.equal(b.indexOf(0x61, -Infinity), 0);
            assert.equal(b.indexOf(0x61, Infinity), -1);
            assert.equal(b.indexOf(0x0), -1);

            // test offsets
            assert.equal(b.indexOf("d", 2), 3);
            assert.equal(b.indexOf("f", 5), 5);
            assert.equal(b.indexOf("f", -1), 5);
            assert.equal(b.indexOf("f", 6), -1);

            assert.equal(b.indexOf(Buffer.from("d"), 2), 3);
            assert.equal(b.indexOf(Buffer.from("f"), 5), 5);
            assert.equal(b.indexOf(Buffer.from("f"), -1), 5);
            assert.equal(b.indexOf(Buffer.from("f"), 6), -1);

            assert.equal(Buffer.from("ff").indexOf(Buffer.from("f"), 1, "ucs2"), -1);

            // test invalid and uppercase encoding
            assert.equal(b.indexOf("b", "utf8"), 1);
            assert.equal(b.indexOf("b", "UTF8"), 1);
            assert.equal(b.indexOf("62", "HEX"), 1);
            assert.throws(() => b.indexOf("bad", "enc"), TypeError);

            // test hex encoding
            assert.equal(
                Buffer.from(b.toString("hex"), "hex")
                    .indexOf("64", 0, "hex"),
                3
            );
            assert.equal(
                Buffer.from(b.toString("hex"), "hex")
                    .indexOf(Buffer.from("64", "hex"), 0, "hex"),
                3
            );

            // test base64 encoding
            assert.equal(
                Buffer.from(b.toString("base64"), "base64")
                    .indexOf("ZA==", 0, "base64"),
                3
            );
            assert.equal(
                Buffer.from(b.toString("base64"), "base64")
                    .indexOf(Buffer.from("ZA==", "base64"), 0, "base64"),
                3
            );

            // test ascii encoding
            assert.equal(
                Buffer.from(b.toString("ascii"), "ascii")
                    .indexOf("d", 0, "ascii"),
                3
            );
            assert.equal(
                Buffer.from(b.toString("ascii"), "ascii")
                    .indexOf(Buffer.from("d", "ascii"), 0, "ascii"),
                3
            );

            // test optional offset with passed encoding
            assert.equal(Buffer.from("aaaa0").indexOf("30", "hex"), 4);
            assert.equal(Buffer.from("aaaa00a").indexOf("3030", "hex"), 4);

            {
                // test usc2 encoding
                const twoByteString = Buffer.from("\u039a\u0391\u03a3\u03a3\u0395", "ucs2");

                assert.equal(8, twoByteString.indexOf("\u0395", 4, "ucs2"));
                assert.equal(6, twoByteString.indexOf("\u03a3", -4, "ucs2"));
                assert.equal(4, twoByteString.indexOf("\u03a3", -6, "ucs2"));
                assert.equal(4, twoByteString.indexOf(
                    Buffer.from("\u03a3", "ucs2"), -6, "ucs2"));
                assert.equal(-1, twoByteString.indexOf("\u03a3", -2, "ucs2"));
            }

            const mixedByteStringUcs2 =
                Buffer.from("\u039a\u0391abc\u03a3\u03a3\u0395", "ucs2");
            assert.equal(6, mixedByteStringUcs2.indexOf("bc", 0, "ucs2"));
            assert.equal(10, mixedByteStringUcs2.indexOf("\u03a3", 0, "ucs2"));
            assert.equal(-1, mixedByteStringUcs2.indexOf("\u0396", 0, "ucs2"));

            assert.equal(
                6, mixedByteStringUcs2.indexOf(Buffer.from("bc", "ucs2"), 0, "ucs2"));
            assert.equal(
                10, mixedByteStringUcs2.indexOf(Buffer.from("\u03a3", "ucs2"), 0, "ucs2"));
            assert.equal(
                -1, mixedByteStringUcs2.indexOf(Buffer.from("\u0396", "ucs2"), 0, "ucs2"));

            {
                const twoByteString = Buffer.from("\u039a\u0391\u03a3\u03a3\u0395", "ucs2");

                // Test single char pattern
                assert.equal(0, twoByteString.indexOf("\u039a", 0, "ucs2"));
                let index = twoByteString.indexOf("\u0391", 0, "ucs2");
                assert.equal(2, index, `Alpha - at index ${index}`);
                index = twoByteString.indexOf("\u03a3", 0, "ucs2");
                assert.equal(4, index, `First Sigma - at index ${index}`);
                index = twoByteString.indexOf("\u03a3", 6, "ucs2");
                assert.equal(6, index, `Second Sigma - at index ${index}`);
                index = twoByteString.indexOf("\u0395", 0, "ucs2");
                assert.equal(8, index, `Epsilon - at index ${index}`);
                index = twoByteString.indexOf("\u0392", 0, "ucs2");
                assert.equal(-1, index, `Not beta - at index ${index}`);

                // Test multi-char pattern
                index = twoByteString.indexOf("\u039a\u0391", 0, "ucs2");
                assert.equal(0, index, `Lambda Alpha - at index ${index}`);
                index = twoByteString.indexOf("\u0391\u03a3", 0, "ucs2");
                assert.equal(2, index, `Alpha Sigma - at index ${index}`);
                index = twoByteString.indexOf("\u03a3\u03a3", 0, "ucs2");
                assert.equal(4, index, `Sigma Sigma - at index ${index}`);
                index = twoByteString.indexOf("\u03a3\u0395", 0, "ucs2");
                assert.equal(6, index, `Sigma Epsilon - at index ${index}`);
            }

            const mixedByteStringUtf8 = Buffer.from("\u039a\u0391abc\u03a3\u03a3\u0395");
            assert.equal(5, mixedByteStringUtf8.indexOf("bc"));
            assert.equal(5, mixedByteStringUtf8.indexOf("bc", 5));
            assert.equal(5, mixedByteStringUtf8.indexOf("bc", -8));
            assert.equal(7, mixedByteStringUtf8.indexOf("\u03a3"));
            assert.equal(-1, mixedByteStringUtf8.indexOf("\u0396"));


            // Test complex string indexOf algorithms. Only trigger for long strings.
            // Long string that isn't a simple repeat of a shorter string.
            let longString = "A";
            for (let i = 66; i < 76; i++) { // from 'B' to 'K'
                longString = longString + String.fromCharCode(i) + longString;
            }

            const longBufferString = Buffer.from(longString);

            // pattern of 15 chars, repeated every 16 chars in long
            let pattern = "ABACABADABACABA";
            for (let i = 0; i < longBufferString.length - pattern.length; i += 7) {
                const index = longBufferString.indexOf(pattern, i);
                assert.equal((i + 15) & ~0xf, index,
                    `Long ABACABA...-string at index ${i}`);
            }

            let index = longBufferString.indexOf("AJABACA");
            assert.equal(510, index, `Long AJABACA, First J - at index ${index}`);
            index = longBufferString.indexOf("AJABACA", 511);
            assert.equal(1534, index, `Long AJABACA, Second J - at index ${index}`);

            pattern = "JABACABADABACABA";
            index = longBufferString.indexOf(pattern);
            assert.equal(511, index, `Long JABACABA..., First J - at index ${index}`);
            index = longBufferString.indexOf(pattern, 512);
            assert.equal(
                1535, index, `Long JABACABA..., Second J - at index ${index}`);

            // Search for a non-ASCII string in a pure ASCII string.
            const asciiString = Buffer.from(
                "arglebargleglopglyfarglebargleglopglyfarglebargleglopglyf");
            assert.equal(-1, asciiString.indexOf("\x2061"));
            assert.equal(3, asciiString.indexOf("leb", 0));

            // Search in string containing many non-ASCII chars.
            const allCodePoints = [];
            for (let i = 0; i < 65536; i++) {allCodePoints[i] = i};
            const allCharsString = String.fromCharCode.apply(String, allCodePoints);
            const allCharsBufferUtf8 = Buffer.from(allCharsString);
            const allCharsBufferUcs2 = Buffer.from(allCharsString, "ucs2");

            // Search for string long enough to trigger complex search with ASCII pattern
            // and UC16 subject.
            assert.equal(-1, allCharsBufferUtf8.indexOf("notfound"));
            assert.equal(-1, allCharsBufferUcs2.indexOf("notfound"));

            // Needle is longer than haystack, but only because it's encoded as UTF-16
            assert.equal(Buffer.from("aaaa").indexOf("a".repeat(4), "ucs2"), -1);

            assert.equal(Buffer.from("aaaa").indexOf("a".repeat(4), "utf8"), 0);
            assert.equal(Buffer.from("aaaa").indexOf("你好", "ucs2"), -1);

            // Haystack has odd length, but the needle is UCS2.
            assert.equal(Buffer.from("aaaaa").indexOf("b", "ucs2"), -1);

            {
                // Find substrings in Utf8.
                const lengths = [1, 3, 15]; // Single char, simple and complex.
                const indices = [0x5, 0x60, 0x400, 0x680, 0x7ee, 0xFF02, 0x16610, 0x2f77b];
                for (let lengthIndex = 0; lengthIndex < lengths.length; lengthIndex++) {
                    for (let i = 0; i < indices.length; i++) {
                        const index = indices[i];
                        let length = lengths[lengthIndex];

                        if (index + length > 0x7F) {
                            length = 2 * length;
                        }

                        if (index + length > 0x7FF) {
                            length = 3 * length;
                        }

                        if (index + length > 0xFFFF) {
                            length = 4 * length;
                        }

                        const patternBufferUtf8 = allCharsBufferUtf8.slice(index, index + length);
                        assert.equal(index, allCharsBufferUtf8.indexOf(patternBufferUtf8));

                        const patternStringUtf8 = patternBufferUtf8.toString();
                        assert.equal(index, allCharsBufferUtf8.indexOf(patternStringUtf8));
                    }
                }
            }

            {
                // Find substrings in Usc2.
                const lengths = [2, 4, 16]; // Single char, simple and complex.
                const indices = [0x5, 0x65, 0x105, 0x205, 0x285, 0x2005, 0x2085, 0xfff0];
                for (let lengthIndex = 0; lengthIndex < lengths.length; lengthIndex++) {
                    for (let i = 0; i < indices.length; i++) {
                        const index = indices[i] * 2;
                        const length = lengths[lengthIndex];

                        const patternBufferUcs2 =
                            allCharsBufferUcs2.slice(index, index + length);
                        assert.equal(
                            index, allCharsBufferUcs2.indexOf(patternBufferUcs2, 0, "ucs2"));

                        const patternStringUcs2 = patternBufferUcs2.toString("ucs2");
                        assert.equal(
                            index, allCharsBufferUcs2.indexOf(patternStringUcs2, 0, "ucs2"));
                    }
                }
            }

            [
                () => { },
                {},
                []
            ].forEach((val) => {
                debugger;
                assert.throws(() => b.indexOf(val), TypeError);
            });

            // Test weird offset arguments.
            // The following offsets coerce to NaN or 0, searching the whole Buffer
            assert.equal(b.indexOf("b", undefined), 1);
            assert.equal(b.indexOf("b", {}), 1);
            assert.equal(b.indexOf("b", 0), 1);
            assert.equal(b.indexOf("b", null), 1);
            assert.equal(b.indexOf("b", []), 1);

            // The following offset coerces to 2, in other words +[2] === 2
            assert.equal(b.indexOf("b", [2]), -1);

            // Behavior should match String.indexOf()
            assert.equal(
                b.indexOf("b", undefined),
                stringComparison.indexOf("b", undefined));
            assert.equal(
                b.indexOf("b", {}),
                stringComparison.indexOf("b", {}));
            assert.equal(
                b.indexOf("b", 0),
                stringComparison.indexOf("b", 0));
            assert.equal(
                b.indexOf("b", null),
                stringComparison.indexOf("b", null));
            assert.equal(
                b.indexOf("b", []),
                stringComparison.indexOf("b", []));
            assert.equal(
                b.indexOf("b", [2]),
                stringComparison.indexOf("b", [2]));

            // test truncation of Number arguments to uint8
            {
                const buf = Buffer.from("this is a test");
                assert.equal(buf.indexOf(0x6973), 3);
                assert.equal(buf.indexOf(0x697320), 4);
                assert.equal(buf.indexOf(0x69732069), 2);
                assert.equal(buf.indexOf(0x697374657374), 0);
                assert.equal(buf.indexOf(0x69737374), 0);
                assert.equal(buf.indexOf(0x69737465), 11);
                assert.equal(buf.indexOf(0x69737465), 11);
                assert.equal(buf.indexOf(-140), 0);
                assert.equal(buf.indexOf(-152), 1);
                assert.equal(buf.indexOf(0xff), -1);
                assert.equal(buf.indexOf(0xffff), -1);
            }

            // Test that Uint8Array arguments are okay.
            {
                const needle = new Uint8Array([0x66, 0x6f, 0x6f]);
                const haystack = new BufferList(Buffer.from("a foo b foo"));
                assert.equal(haystack.indexOf(needle), 2);
            }
        });
    });

    describe("promise api", () => {
        it("should support then", async () => {
            const data = await fs.createReadStream(__filename).pipe(new BufferList());
            expect(data).to.exist();
            expect(data.toString()).to.be.equal(await fs.readFile(__filename, "utf8"));
        });

        it("should support reject", async () => {
            await assert.throws(async () => {
                await fs.createReadStream("/does/not/exist").pipe(new BufferList());
            });
        });
    });
});
