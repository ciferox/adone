describe("collections", "buffer list", () => {
    const { is, std: { crypto }, collection: { BufferList } } = adone;
    const encodings = "hex utf8 utf-8 ascii binary base64  ucs2 ucs-2 utf16le utf-16le".split(" ");

    it("single bytes from single buffer", () => {
        const bl = new BufferList();
        bl.append(Buffer.from("abcd"));

        assert.equal(bl.length, 4);

        assert.equal(bl.get(0), 97);
        assert.equal(bl.get(1), 98);
        assert.equal(bl.get(2), 99);
        assert.equal(bl.get(3), 100);

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
        assert(bl.append(Buffer.from("abcd")) === bl);
        assert(bl.append([Buffer.from("abcd")]) === bl);
        assert(bl.append(new BufferList(Buffer.from("abcd"))) === bl);
        assert(bl.append([new BufferList(Buffer.from("abcd"))]) === bl);
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

    // !process.browser && tape("test stream", function (done) {
    //     const random = crypto.randomBytes(65534);
    //     const rndhash =  crypto.createHash("md5").update() hash(random, "md5");
    //     const md5sum = crypto.createHash("md5");
    //     const bl     = new BufferList(function (err, buf) {
    //         assert(Buffer.isBuffer(buf));
    //         assert(err === null);
    //         assert.equal(rndhash, hash(bl.slice(), "md5"));
    //         assert.equal(rndhash, hash(buf, "md5"));

    //         bl.pipe(fs.createWriteStream("/tmp/bl_test_rnd_out.dat"))
    //           .on("close", function () {
    //               const s = fs.createReadStream("/tmp/bl_test_rnd_out.dat");
    //               s.on("data", md5sum.update.bind(md5sum));
    //               s.on("end", function() {
    //                   assert.equal(rndhash, md5sum.digest("hex"), "woohoo! correct hash!");
    //                   done();
    //               });
    //           });

    //     });

    //     fs.writeFileSync("/tmp/bl_test_rnd.dat", random);
    //     fs.createReadStream("/tmp/bl_test_rnd.dat").pipe(bl);
    // });

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

    it("write nothing, should get empty buffer", () => {

        new BufferList((err, data) => {
            assert(!err, "no error");
            assert(is.buffer(data), "got a buffer");
            assert.equal(0, data.length, "got a zero-length buffer");
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

    // !process.browser && it("destroy with pipe before read end", () => {


    //     const bl = new BufferList();
    //     fs.createReadStream(__dirname + "/test.js")
    //         .pipe(bl);

    //     bl.destroy();

    //     assert.equal(bl._bufs.length, 0);
    //     assert.equal(bl.length, 0);

    // });

    // !process.browser && it("destroy with pipe before read end with race", () => {


    //     const bl = new BufferList();
    //     fs.createReadStream(__dirname + "/test.js")
    //         .pipe(bl);

    //     setTimeout(function () {
    //         bl.destroy();
    //         setTimeout(function () {
    //             assert.equal(bl._bufs.length, 0);
    //             assert.equal(bl.length, 0);
    //         }, 500);
    //     }, 500);
    // });

    // !process.browser && it("destroy with pipe after read end", () => {


    //     const bl = new BufferList();
    //     fs.createReadStream(__dirname + "/test.js")
    //         .on("end", onEnd)
    //         .pipe(bl);

    //     function onEnd() {
    //         bl.destroy();

    //         assert.equal(bl._bufs.length, 0);
    //         assert.equal(bl.length, 0);
    //     }
    // });

    // !process.browser && it("destroy with pipe while writing to a destination", () => {
    //

    //     let bl = new BufferList()
    //         , ds = new BufferList();

    //     fs.createReadStream(__dirname + "/test.js")
    //         .on("end", onEnd)
    //         .pipe(bl);

    //     function onEnd() {
    //         bl.pipe(ds);

    //         setTimeout(function () {
    //             bl.destroy();

    //             assert.equal(bl._bufs.length, 0);
    //             assert.equal(bl.length, 0);

    //             ds.destroy();

    //             assert.equal(bl._bufs.length, 0);
    //             assert.equal(bl.length, 0);

    //         }, 100);
    //     }
    // });

    // !process.browser && it("handle error", () => {
    //
    //     fs.createReadStream("/does/not/exist").pipe(BufferList(function (err, data) {
    //         assert(err instanceof Error, "has error");
    //         t.notOk(data, "no data");
    //     }));
    // });

});
