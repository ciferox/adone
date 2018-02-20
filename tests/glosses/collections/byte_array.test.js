const {
    is,
    math: { Long },
    collection: { ByteArray }
} = adone;

describe("collection", "ByteArray", () => {
    it("init", () => {
        assert.ok(is.class(ByteArray));
    });

    describe("base", () => {
        it("allocate", () => {
            let bb = new ByteArray();
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 0);
            assert.strictEqual(bb.noAssert, ByteArray.DEFAULT_NOASSERT);
            assert.strictEqual(bb.buffer.length, bb.capacity);
            assert.strictEqual(bb.capacity, ByteArray.DEFAULT_CAPACITY);
            bb = ByteArray.alloc(undefined, !ByteArray.DEFAULT_NOASSERT);
            assert.strictEqual(bb.capacity, ByteArray.DEFAULT_CAPACITY);
            assert.strictEqual(bb.noAssert, !ByteArray.DEFAULT_NOASSERT);

            // Fixed set of properties
            for (const i in bb) {
                if (bb.hasOwnProperty(i) && !["roffset", "woffset", "markedOffset", "limit", "noAssert", "buffer", "view", "adone_tag"].includes(i)) {
                    assert.fail(0, 1, `Illegal enumerable property: ${i}`);
                }
            }
        });

        it("clone", () => {
            const bb = new ByteArray(1, true, false);
            const bb2 = bb.clone();
            assert.strictEqual(bb.buffer, bb2.buffer);
            assert.equal(bb.roffset, bb2.roffset);
            assert.equal(bb.woffset, bb2.woffset);
            assert.equal(bb.markedOffset, bb2.markedOffset);
            assert.equal(bb.littleEndian, bb2.littleEndian);
            assert.equal(bb.noAssert, bb2.noAssert);
            assert.notStrictEqual(bb, bb2);
        });

        it("assert", () => {
            const bb = new ByteArray();
            assert.strictEqual(bb.noAssert, false);
            assert.strictEqual(bb.assert(false), bb);
            assert.strictEqual(bb.noAssert, true);
            assert.strictEqual(bb.assert(true), bb);
            assert.strictEqual(bb.noAssert, false);
        });
    });

    describe("wrap", () => {
        it("Buffer", () => {
            const buf = Buffer.alloc(1);
            buf[0] = 0x01;
            const bb = ByteArray.wrap(buf);
            assert.strictEqual(bb.capacity, 1);
            assert.equal(Buffer.compare(bb.buffer, buf), 0);
            assert.strictEqual(bb.toDebug(), "<01]");
        });

        it("ArrayBuffer", () => {
            const buf = new ArrayBuffer(1);
            const bb = ByteArray.wrap(buf);
            assert.strictEqual(bb.capacity, 1);
            assert.ok(bb.buffer instanceof Buffer);
            assert.equal(bb.roffset, 0);
            assert.equal(bb.woffset, 1);
        });

        it("Uint8Array", () => {
            // Full view
            const buf = new Uint8Array(1);
            buf[0] = 0x01;
            const bb = ByteArray.wrap(buf);
            assert.strictEqual(bb.capacity, 1);
            assert.ok(bb.buffer instanceof Buffer);
            assert.strictEqual(bb.toDebug(), "<01]");
        });

        it("Array", () => {
            const arr = [1, 255, -1];
            const bb = ByteArray.wrap(arr);
            assert.strictEqual(bb.capacity, 3);
            assert.strictEqual(bb.toDebug(), "<01 FF FF]");
        });

        it("ByteArray", () => {
            const bb2 = ByteArray.wrap("\x12\x34\x56\x78", "binary");
            bb2.offset = 1;
            const bb = ByteArray.wrap(bb2);
            assert.strictEqual(bb2.roffset, bb.roffset);
            assert.strictEqual(bb2.woffset, bb.woffset);
            assert.strictEqual(bb2.capacity, bb.capacity);
            assert.strictEqual(bb2.toString("debug"), bb.toString("debug"));
        });

        it("string", () => {
            const bb = ByteArray.wrap("\u0061\u0062");
            assert.equal(bb.toDebug(), "<61 62]");
        });
    });

    describe("encodings", () => {
        it("UTF8", () => {
            ["aäöüß€b", ""].forEach((str) => {
                const bb = ByteArray.wrap(str, "utf8"); // Calls ByteArray#fromUTF8
                assert.strictEqual(bb.toUTF8(), str);
                if (str.length > 2) {
                    bb.roffset = 1;
                    bb.woffset = bb.capacity - 1;
                    assert.strictEqual(bb.toUTF8(), str.substring(1, str.length - 1));
                }
            });
        });

        it("debug", () => {
            ["60<61 62>63*", "<60 61 62 63]", "|", "^61*", "12|"].forEach((str) => {
                const bb = ByteArray.wrap(str, "debug"); // Calls ByteArray#fromDebug
                assert.equal(bb.toDebug(), str);
            });
        });

        it("binary", () => {
            ["\x61\x62\x63\x64", "", "  "].forEach((str) => {
                const bb = ByteArray.wrap(str, "binary"); // Calls ByteArray#fromBinary
                assert.strictEqual(bb.toBinary(), str);
                if (str.length > 2) {
                    bb.roffset = 1;
                    bb.woffset = bb.capacity - 1;
                    assert.strictEqual(bb.toBinary(), str.substring(1, str.length - 1));
                }
            });
        });

        it("hex", () => {
            ["61626364", "61", ""].forEach((str) => {
                const bb = ByteArray.wrap(str, "hex"); // Calls ByteArray#fromHex
                assert.strictEqual(bb.toHex(), str);
                if (str.length > 2) {
                    bb.roffset = 1;
                    bb.woffset = bb.capacity - 1;
                    assert.strictEqual(bb.toHex(), str.substring(2, str.length - 2));
                }
            });
        });

        it("base64", () => {
            ["", "YWI=", "YWJjZGVmZw==", "YWJjZGVmZ2g=", "YWJjZGVmZ2hp"].forEach((str) => {
                const bb = ByteArray.wrap(str, "base64"); // Calls ByteArray#fromBase64
                assert.strictEqual(bb.toBase64(), str);
                if (str.length > 8) {
                    bb.roffset = 3;
                    bb.woffset = bb.roffset + 3;
                    assert.strictEqual(bb.toBase64(), str.substr(4, 4));
                }
            });
        });
    });

    describe("methods", () => {
        it("concat", () => {
            const bbs = [
                new ArrayBuffer(1),
                ByteArray.fromDebug("00<01 02]"),
                ByteArray.fromDebug("00 01 02<03>00*"),
                ByteArray.fromDebug("00|"),
                ByteArray.fromDebug("<04]"),
                Buffer.alloc(0),
                new Uint8Array(0),
                "05"
            ];
            let bb = ByteArray.concat(bbs, "hex", !ByteArray.DEFAULT_NOASSERT);
            assert.strictEqual(bb.noAssert, !ByteArray.DEFAULT_NOASSERT);
            assert.equal(bb.toDebug(), "<00 01 02 03 04 05]");
            bb = ByteArray.concat([]);
            assert.strictEqual(bb.buffer, new ByteArray(0).buffer); // EMPTY_BUFFER
        });

        it("resize", () => {
            const bb = new ByteArray(1);
            bb.roffset = bb.woffset = 1;
            bb.resize(2);
            bb.fill(0, 0, 2);
            assert.equal(bb.capacity, 2);
            assert.equal(bb.toDebug(), "00^00*");
        });

        it("ensureCapacity", () => {
            const bb = new ByteArray(5);
            assert.equal(bb.capacity, 5);
            bb.ensureCapacity(6); // Doubles
            assert.equal(bb.capacity, 10);
            bb.ensureCapacity(21); // Uses 21
            assert.equal(bb.capacity, 21);
        });

        it("slice", () => {
            const b = ByteArray.wrap("\x12\x34\x56");
            const b2 = b.slice(1, 3);
            const b3 = ByteArray.wrap("\x34\x56");
            assert.equal(Buffer.compare(b2.buffer, b3.buffer), 0);
        });

        it("reset", () => {
            const bb = ByteArray.wrap("\x12\x34\x56\x78");
            bb.reset();
            assert.equal(bb.roffset, 0);
            bb.roffset = 1;
            bb.woffset = 2;
            bb.reset(true);
            assert.equal(bb.roffset, 0);
            assert.equal(bb.woffset, 0);
        });

        it("copy", () => {
            const bb = ByteArray.wrap("\x01");
            const bb2 = bb.copy();
            assert.equal(bb.roffset, 0);
            assert.notStrictEqual(bb, bb2);
            assert.notStrictEqual(bb.buffer, bb2.buffer);
            assert.equal(bb2.roffset, bb.roffset);
            assert.equal(bb2.markedOffset, bb.markedOffset);
            assert.equal(bb2.littleEndian, bb.littleEndian);
            assert.equal(bb2.noAssert, bb.noAssert);
        });

        it("copyTo", () => {
            const bb = ByteArray.wrap("\x01");
            const bb2 = new ByteArray(2).fill(0);
            assert.equal(bb.toDebug(), "<01]");
            assert.equal(bb2.toDebug(), "<00 00]");
            // Modifies source and target offsets
            bb2.reset(true);
            bb.copyTo(bb2 /* all offsets omitted */);
            assert.equal(bb.toDebug(), "01|"); // Read 1 byte
            assert.equal(bb2.toDebug(), "<01>00*"); // Written 1 byte
            bb.reset();
            assert.equal(bb.toDebug(), "<01]");
            // Again, but with bb2.offset=1
            bb.copyTo(bb2 /* all offsets omitted */);
            assert.equal(bb.toDebug(), "01|"); // Read 1 byte
            assert.equal(bb2.toDebug(), "<01 01]"); // Written 1 byte at 2
            bb.reset();
            bb2.reset(true).fill(0);
            // Modifies source offsets only
            bb.copyTo(bb2, 0 /* source offsets omitted */);
            assert.equal(bb.toDebug(), "01|"); // Read 1 byte
            assert.equal(bb2.toDebug(), "<01 00]"); // Written 1 byte (no change)
            // Modifies no offsets at all
            bb.reset();
            bb2.reset(true).fill(0);
            bb.copyTo(bb2, 1, 0, bb.capacity /* no offsets omitted */);
            assert.equal(bb.toDebug(), "<01]"); // Read 1 byte (no change)
            assert.equal(bb2.toDebug(), "<00 01]"); // Written 1 byte (no change)
        });

        it("compact", () => {
            const bb = ByteArray.wrap("\x01\x02");
            let prevBuffer = bb.buffer;
            bb.compact();
            assert.strictEqual(bb.buffer, prevBuffer);
            assert.equal(bb.capacity, 2);
            assert.equal(bb.roffset, 0);

            // Empty region
            bb.roffset = 1;
            prevBuffer = bb.buffer;
            bb.compact();
            assert.notStrictEqual(bb.buffer, prevBuffer);
            assert.equal(bb.capacity, 1);
            assert.equal(bb.roffset, 0);
        });

        it("reverse", () => {
            const bb = ByteArray.wrap("\x12\x34\x56\x78");
            bb.reverse(1, 3);
            assert.equal(bb.toString("debug"), "<12 56 34 78]");
            bb.reverse();
            assert.equal(bb.toString("debug"), "<78 34 56 12]");
            bb.roffset = 1;
            bb.woffset = 3;
            bb.reverse();
            assert.equal(bb.toString("debug"), "78<56 34>12*");
            bb.reverse(0, 4).reset(true);
            assert.equal(bb.toString("debug"), "^12 34 56 78*");
        });

        it("write", () => {
            const bb = ByteArray.wrap("\x12\x34");
            const bb2 = ByteArray.wrap("\x56\x78");
            bb.roffset = 2;
            bb.write(bb2); // Modifies offsets of both
            assert.equal(bb.toString("debug"), "12 34<56 78]");
            assert.equal(bb2.toString("debug"), "56 78|");
            bb2.reset();
            bb.write(bb2, 1); // Modifies offsets of bb2 only
            assert.equal(bb.toString("debug"), "12 56<78 78]");
            assert.equal(bb2.toString("debug"), "56 78|");
        });

        describe("writeBuffer", () => {
            it("should prepend a buffer", () => {
                const b = new ByteArray();
                b.writeBuffer(Buffer.from("hello"));
                b.writeBuffer(Buffer.from(" "));
                b.writeBuffer(Buffer.from("world"));
                expect(b.toBuffer()).to.be.deep.equal(Buffer.from("hello world"));
            });

            it("should write at the given offset", () => {
                const b = new ByteArray();
                b.writeBuffer(Buffer.alloc(7)); // TODO: WTF, otherways it does not work, because the offset prop is zero
                b.writeBuffer(Buffer.from("hello"), 0);
                b.writeBuffer(Buffer.from(" "), 1);
                b.writeBuffer(Buffer.from("world"), 2);
                expect(b.toBuffer()).to.be.deep.equal(Buffer.from("h world"));
            });
        });

        it("prepend", () => {
            const bb = ByteArray.wrap("\x12\x34");
            const bb2 = ByteArray.wrap("\x56\x78");
            assert.strictEqual(bb.prepend(bb2), bb); // Relative prepend at 0, 2 bytes (2 overflow)
            assert.equal(bb.toDebug(), "<56 78 12 34]");
            assert.equal(bb2.toDebug(), "56 78|");
            bb.roffset = 4;
            bb2.roffset = 1;
            bb.prepend(bb2, 3); // Absolute prepend at 3, 1 byte
            assert.equal(bb.toDebug(), "56 78 78 34|");
            assert.equal(bb2.toDebug(), "56 78|");
            bb2.roffset = 0;
            bb.prepend(bb2); // Relative prepend at 4, 2 bytes
            assert.equal(bb.toDebug(), "56 78<56 78]");
            assert.equal(bb2.toDebug(), "56 78|");
            bb.roffset = 3;
            bb2.roffset = 0;
            assert.throws(() => {
                bb.prepend(bb2, 6); // Absolute out of bounds
            }, adone.error.NotValid);
            bb.prepend("abcde", "utf8"); // Relative prepend at 3, 5 bytes (1 overflow)
            assert.equal(bb.toDebug(), "<61 62 63 64 65 78]");
        });

        it("prependTo", () => {
            const bb = ByteArray.wrap("\x12\x34");
            const bb2 = ByteArray.wrap("\x56\x78");
            assert.strictEqual(bb2.prependTo(bb), bb2);
            assert.equal(bb.toDebug(), "<56 78 12 34]");
            assert.equal(bb2.toDebug(), "56 78|");
        });

        it("length", () => {
            const bb = ByteArray.wrap("\x12\x34");
            assert.strictEqual(bb.length, 2);
            bb.roffset = 2;
            assert.strictEqual(bb.length, 0);
            bb.roffset = 3;
            assert.strictEqual(bb.length, -1);
        });

        it("skipRead", () => {
            const bb = ByteArray.wrap("\x12\x34\x56");
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 3);
            bb.skipRead(3);
            assert.strictEqual(bb.roffset, 3);
            assert.strictEqual(bb.woffset, 3);
            assert.strictEqual(bb.noAssert, false);
            assert.throws(() => {
                bb.skipRead(1);
            }, adone.error.NotValid);
            assert.strictEqual(bb.roffset, 3);
            assert.strictEqual(bb.woffset, 3);
            bb.noAssert = true;
            assert.doesNotThrow(() => {
                bb.skipRead(1);
            });
            assert.strictEqual(bb.roffset, 4);
            assert.strictEqual(bb.woffset, 3);
        });

        it("skipWrite", () => {
            const bb = new ByteArray(3);
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 0);
            bb.skipWrite(3);
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 3);
            assert.strictEqual(bb.noAssert, false);
            assert.throws(() => {
                bb.skipWrite(1);
            }, adone.error.NotValid);
            assert.strictEqual(bb.woffset, 3);
            assert.strictEqual(bb.roffset, 0);
            bb.noAssert = true;
            assert.doesNotThrow(() => {
                bb.skipWrite(1);
            });
            assert.strictEqual(bb.woffset, 4);
        });

        it("order", () => {
            // assert.strictEqual(ByteArray.LITTLE_ENDIAN, true);
            // assert.strictEqual(ByteArray.BIG_ENDIAN, false);
            const bb = new ByteArray(2);
            // assert.strictEqual(bb.littleEndian, false);
            bb.writeInt32BE(0x12345678);
            bb.reset();
            assert.strictEqual(bb.toHex(), "12345678");
            bb.reset(true);
            bb.writeInt32LE(0x12345678);
            bb.reset();
            assert.strictEqual(bb.toHex(), "78563412");
        });
    });

    describe("types", () => {
        const types = [
            // name          | size | input                                   | output                                  | BE representation
            ["Int8", 1, 0xFE, -2, "fe"],
            ["UInt8", 1, -2, 0xFE, "fe"],
            ["Int16", 2, 0xFFFE, -2, "fffe"],
            ["UInt16", 2, -2, 0xFFFE, "fffe"],
            ["Int32", 4, 0xFFFFFFFE, -2, "fffffffe"],
            ["UInt32", 4, -2, 0xFFFFFFFE, "fffffffe"],
            ["Float", 4, 0.5, 0.5, "3f000000"],
            ["Double", 8, 0.1, 0.1, "3fb999999999999a"],
            ["Int64", 8, new Long(0xFFFFFFFE, 0xFFFFFFFF, true), new Long(0xFFFFFFFE, 0xFFFFFFFF, false), "fffffffffffffffe"],
            ["UInt64", 8, new Long(0xFFFFFFFE, 0xFFFFFFFF, false), new Long(0xFFFFFFFE, 0xFFFFFFFF, true), "fffffffffffffffe"],

            // name          | size | input                                   | output                                  | representation
            ["Varint32", 5, 0xFFFFFFFE, -2, "feffffff0f"],
            ["Varint32ZigZag", 1, -1, -1, "01"],
            ["Varint64", 10, new Long(0xFFFFFFFE, 0xFFFFFFFF, true), new Long(0xFFFFFFFE, 0xFFFFFFFF, false), "feffffffffffffffff01"],
            ["Varint64ZigZag", 1, Long.fromNumber(-1), Long.fromNumber(-1), "01"]
        ];

        types.forEach((type) => {
            const [name, size, input, output, be] = type;
            const varint = name.includes("Varint");
            const byte = name.toLowerCase().includes("int8");
            let le = "";
            for (let i = be.length; i > 0; i -= 2) {
                le += be.substr(i - 2, 2);
            }
            it(name.toLowerCase(), () => {
                const bb = new ByteArray(size);
                let writeLE;
                let readLE;
                let writeBE;
                let readBE;
                if (varint || byte) {
                    writeLE = `write${name}`;
                    readLE = `read${name}`;
                    writeBE = writeLE;
                    readBE = readLE;
                } else {
                    writeLE = `write${name}LE`;
                    readLE = `read${name}LE`;
                    writeBE = `write${name}BE`;
                    readBE = `read${name}BE`;
                }
                assert.property(bb, writeLE);
                assert.property(bb, readLE);
                assert.property(bb, writeBE);
                assert.property(bb, readBE);

                // Relative BE (always LE for varints)
                assert.strictEqual(bb[writeBE](input), bb);
                let val = bb[readBE]();
                if (output instanceof Long) {
                    assert.deepEqual(val, output);
                } else {
                    assert.strictEqual(val, output);
                }
                bb.reset();
                assert.strictEqual(bb.toHex(), be);
                if (!varint && !byte) {
                    bb.reset(true);
                    // Relative LE
                    bb[writeLE](input);
                    val = bb[readLE]();
                    if (output instanceof Long) {
                        assert.deepEqual(val, output);
                    } else {
                        assert.strictEqual(val, output);
                    }
                    bb.reset();
                    assert.strictEqual(bb.toHex(), le);
                }
                assert.throws(() => { // OOB
                    bb.roffset = bb.capacity - size + 1;
                    bb[readLE](input);
                });
                assert.doesNotThrow(() => { // OOB, automatic resizing * 2
                    bb[writeLE](input);
                });
                assert.strictEqual(bb.capacity, size * 2);
                // Absolute
                bb.reset(true);
                if (!varint) {
                    assert.strictEqual(bb[writeLE](input, 1), bb);
                } else {
                    assert.strictEqual(bb[writeLE](input, 1), size);
                }
                val = bb[readLE](1);
                if (output instanceof Long) {
                    if (!varint) {
                        assert.deepEqual(val, output);
                    } else {
                        assert.deepEqual(val, { value: output, length: size });
                    }
                } else {
                    if (!varint) {
                        assert.strictEqual(val, output);
                    } else {
                        assert.deepEqual(val, { value: output, length: size });
                    }
                }
            });
        });

        it("bitset", () => {
            const bb = new ByteArray(2);

            const run = (data) => {
                bb.reset(true);
                bb.writeBitSet(data);
                assert.deepEqual(bb.readBitSet(), data);
            };

            run([]);
            run([true]);
            run([false]);
            run([false, true]);
            run([false, false, false, false, false, false, false, false]);
            run([true, false, true, false, true, false, true, false]);
            run([true, true, true, true, true, true, true, true]);
            run([true, false, true, false, true, false, true, false]);
            run([true, false, true, false, true, false, true, false, true]);

            bb.reset(true);
            // eslint-disable-next-line
            bb.writeBitSet([, null, "", 0, 42, "hello world", new Date(0), {}, []]);
            assert.deepEqual(bb.readBitSet(), [false, false, false, false, true, true, true, true, true]);
        });

        it("calculateVarint", () => {
            assert.equal(ByteArray.MAX_VARINT32_BYTES, 5);
            assert.equal(ByteArray.MAX_VARINT64_BYTES, 10);
            let values = [
                [0, 1],
                [-1, 5, 10],
                [1 << 7, 2],
                [1 << 14, 3],
                [1 << 21, 4],
                [1 << 28, 5],
                [0x7FFFFFFF | 0, 5],
                [0xFFFFFFFF, 5],
                [0xFFFFFFFF | 0, 5, 10]
            ];
            for (let i = 0; i < values.length; i++) {
                assert.equal(ByteArray.calculateVarint32(values[i][0]), values[i][1]);
                assert.equal(ByteArray.calculateVarint64(values[i][0]), values[i].length > 2 ? values[i][2] : values[i][1]);
            }
            values = [
                [Long.fromNumber(1).shl(35), 6],
                [Long.fromNumber(1).shl(42), 7],
                [Long.fromNumber(1).shl(49), 8],
                [Long.fromNumber(1).shl(56), 9],
                [Long.fromNumber(1).shl(63), 10],
                [Long.fromNumber(1, true).shl(63), 10]
            ];
            for (let i = 0; i < values.length; i++) {
                assert.equal(ByteArray.calculateVarint64(values[i][0]), values[i][1]);
            }
        });

        it("zigZagVarint", () => {
            let values = [
                [0, 0],
                [-1, 1],
                [1, 2],
                [-2, 3],
                [2, 4],
                [-3, 5],
                [3, 6],
                [2147483647, 4294967294],
                [-2147483648, 4294967295]
            ];
            for (let i = 0; i < values.length; i++) {
                assert.equal(ByteArray.zigZagEncode32(values[i][0]), values[i][1]);
                assert.equal(ByteArray.zigZagDecode32(values[i][1]), values[i][0]);
                assert.equal(ByteArray.zigZagEncode64(values[i][0]).toNumber(), values[i][1]);
                assert.equal(ByteArray.zigZagDecode64(values[i][1]).toNumber(), values[i][0]);
            }
            values = [
                [Long.MAX_VALUE, Long.MAX_UNSIGNED_VALUE.sub(Long.ONE)],
                [Long.MIN_VALUE, Long.MAX_UNSIGNED_VALUE]
            ];
            // NOTE: Even 64bit doubles from toNumber() fail for these values so we are using toString() here
            for (let i = 0; i < values.length; i++) {
                assert.equal(ByteArray.zigZagEncode64(values[i][0]).toString(), values[i][1].toString());
                assert.equal(ByteArray.zigZagDecode64(values[i][1]).toString(), values[i][0].toString());
            }

            // 32 bit ZZ
            values = [
                0,
                1,
                300,
                -300,
                2147483647,
                -2147483648
            ];
            let bb = new ByteArray(10);
            for (let i = 0; i < values.length; i++) {
                const encLen = bb.writeVarint32ZigZag(values[i], 0);
                bb.limit = encLen;
                const dec = bb.readVarint32ZigZag(0);
                assert.equal(dec.value, values[i]);
                assert.equal(encLen, dec.length);
                bb.reset(true);
            }

            // 64 bit ZZ
            values = [
                Long.ONE, 1,
                Long.fromNumber(-3),
                Long.fromNumber(300),
                Long.fromNumber(-300),
                Long.fromNumber(0x7FFFFFFF),
                Long.fromNumber(0x8FFFFFFF),
                Long.fromNumber(0xFFFFFFFF),
                Long.fromBits(0xFFFFFFFF, 0x7FFFFFFF),
                Long.fromBits(0xFFFFFFFF, 0xFFFFFFFF)
            ];
            bb = new ByteArray(10);
            for (let i = 0; i < values.length; i++) {
                const encLen = bb.writeVarint64ZigZag(values[i], 0);
                const dec = bb.readVarint64ZigZag(0);
                assert.equal(values[i].toString(), dec.value.toString());
                assert.equal(encLen, dec.length);
            }
        });

        it("utf8string", () => {
            const bb = new ByteArray(2);
            const str = "ä☺𠜎️☁️";
            let str2;
            // Writing
            assert.strictEqual(bb.writeString(str), bb);
            bb.reset();
            // Reading
            str2 = bb.readString(ByteArray.calculateUTF8Chars(str), ByteArray.METRICS_CHARS);
            assert.strictEqual(str2.length, str.length);
            assert.strictEqual(str2, str);
            bb.reset();
            str2 = bb.readString(bb.capacity, ByteArray.METRICS_BYTES);
            assert.strictEqual(str2, str);
        });

        it("vstring", () => {
            const bb = new ByteArray(2);
            bb.writeVString("ab"); // resizes to 2*2=4
            assert.strictEqual(bb.capacity, 4);
            assert.strictEqual(bb.woffset, 3);
            assert.equal(bb.toString("debug").substr(0, 10), "<02 61 62>");
            assert.deepEqual(bb.readVString(0), { string: "ab", length: 3 });
            assert.equal(bb.toString("debug").substr(0, 10), "<02 61 62>");
            assert.equal(bb.readVString(), "ab");
            assert.equal(bb.toString("debug").substr(0, 9), "02 61 62^");
        });

        it("cstring", () => {
            const bb = new ByteArray(2);
            bb.writeCString("a");
            assert.equal(bb.capacity, 2);
            assert.equal(bb.woffset, 2);
            bb.woffset = 1;
            bb.writeCString("b"); // resizes to 4
            assert.equal(bb.capacity, 4);
            assert.equal(bb.woffset, 3);
            assert.equal(bb.toString("debug").substr(0, 10), "<61 62 00>");
            assert.deepEqual(bb.readCString(0), { string: "ab", length: 3 });
            assert.equal(bb.toString("debug").substr(0, 10), "<61 62 00>");
            assert.equal(bb.readCString(), "ab");
            assert.equal(bb.toString("debug").substr(0, 9), "61 62 00^");
        });
    });

    describe("convert", () => {
        it("toHex", () => {
            const bb = new ByteArray(4);
            bb.writeUInt16BE(0x1234);
            bb.writeUInt8(0x56);
            assert.equal(bb.toHex(), "123456");
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 3);
            assert.equal(bb.toHex(1), "3456");
            assert.equal(bb.toHex(1, 2), "34");
            assert.equal(bb.toHex(1, 1), "");
            assert.throws(() => {
                bb.toHex(1, 0);
            });
        });

        it("toBase64", () => {
            const bb = new ByteArray(8);
            bb.writeString("abcdefg"); // 7 chars
            assert.equal(bb.toBase64(), "YWJjZGVmZw==");
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 7);
            assert.equal(bb.toBase64(3), "ZGVmZw==");
            assert.equal(bb.toBase64(3, 6), "ZGVm");
            assert.equal(bb.toBase64(3, 3), "");
            assert.throws(() => {
                bb.toBase64(1, 0);
            });
        });

        it("toBinary", () => {
            const bb = new ByteArray(5);
            bb.writeUInt32BE(0x001234FF);
            // bb.flip();
            assert.strictEqual(bb.toBinary(), "\x00\x12\x34\xFF");
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 4);
        });

        it("toString", () => {
            const bb = new ByteArray(3);
            bb.writeUInt16BE(0x6162);
            assert.equal(bb.toString("hex"), "6162");
            assert.equal(bb.toString("base64"), "YWI=");
            assert.equal(bb.toString("utf8"), "ab");
            assert.equal(bb.toString("debug").substr(0, 7), "<61 62>");
            assert.equal(bb.toString(), "ByteArrayNB(roffset=0,woffset=2,capacity=3)");
            assert.strictEqual(bb.roffset, 0);
            assert.strictEqual(bb.woffset, 2);
        });

        it("toBuffer", () => {
            const bb = new ByteArray(2);
            bb.writeUInt16BE(0x1234);
            let buf = bb.toBuffer();
            assert.strictEqual(buf, bb.buffer);
            assert.ok(buf instanceof Buffer);
            assert.strictEqual(buf.length, 2);
            bb.woffset = 1;
            buf = bb.toBuffer();
            assert.notStrictEqual(buf, bb.buffer);
            assert.ok(buf instanceof Buffer);
            assert.strictEqual(buf.length, 1);
        });

        it("toArrayBuffer", () => {
            const bb = new ByteArray(3);
            assert.ok(bb.buffer instanceof Buffer);
            bb.writeUInt16BE(0x1234);
            bb.roffset = 1;
            const ab = bb.toArrayBuffer();
            assert.ok(ab instanceof ArrayBuffer);
            assert.strictEqual(ab.byteLength, 1);
        });
    });

    describe("misc", () => {
        it("pbjsi19", () => {
            // assert that this issue is fixed: https://github.com/dcodeIO/ProtoBuf.js/issues/19
            const bb = new ByteArray(9); // Trigger resize to 18 in writeVarint64
            bb.writeVarint32(16);
            bb.writeVarint32(2);
            bb.writeVarint32(24);
            bb.writeVarint32(0);
            bb.writeVarint32(32);
            bb.writeVarint64(Long.fromString("1368057600000"));
            bb.writeVarint32(40);
            bb.writeVarint64(Long.fromString("1235455123"));
            bb.reset();
            assert.equal(bb.toString("debug").substr(0, 52), "<10 02 18 00 20 80 B0 D9 B4 E8 27 28 93 99 8E CD 04>");
        });

        it("NaN", () => {
            const bb = new ByteArray(4);
            assert.ok(isNaN(bb.writeFloatBE(NaN).readFloatBE(0)));
            bb.reset(true);
            assert.strictEqual(bb.writeFloatBE(Number(Infinity)).readFloatBE(0), Number(Infinity));
            bb.reset(true);
            assert.strictEqual(bb.writeFloatBE(-Infinity).readFloatBE(0), -Infinity);
            bb.resize(8).reset(true);
            assert.ok(isNaN(bb.writeDoubleBE(NaN).readDoubleBE(0)));
            bb.reset(true);
            assert.strictEqual(bb.writeDoubleBE(Number(Infinity)).readDoubleBE(0), Number(Infinity));
            bb.reset(true);
            assert.strictEqual(bb.writeDoubleBE(-Infinity).readDoubleBE(0), -Infinity);

            // letints, however, always need a cast, which results in the following:
            assert.strictEqual(NaN >>> 0, 0);
            assert.strictEqual(NaN | 0, 0);
            assert.strictEqual(Infinity >>> 0, 0);
            assert.strictEqual(Infinity | 0, 0);
            assert.strictEqual(-Infinity >>> 0, 0);
            assert.strictEqual(-Infinity | 0, 0);
        });
    });
});
