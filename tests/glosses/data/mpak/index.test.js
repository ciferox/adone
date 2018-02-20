const {
    error: { IncompleteBufferError },
    data: { mpak: { Serializer, serializer } },
    math: { Long },
    std: { fs, path },
    collection: { ByteArray }
} = adone;

describe("data", "mpak", "Serializer", () => {
    it("encode/decode booleans", () => {
        let input = true;
        let encoded = serializer.encode(input);
        let output = serializer.decode(encoded);
        assert.strictEqual(input, output);

        input = false;
        encoded = serializer.encode(input);
        output = serializer.decode(encoded);
        assert.strictEqual(input, output);
    });

    describe("1-byte-length-buffers", () => {
        const build = function (size) {
            const buf = Buffer.allocUnsafe(size);
            buf.fill("a");

            return buf;
        };

        describe("encode/decode 2^8-1 bytes buffers", () => {
            const all = [];

            all.push(build(Math.pow(2, 8) - 1));
            all.push(build(Math.pow(2, 6) + 1));
            all.push(build(1));
            all.push(Buffer.allocUnsafe(0));

            all.forEach((orig) => {
                it(`mirror test a buffer of length ${orig.length}`, () => {
                    const input = orig;
                    const encoded = serializer.encode(input);
                    const output = serializer.decode(encoded);
                    assert.equal(Buffer.compare(output, input), 0);
                    // assert.equal(serializer.decode(serializer.encode(orig)).toString(), orig.toString(), 'must stay the same')
                });
            });
        });

        it("decoding a chopped 2^8-1 bytes buffer", () => {
            const orig = build(Math.pow(2, 6));
            let buf = Buffer.allocUnsafe(2 + orig.length);
            buf[0] = 0xc4;
            buf[1] = Math.pow(2, 8) - 1; // set bigger size
            orig.copy(buf, 2);
            buf = ByteArray.wrap(buf);
            const origLength = buf.length;
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
            assert.equal(buf.length, origLength - 2, "should consume two bytes");
        });

        it("decoding an incomplete header of 2^8-1 bytes buffer", () => {
            let buf = Buffer.allocUnsafe(1);
            buf[0] = 0xc4;
            buf = ByteArray.wrap(buf);
            const origLength = buf.length;
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
            assert.equal(buf.length, origLength - 1, "should consume one byte");
        });
    });

    describe("1-byte-length-exts", () => {
        const serializer = new Serializer();

        const MyType = function (size, value) {
            this.value = value;
            this.size = size;
        };

        const mytypeEncode = function (obj, resbuf) {
            const buf = Buffer.allocUnsafe(obj.size);
            buf.fill(obj.value);
            resbuf.write(buf);
        };

        const mytypeDecode = function (buf) {
            const result = new MyType(buf.length, buf.toString("utf8", 0, 1));

            for (let i = 0; i < buf.length; i++) {
                if (buf.readUInt8(0) !== buf.readUInt8(i)) {
                    throw new Error("should all be the same");
                }
            }

            return result;
        };

        serializer.register(0x42, MyType, mytypeEncode, mytypeDecode);

        it("encode/decode variable ext data up to 0xff", () => {
            const all = [];

            // no 1 as it's a fixext
            // no 2 as it's a fixext
            all.push(new MyType(3, "a"));
            // no 4 as it's a fixext
            all.push(new MyType(5, "a"));
            all.push(new MyType(6, "a"));
            all.push(new MyType(7, "a"));
            // no 8 as it's a fixext
            all.push(new MyType(9, "a"));
            all.push(new MyType(10, "a"));
            all.push(new MyType(11, "a"));
            all.push(new MyType(12, "a"));
            all.push(new MyType(13, "a"));
            all.push(new MyType(14, "a"));
            all.push(new MyType(15, "a"));
            // no 16 as it's a fixext
            all.push(new MyType(17, "a"));

            all.push(new MyType(255, "a"));

            all.forEach((orig) => {
                const encoded = serializer.encode(orig);
                const output = serializer.decode(encoded);
                assert.deepEqual(output, orig, `custom obj of length ${orig.size} must stay the same`);
            });
        });

        it("decoding an incomplete variable ext data up to 0xff", () => {
            const length = 250;
            const obj = serializer.encode(new MyType(length, "a"));
            let buf = Buffer.allocUnsafe(length);
            buf[0] = 0xc7;
            buf.writeUInt8(length + 2, 1); // set bigger size
            obj.buffer.copy(buf, 2, 2, length);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of variable ext data up to 0xff", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xc7;
            buf = new ByteArray().write(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("1-byte-length-strings", () => {
        it("encode/decode 32 <-> (2^8-1) bytes strings", () => {
            const all = [];
            let i;

            // build base
            for (i = "a"; i.length < 32; i += "a") {
                //
            }

            for (; i.length < Math.pow(2, 8); i += "aaaaa") {
                all.push(i);
            }

            all.forEach((str) => {
                assert.equal(serializer.decode(serializer.encode(str)), str, `string of length ${str.length}`);
            });
        });

        it("decoding a chopped string", () => {
            let str;
            for (str = "a"; str.length < 40; str += "a") {
                //
            }
            let buf = Buffer.allocUnsafe(2 + Buffer.byteLength(str));
            buf[0] = 0xd9;
            buf[1] = Buffer.byteLength(str) + 10; // set bigger size
            buf.write(str, 2);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of a string", () => {
            let buf = Buffer.allocUnsafe(1);
            buf[0] = 0xd9;
            buf = new ByteArray().write(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("2-bytes-length-arrays", () => {

        const build = function (size) {
            const array = [];
            let i;

            for (i = 0; i < size; i++) {
                array.push(42);
            }

            return array;
        };

        it("encode/decode arrays up to 0xffff elements", () => {
            const all = [];
            let i;

            for (i = 16; i < 0xffff; i += 4242) {
                all.push(build(i));
            }

            all.push(build(0xff));
            all.push(build(0xffff));

            all.forEach((array) => {
                assert.deepEqual(serializer.decode(serializer.encode(array)), array, `array of length ${array.length}`);
            });
        });

        it("decoding an incomplete array", () => {
            const array = build(0xffff / 2);
            let buf = Buffer.alloc(3 + array.length);
            buf[0] = 0xdc;
            buf.writeUInt16BE(array.length + 10, 1); // set bigger size
            let pos = 3;
            for (let i = 0; i < array.length; i++) {
                const obj = serializer.encode(array[i]);
                obj.write(buf, pos);
                pos += obj.length;
            }
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header", () => {
            let buf = Buffer.alloc(2);
            buf[0] = 0xdc;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("2-bytes-length-exts", () => {

        it("encode/decode variable ext data up between 0x0100 and 0xffff", () => {
            const all = [];

            const MyType = function (size, value) {
                this.value = value;
                this.size = size;
            };

            const mytypeEncode = function (obj, resbuf) {
                const buf = Buffer.allocUnsafe(obj.size);
                buf.fill(obj.value);
                resbuf.write(buf);
            };

            const mytypeDecode = function (buf) {
                const result = new MyType(buf.length, buf.toString("utf8", 0, 1));

                for (let i = 0; i < buf.length; i++) {
                    if (buf.readUInt8(0) !== buf.readUInt8(i)) {
                        throw new Error("should all be the same");
                    }
                }

                return result;
            };

            serializer.register(0x42, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(0x0100, "a"));
            all.push(new MyType(0x0101, "a"));
            all.push(new MyType(0xffff, "a"));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj of length ${orig.size}`);
            });
        });
    });

    describe("2-bytes-length-strings", () => {
        it("encode/decode 2^8 <-> (2^16-1) bytes strings", () => {
            const all = [];
            let str;

            str = Buffer.allocUnsafe(Math.pow(2, 8));
            str.fill("a");
            all.push(str.toString());

            str = Buffer.allocUnsafe(Math.pow(2, 8) + 1);
            str.fill("a");
            all.push(str.toString());

            str = Buffer.allocUnsafe(Math.pow(2, 14));
            str.fill("a");
            all.push(str.toString());

            str = Buffer.allocUnsafe(Math.pow(2, 16) - 1);
            str.fill("a");
            all.push(str.toString());

            all.forEach((str) => {
                assert.equal(serializer.decode(serializer.encode(str)), str, `string of length ${str.length}`);
            });
        });

        it("decoding a chopped string", () => {
            let str;
            for (str = "a"; str.length < 0xff + 100; str += "a") {
                /* empty */
            }
            let buf = Buffer.allocUnsafe(3 + Buffer.byteLength(str));
            buf[0] = 0xda;
            buf.writeUInt16BE(Buffer.byteLength(str) + 10, 1); // set bigger size
            buf.write(str, 3);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of a string", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xda;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("2-bytes-length-buffers", () => {
        const build = function (size) {
            const buf = Buffer.allocUnsafe(size);
            buf.fill("a");

            return buf;
        };

        it("encode/decode 2^16-1 bytes buffers", () => {
            const all = [];

            all.push(build(Math.pow(2, 8)));
            all.push(build(Math.pow(2, 8) + 1));
            all.push(build(Math.pow(2, 12) + 1));
            all.push(build(Math.pow(2, 16) - 1));

            all.forEach((orig) => {
                assert.equal(serializer.decode(serializer.encode(orig)).toString(), orig.toString(), `buffer of length ${orig.length}`);
            });
        });

        it("decoding a chopped 2^16-1 bytes buffer", () => {
            const orig = build(Math.pow(2, 12));
            let buf = Buffer.allocUnsafe(3 + orig.length);
            buf[0] = 0xc5;
            buf[1] = Math.pow(2, 16) - 1; // set bigger size
            orig.copy(buf, 3);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of 2^16-1 bytes buffer", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xc5;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("2-bytes-length-maps", () => {
        const base = 100000;

        const build = function (size, value) {
            const map = {};

            for (let i = 0; i < size; i++) {
                map[i + base] = value;
            }

            return map;
        };

        it("encode/decode maps up to 2^16-1 elements", () => {
            const doTest = function (length) {
                const map = build(length, 42);
                const buf = serializer.encode(map);

                assert.deepEqual(serializer.decode(buf), map, `map of length ${length} with ${map[base]}`);
            };

            doTest(Math.pow(2, 8));
            doTest(Math.pow(2, 8) + 1);
            doTest(Math.pow(2, 12) + 1);
            // too slow
            doTest(Math.pow(2, 16) - 1);
        });

        it("decoding a chopped map", () => {
            const map = serializer.encode(build(Math.pow(2, 12) + 1, 42));
            const buf = new ByteArray();
            buf.writeUInt8(0xde);
            buf.writeUInt16BE(Math.pow(2, 16) - 1); // set bigger size
            buf.write(map.slice(3));
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of a map", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xde;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("4-bytes-length-arrays", () => {
        const build = function (size) {
            const array = [];

            for (let i = 0; i < size; i++) {
                array.push(42);
            }

            return array;
        };

        it("encode/decode arrays up to 0xffffffff elements", () => {
            const doTest = function (array) {
                assert.deepEqual(serializer.decode(serializer.encode(array)), array, `array of length ${array.length}`);
            };

            doTest(build(0xffff + 1));
            doTest(build(0xffff + 42));
            // unable to test bigger arrays do to out of memory errors
        });

        it("decoding an incomplete array", () => {
            const array = build(0xffff + 42);
            const buf = new ByteArray(5 + array.length);
            buf.writeUInt8(0xdd);
            buf.writeUInt32BE(array.length + 10); // set bigger size
            buf.offset = 5;
            for (let i = 0; i < array.length; i++) {
                const obj = serializer.encode(array[i]);
                buf.write(obj);
            }
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xdd;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("4-bytes-length-buffers", () => {
        const build = function (size) {
            const buf = Buffer.allocUnsafe(size);
            buf.fill("a");

            return buf;
        };

        it("encode/decode 2^32-1 bytes buffers", () => {
            const all = [];

            all.push(build(Math.pow(2, 16)));
            all.push(build(Math.pow(2, 16) + 1));
            all.push(build(Math.pow(2, 18) + 1));

            all.forEach((orig) => {
                const encoded = serializer.encode(orig);
                assert.equal(serializer.decode(encoded).toString(), orig.toString(), `buffer of length ${orig.length}`);
            });
        });

        it("decoding a chopped 2^32-1 bytes buffer", () => {
            const orig = build(Math.pow(2, 18));
            let buf = Buffer.allocUnsafe(5 + orig.length);
            buf[0] = 0xc6;
            buf[1] = Math.pow(2, 32) - 1; // set bigger size
            orig.copy(buf, 5);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of 2^32-1 bytes buffer", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xc6;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("4-bytes-length-exts", () => {
        const serializer = new Serializer();

        it("encode/decode variable ext data up between 0x10000 and 0xffffffff", () => {
            const all = [];

            const MyType = function (size, value) {
                this.value = value;
                this.size = size;
            };

            const mytypeEncode = function (obj, resbuf) {
                const buf = Buffer.allocUnsafe(obj.size);
                buf.fill(obj.value);
                resbuf.write(buf);
            };

            const mytypeDecode = function (buf) {
                const result = new MyType(buf.length, buf.toString("utf8", 0, 1));

                for (let i = 0; i < buf.length; i++) {
                    if (buf.readUInt8(0) !== buf.readUInt8(i)) {
                        throw new Error("should all be the same");
                    }
                }

                return result;
            };

            serializer.register(0x52, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(0x10000, "a"));
            all.push(new MyType(0x10001, "a"));
            all.push(new MyType(0xffffff, "a"));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj of length ${orig.size}`);
            });
        });
    });

    describe("4-bytes-length-strings", () => {
        it("encode/decode 2^16 <-> (2^32 - 1) bytes strings", () => {
            const all = [];
            let str;

            str = Buffer.allocUnsafe(Math.pow(2, 16));
            str.fill("a");
            all.push(str.toString());

            str = Buffer.allocUnsafe(Math.pow(2, 16) + 1);
            str.fill("a");
            all.push(str.toString());

            str = Buffer.allocUnsafe(Math.pow(2, 20));
            str.fill("a");
            all.push(str.toString());

            all.forEach((str) => {
                assert.equal(serializer.decode(serializer.encode(str)), str, `string of length ${str.length}`);
            });
        });

        it("decoding a chopped string", () => {
            let str;
            for (str = "a"; str.length < 0xffff + 100; str += "a") {
                //
            }
            let buf = Buffer.allocUnsafe(5 + Buffer.byteLength(str));
            buf[0] = 0xdb;
            buf.writeUInt32BE(Buffer.byteLength(str) + 10, 1); // set bigger size
            buf.write(str, 5);
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding an incomplete header of a string", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xdb;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    it("encoding/decoding 5-bits negative ints", () => {
        const allNum = [];

        for (let i = 1; i <= 32; i++) {
            allNum.push(-i);
        }

        allNum.forEach((num) => {
            assert.equal(serializer.decode(serializer.encode(num)), num, `Number ${num}`);
        });
    });

    it("encoding/decoding 7-bits positive ints", () => {
        const allNum = [];

        for (let i = 0; i < 126; i++) {
            allNum.push(i);
        }

        allNum.forEach((num) => {
            assert.equal(serializer.decode(serializer.encode(num)), num, `Number ${num}`);
        });
    });

    describe("8-bits-positive-integers", () => {
        it("encoding/decoding 8-bits integers", () => {
            const allNum = [];

            for (let i = 128; i < 256; i++) {
                allNum.push(i);
            }

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `Number ${num}`);
            });
        });

        it("decoding an incomplete 8-bits unsigned integer", () => {
            let buf = Buffer.allocUnsafe(1);
            buf[0] = 0xcc;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("8-bits-signed-integers", () => {
        it("encoding/decoding 8-bits big-endian signed integers", () => {
            const allNum = [];

            for (let i = 33; i <= 128; i++) {
                allNum.push(-i);
            }

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 8-bits big-endian signed integer", () => {
            let buf = Buffer.allocUnsafe(1);
            buf[0] = 0xd0;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("15-elements-arrays", () => {
        const build = function (size, obj) {
            const array = [];
            let i;

            for (i = 0; i < size; i++) {
                array.push(obj);
            }

            return array;
        };

        it("encode/decode arrays up to 15 elements", () => {
            const all = [];
            let i;

            for (i = 0; i < 16; i++) {
                all.push(build(i, 42));
            }

            for (i = 0; i < 16; i++) {
                all.push(build(i, "aaa"));
            }

            all.forEach((array) => {
                assert.deepEqual(serializer.decode(serializer.encode(array)), array, `array of length ${array.length} with ${array[0]}`);
            });
        });

        it("decoding an incomplete array", () => {
            const array = ["a", "b", "c"];
            const buf = new ByteArray();
            buf.writeUInt8(0x90 | (array.length + 2)); // set bigger size
            buf.offset = 1;
            for (let i = 0; i < array.length; i++) {
                const obj = serializer.encode(array[i]);
                buf.write(obj);
            }
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("15-elements-maps", () => {
        const build = function (size, value) {
            const map = {};
            let i;

            for (i = 0; i < size; i++) {
                map[`${i + 100}`] = value;
            }

            return map;
        };

        it("encode/decode maps up to 15 elements", () => {
            const all = [];
            let i;

            for (i = 0; i < 16; i++) {
                all.push(build(i, 42));
            }

            for (i = 0; i < 16; i++) {
                all.push(build(i, "aaa"));
            }

            all.forEach((map) => {
                const length = Object.keys(map).length;
                assert.deepEqual(serializer.decode(serializer.encode(map)), map, `map of length ${length} with ${map[100]}`);
            });
        });

        it("should encode 'undefined' in a map", () => {
            const expected = { a: undefined, hello: "world" };
            const toEncode = { a: undefined, hello: "world" };
            const buf = serializer.encode(toEncode);

            assert.deepEqual(expected, serializer.decode(buf));
        });

        it("encode/decode map with buf, ints and strings", () => {
            const map = {
                topic: "hello",
                qos: 1,
                payload: Buffer.from("world"),
                messageId: "42",
                ttl: 1416309270167
            };

            const decodedMap = serializer.decode(serializer.encode(map));

            assert.equal(map.topic, decodedMap.topic);
            assert.equal(map.qos, decodedMap.qos);
            assert.equal(map.messageId, decodedMap.messageId);
            assert.equal(map.ttl, decodedMap.ttl);
            assert.equal(Buffer.compare(map.payload, decodedMap.payload), 0);
        });

        it("decoding a chopped map", () => {
            const map = serializer.encode({ a: "b", c: "d", e: "f" }).toBuffer();
            const buf = new ByteArray(map.length);
            buf.writeUInt8(0x80 | 5); // set bigger size
            buf.write(map.slice(1));
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("16-bits-signed-integers", () => {
        it("encoding/decoding 16-bits big-endian signed integers", () => {
            const allNum = [];
            let i;

            for (i = 129; i < 32768; i += 1423) {
                allNum.push(-i);
            }

            allNum.push(-32768);

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 16-bits big-endian integer", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xd1;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("16-bits-unsigned-integers", () => {

        it("encoding/decoding 16-bits big-endian unsigned integers", () => {
            const allNum = [];
            let i;

            for (i = 256; i < 65536; i += 1423) {
                allNum.push(i);
            }

            allNum.push(65535);

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 16-bits big-endian unsigned integer", () => {
            let buf = Buffer.allocUnsafe(2);
            buf[0] = 0xcd;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("32-bits-signed-integers", () => {
        it("encoding/decoding 32-bits big-endian signed integers", () => {
            const allNum = [];

            for (let i = 32769; i < 214748364; i += 10235023) {
                allNum.push(-i);
            }

            allNum.push(-214748364);

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 32-bits big-endian integer", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xd2;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("32-bits-unsigned-integers", () => {

        it("encoding/decoding 32-bits big-endian unsigned integers", () => {
            const allNum = [];

            for (let i = 65536; i < 0xffffffff; i += 102350237) {
                allNum.push(i);
            }

            allNum.push(0xfffffffe);
            allNum.push(0xffffffff);

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 32-bits big-endian unsigned integer", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xce;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    it("encode/decode up to 31 bytes strings", () => {
        const all = [];

        for (let i = ""; i.length < 32; i += "a") {
            all.push(i);
        }

        all.forEach((str) => {
            assert.equal(serializer.decode(serializer.encode(str)), str, `string of length ${str.length}`);
        });
    });

    describe("64-bits-signed-integers", () => {

        it("encoding/decoding 64-bits big-endian signed integers", () => {
            const table = [
                { num: -9007199254740991, hi: 0xffe00000, lo: 0x00000001 },
                { num: -4294967297, hi: 0xfffffffe, lo: 0xffffffff },
                { num: -4294967296, hi: 0xffffffff, lo: 0x00000000 },
                { num: -4294967295, hi: 0xffffffff, lo: 0x00000001 },
                { num: -214748365, hi: 0xffffffff, lo: 0xf3333333 }
            ];

            table.forEach((testCase) => {
                assert.equal(serializer.decode(serializer.encode(testCase.num)), testCase.num, `${testCase.num}`);
            });
        });

        it("decoding an incomplete 64-bits big-endian signed integer", () => {
            let buf = Buffer.allocUnsafe(8);
            buf[0] = 0xd3;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("64-bits-unsigned-integers", () => {

        it("encoding/decoding 64-bits big-endian unsigned integers", () => {
            const allNum = [];

            allNum.push(0x0000000100000000);
            allNum.push(0xffffffffeeeee);

            allNum.forEach((num) => {
                assert.equal(serializer.decode(serializer.encode(num)), num, `${num}`);
            });
        });

        it("decoding an incomplete 64-bits big-endian unsigned integer", () => {
            let buf = Buffer.allocUnsafe(8);
            buf[0] = 0xcf;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("doubles", () => {

        it("encoding/decoding 64-bits float numbers", () => {
            const allNum = [];

            allNum.push(748365544534.2);
            allNum.push(-222111111000004.2);
            allNum.push(9007199254740992);
            allNum.push(-9007199254740992);

            allNum.forEach((num) => {
                const dec = serializer.decode(serializer.encode(num));
                assert.ok(Math.abs(dec - num) < 0.1, "must decode correctly");
            });
        });

        it("decoding an incomplete 64-bits float numbers", () => {
            let buf = Buffer.allocUnsafe(8);
            buf[0] = 0xcb;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("fixexts", () => {
        it("encode/decode 1 byte fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt8(obj.data);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt8());
            };

            serializer.register(0x42, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(0));
            all.push(new MyType(1));
            all.push(new MyType(42));

            all.forEach((orig) => {
                const encoded = serializer.encode(orig);
                const decoded = serializer.decode(encoded);
                assert.deepEqual(decoded, orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode 2 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt16BE(obj.data);
            };

            const mytypeDecode = function (data) {
                // console.log('FUCKING DATAAAAAAAAAAAAA: ',data);
                return new MyType(data.readUInt16BE());
            };

            serializer.register(0x42, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(0));
            all.push(new MyType(1));
            all.push(new MyType(42));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode 4 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE());
            };

            serializer.register(0x44, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(0));
            all.push(new MyType(1));
            all.push(new MyType(42));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode 8 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data / 2);
                buf.writeUInt32BE(obj.data / 2);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE() + data.readUInt32BE());
            };

            serializer.register(0x44, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(2));
            all.push(new MyType(4));
            all.push(new MyType(42));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode 16 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE() + data.readUInt32BE() + data.readUInt32BE() + data.readUInt32BE());
            };

            serializer.register(0x46, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(4));
            all.push(new MyType(8));
            all.push(new MyType(44));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode fixext inside a map", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE());
            };

            serializer.register(0x42, MyType, mytypeEncode, mytypeDecode);

            all.push({ ret: new MyType(42) });
            all.push({ a: new MyType(42), b: new MyType(43) });

            all.push([1, 2, 3, 4, 5, 6].reduce((acc, key) => {
                acc[key] = new MyType(key);
                return acc;
            }, {}));

            all.forEach((orig) => {
                const encoded = serializer.encode(orig);
                assert.deepEqual(serializer.decode(encoded), orig, "custom obj inside a map");
            });
        });

        it("encode/decode 8 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data / 2);
                buf.writeUInt32BE(obj.data / 2);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE() + data.readUInt32BE());
            };

            serializer.register(0x44, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(2));
            all.push(new MyType(4));
            all.push(new MyType(42));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });

        it("encode/decode 16 bytes fixext data", () => {
            const serializer = new Serializer();
            const all = [];

            const MyType = function (data) {
                this.data = data;
            };

            const mytypeEncode = function (obj, buf) {
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
                buf.writeUInt32BE(obj.data / 4);
            };

            const mytypeDecode = function (data) {
                return new MyType(data.readUInt32BE() + data.readUInt32BE() + data.readUInt32BE() + data.readUInt32BE());
            };

            serializer.register(0x46, MyType, mytypeEncode, mytypeDecode);

            all.push(new MyType(4));
            all.push(new MyType(8));
            all.push(new MyType(44));

            all.forEach((orig) => {
                assert.deepEqual(serializer.decode(serializer.encode(orig)), orig, `custom obj containing ${orig.data}`);
            });
        });
    });

    describe("floats", () => {

        it("encoding/decoding 32-bits float numbers", () => {
            const allNum = [];

            allNum.push(-222.42);
            allNum.push(748364.2);
            allNum.push(2.2);

            allNum.forEach((num) => {
                const dec = serializer.decode(serializer.encode(num));
                assert.ok(Math.abs(dec - num) < 0.1, `Float ${num}`);
            });
        });

        it("decoding an incomplete 32-bits float numbers", () => {
            let buf = Buffer.allocUnsafe(4);
            buf[0] = 0xca;
            buf = ByteArray.wrap(buf);
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    it("should not encode a function inside a map", () => {
        const noop = function () { };

        const toEncode = {
            hello: "world",
            func: noop
        };

        assert.throws(() => serializer.decode(serializer.encode(toEncode)), adone.error.NotSupported);
    });

    it("encode/decode undefined", () => {
        assert.equal(serializer.decode(serializer.encode(undefined)), undefined, "mirror test undefined");
    });

    it("encode/decode null", () => {
        assert.equal(serializer.decode(serializer.encode(null)), null, "mirror test null");
    });

    it("custom type registeration assertions", () => {
        const Type0 = function (value) {
            this.value = value;
        };

        const type0Encode = function (value) {
            return new Type0(value);
        };

        const type0Decode = function (type0) {
            return type0.value;
        };

        const TypeNeg = function (value) {
            this.value = value;
        };

        const typeNegEncode = function (value) {
            return new TypeNeg(value);
        };

        const typeNegDecode = function (typeneg) {
            return typeneg.value;
        };

        assert.doesNotThrow(() => serializer.register(0, Type0, type0Decode, type0Encode), undefined, undefined, "A type registered at 0 should not throw.");
        assert.throws(() => serializer.register(-1, TypeNeg, typeNegEncode, typeNegDecode), undefined, undefined, "A type registered as a negative value should throw");

        const encoded = serializer.encode(new Type0("hi"));
        let decoded;
        assert.equal(encoded.readUInt8(1), 0x0, "must use the custom type assigned");
        assert.doesNotThrow(() => decoded = serializer.decode(encoded), undefined, undefined, "decoding custom 0 type should not throw");
        assert.equal(decoded instanceof Type0, true, "must decode to custom type instance");
    });

    describe("object-with-arrays", () => {
        const build = function (size) {
            const array = [];
            let i;

            for (i = 0; i < size; i++) {
                array.push(42);
            }

            return array;
        };

        it("decoding a map with multiple big arrays", () => {
            const map = {
                first: build(0xffff + 42),
                second: build(0xffff + 42)
            };

            assert.deepEqual(serializer.decode(serializer.encode(map)), map);
        });

        it("decoding a map with multiple big arrays. First one is incomplete", () => {
            const array = build(0xffff + 42);
            const map = {
                first: array,
                second: build(0xffff + 42)
            };

            const buf = serializer.encode(map);
            
            // 1 (fixmap's header 0x82) + first key's length + 1 (first array's 0xdd)
            const sizePosOfFirstArray = 1 + serializer.encode("first").length + 1;
            buf.writeUInt32BE(array.length + 10, sizePosOfFirstArray); // set first array's size bigger than its actual size
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });

        it("decoding a map with multiple big arrays. Second one is incomplete", () => {
            const array = build(0xffff + 42);
            const map = {
                first: array,
                second: build(0xffff + 42)
            };

            const buf = serializer.encode(map);
            // 1 (fixmap's header 0x82) + first key-value pair's length + second key's length + 1 (second array's 0xdd)
            const sizePosOfSecondArray = 1 + serializer.encode("first").length + serializer.encode(array).length + serializer.encode("second").length + 1;
            buf.writeUInt32BE(array.length + 10, sizePosOfSecondArray); // set second array's size bigger than its actual size
            assert.throws(() => serializer.decode(buf), IncompleteBufferError);
        });
    });

    describe("object-with-buffers", () => {

        it("encode/decode map with multiple short buffers", () => {
            const map = {
                first: Buffer.from("first"),
                second: Buffer.from("second"),
                third: Buffer.from("third")
            };

            const decodedMap = serializer.decode(serializer.encode(map));
            assert.equal(Buffer.compare(decodedMap.first, map.first), 0);
            assert.equal(Buffer.compare(decodedMap.second, map.second), 0);
            assert.equal(Buffer.compare(decodedMap.third, map.third), 0);
        });

        it("encode/decode map with all files in this directory", () => {
            const files = fs.readdirSync(__dirname);
            const map = files.reduce((acc, file) => {
                const nowFile = path.join(__dirname, file);
                if (!fs.statSync(nowFile).isDirectory()) {
                    acc[file] = fs.readFileSync(nowFile);
                }
                return acc;
            }, {});

            for (const [name, buff] of adone.util.entries(map)) {
                map[name] = Buffer.from(buff);
            }

            const decodedMap = serializer.decode(serializer.encode(map));

            for (const [name, buff] of adone.util.entries(map)) {
                assert.equal(Buffer.compare(buff, decodedMap[name]), 0);
            }
        });
    });

    describe("object-with-strings", () => {

        it("encode/decode map with multiple short buffers", () => {
            const map = {
                first: "first",
                second: "second",
                third: "third"
            };

            assert.deepEqual(serializer.decode(serializer.encode(map)), map);
        });

        it("encode/decode map with all files in this directory", () => {
            const files = fs.readdirSync(__dirname);
            const map = files.reduce((acc, file) => {
                const nowFile = path.join(__dirname, file);
                if (!fs.statSync(nowFile).isDirectory()) {
                    acc[file] = fs.readFileSync(path.join(__dirname, file)).toString("utf8");
                }
                return acc;
            }, {});

            assert.deepEqual(serializer.decode(serializer.encode(map)), map);
        });
    });

    describe("some std and adone types encode/decode", () => {
        it("encode/decode Long mirror test", () => {
            let orig = Long.fromString("1152921504606912512", true); // 2**60 + 2**16
            let encoded = serializer.encode(orig);
            let output = serializer.decode(encoded);
            assert.ok(output.equals(orig), "must stay the same");

            orig = Long.fromString("-1152921504606912512"); // -2**60 - 2**16
            encoded = serializer.encode(orig);
            output = serializer.decode(encoded);
            assert.ok(output.equals(orig), "must stay the same");
        });

        it("encode/decode Date", () => {
            const val = new Date();
            const encoded = serializer.encode(val);
            const decodedVal = serializer.decode(encoded);
            assert.deepEqual(decodedVal, val, "must stay the same");
        });

        it("encode/decode Map", () => {
            const val = new Map();
            val.set("key1", "val2");
            val.set(888, "adone");
            val.set("state", true);
            const encoded = serializer.encode(val);
            const decodedVal = serializer.decode(encoded);
            assert.deepEqual([...decodedVal.entries()], [...val.entries()], "must stay the same");
        });

        it("encode/decode Set", () => {
            const val = new Set();
            val.add("very");
            val.add("good");
            val.add("stuff");
            const encoded = serializer.encode(val);
            const decodedVal = serializer.decode(encoded);
            assert.deepEqual([...decodedVal.entries()], [...val.entries()], "must stay the same");
        });
    });
});
