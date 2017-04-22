import { Buffer } from "..";

const { is } = adone;

describe("Buffer", () => {
    describe("constructor", () => {
        it("new buffer from array", () => {
            assert.equal(new Buffer([1, 2, 3]).toString(), "\u0001\u0002\u0003");
        });

        it("new buffer from array w/ negatives", () => {
            assert.equal(
                new Buffer([-1, -2, -3]).toString("hex"),
                "fffefd"
            );

        });

        it("new buffer from array with mixed signed input", () => {
            assert.equal(
                new Buffer([-255, 255, -128, 128, 512, -512, 511, -511]).toString("hex"),
                "01ff80800000ff01"
            );

        });

        it("new buffer from string", () => {
            assert.equal(
                new Buffer("hey", "utf8").toString(),
                "hey"
            );

        });

        it("new buffer from buffer", () => {
            const b1 = new Buffer("asdf");
            const b2 = new Buffer(b1);
            assert.equal(b1.toString("hex"), b2.toString("hex"));

        });

        it("new buffer from ArrayBuffer", () => {
            if (typeof ArrayBuffer !== "undefined") {
                const arraybuffer = new Uint8Array([0, 1, 2, 3]).buffer;
                const b = new Buffer(arraybuffer);
                assert.equal(b.length, 4);
                assert.equal(b[0], 0);
                assert.equal(b[1], 1);
                assert.equal(b[2], 2);
                assert.equal(b[3], 3);
                assert.equal(b[4], undefined);
            }

        });

        it("new buffer from ArrayBuffer, shares memory", () => {
            const u = new Uint8Array([0, 1, 2, 3]);
            const arraybuffer = u.buffer;
            const b = new Buffer(arraybuffer);
            assert.equal(b.length, 4);
            assert.equal(b[0], 0);
            assert.equal(b[1], 1);
            assert.equal(b[2], 2);
            assert.equal(b[3], 3);
            assert.equal(b[4], undefined);

            // changing the Uint8Array (and thus the ArrayBuffer), changes the Buffer
            u[0] = 10;
            assert.equal(b[0], 10);
            u[1] = 11;
            assert.equal(b[1], 11);
            u[2] = 12;
            assert.equal(b[2], 12);
            u[3] = 13;
            assert.equal(b[3], 13);

        });

        it("new buffer from Uint8Array", () => {
            if (typeof Uint8Array !== "undefined") {
                const b1 = new Uint8Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Uint16Array", () => {
            if (typeof Uint16Array !== "undefined") {
                const b1 = new Uint16Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Uint32Array", () => {
            if (typeof Uint32Array !== "undefined") {
                const b1 = new Uint32Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Int16Array", () => {
            if (typeof Int16Array !== "undefined") {
                const b1 = new Int16Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Int32Array", () => {
            if (typeof Int32Array !== "undefined") {
                const b1 = new Int32Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Float32Array", () => {
            if (typeof Float32Array !== "undefined") {
                const b1 = new Float32Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from Float64Array", () => {
            if (typeof Float64Array !== "undefined") {
                const b1 = new Float64Array([0, 1, 2, 3]);
                const b2 = new Buffer(b1);
                assert.equal(b1.length, b2.length);
                assert.equal(b1[0], 0);
                assert.equal(b1[1], 1);
                assert.equal(b1[2], 2);
                assert.equal(b1[3], 3);
                assert.equal(b1[4], undefined);
            }

        });

        it("new buffer from buffer.toJSON() output", () => {
            if (typeof JSON === "undefined") {
                // ie6, ie7 lack support

                return;
            }
            const buf = new Buffer("test");
            const json = JSON.stringify(buf);
            const obj = JSON.parse(json);
            const copy = new Buffer(obj);
            assert.ok(buf.equals(copy));

        });

    });

    describe("from string", () => {
        it("detect utf16 surrogate pairs", () => {
            const text = "\uD83D\uDE38" + "\uD83D\uDCAD" + "\uD83D\uDC4D";
            const buf = new Buffer(text);
            assert.equal(text, buf.toString());

        });

        it("detect utf16 surrogate pairs over U+20000 until U+10FFFF", () => {
            const text = "\uD842\uDFB7" + "\uD93D\uDCAD" + "\uDBFF\uDFFF";
            const buf = new Buffer(text);
            assert.equal(text, buf.toString());

        });

        it("replace orphaned utf16 surrogate lead code point", () => {
            const text = "\uD83D\uDE38" + "\uD83D" + "\uD83D\uDC4D";
            const buf = new Buffer(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0xef, 0xbf, 0xbd, 0xf0, 0x9f, 0x91, 0x8d]));

        });

        it("replace orphaned utf16 surrogate trail code point", () => {
            const text = "\uD83D\uDE38" + "\uDCAD" + "\uD83D\uDC4D";
            const buf = new Buffer(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0xef, 0xbf, 0xbd, 0xf0, 0x9f, 0x91, 0x8d]));

        });

        it("do not write partial utf16 code units", () => {
            const f = new Buffer([0, 0, 0, 0, 0]);
            assert.equal(f.length, 5);
            const size = f.write("あいうえお", "utf16le");
            assert.equal(size, 4);
            assert.deepEqual(f, new Buffer([0x42, 0x30, 0x44, 0x30, 0x00]));

        });

        it("handle partial utf16 code points when encoding to utf8 the way node does", () => {
            const text = "\uD83D\uDE38" + "\uD83D\uDC4D";

            let buf = new Buffer(8);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0xf0, 0x9f, 0x91, 0x8d]));

            buf = new Buffer(7);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0x00, 0x00, 0x00]));

            buf = new Buffer(6);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0x00, 0x00]));

            buf = new Buffer(5);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8, 0x00]));

            buf = new Buffer(4);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0xf0, 0x9f, 0x98, 0xb8]));

            buf = new Buffer(3);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x00, 0x00, 0x00]));

            buf = new Buffer(2);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x00, 0x00]));

            buf = new Buffer(1);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x00]));


        });

        it("handle invalid utf16 code points when encoding to utf8 the way node does", () => {
            const text = "a" + "\uDE38\uD83D" + "b";

            let buf = new Buffer(8);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0xef, 0xbf, 0xbd, 0xef, 0xbf, 0xbd, 0x62]));

            buf = new Buffer(7);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0xef, 0xbf, 0xbd, 0xef, 0xbf, 0xbd]));

            buf = new Buffer(6);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0xef, 0xbf, 0xbd, 0x00, 0x00]));

            buf = new Buffer(5);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0xef, 0xbf, 0xbd, 0x00]));

            buf = new Buffer(4);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0xef, 0xbf, 0xbd]));

            buf = new Buffer(3);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0x00, 0x00]));

            buf = new Buffer(2);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61, 0x00]));

            buf = new Buffer(1);
            buf.fill(0);
            buf.write(text);
            assert.deepEqual(buf, new Buffer([0x61]));


        });
    });

    describe("to string", () => {

        it("utf8 buffer to base64", () => {
            assert.equal(
                new Buffer("Ձאab", "utf8").toString("base64"),
                "1YHXkGFi"
            );

        });

        it("utf8 buffer to hex", () => {
            assert.equal(
                new Buffer("Ձאab", "utf8").toString("hex"),
                "d581d7906162"
            );

        });

        it("utf8 to utf8", () => {
            assert.equal(
                new Buffer("öäüõÖÄÜÕ", "utf8").toString("utf8"),
                "öäüõÖÄÜÕ"
            );

        });

        it("utf16le to utf16", () => {
            assert.equal(
                new Buffer(new Buffer("abcd", "utf8").toString("utf16le"), "utf16le").toString("utf8"),
                "abcd"
            );

        });

        it("utf16le to hex", () => {
            assert.equal(
                new Buffer("abcd", "utf16le").toString("hex"),
                "6100620063006400"
            );

        });

        it("ascii buffer to base64", () => {
            assert.equal(
                new Buffer("123456!@#$%^", "ascii").toString("base64"),
                "MTIzNDU2IUAjJCVe"
            );

        });

        it("ascii buffer to hex", () => {
            assert.equal(
                new Buffer("123456!@#$%^", "ascii").toString("hex"),
                "31323334353621402324255e"
            );

        });

        it("base64 buffer to utf8", () => {
            assert.equal(
                new Buffer("1YHXkGFi", "base64").toString("utf8"),
                "Ձאab"
            );

        });

        it("hex buffer to utf8", () => {
            assert.equal(
                new Buffer("d581d7906162", "hex").toString("utf8"),
                "Ձאab"
            );

        });

        it("base64 buffer to ascii", () => {
            assert.equal(
                new Buffer("MTIzNDU2IUAjJCVe", "base64").toString("ascii"),
                "123456!@#$%^"
            );

        });

        it("hex buffer to ascii", () => {
            assert.equal(
                new Buffer("31323334353621402324255e", "hex").toString("ascii"),
                "123456!@#$%^"
            );

        });

        it("base64 buffer to binary", () => {
            assert.equal(
                new Buffer("MTIzNDU2IUAjJCVe", "base64").toString("binary"),
                "123456!@#$%^"
            );

        });

        it("hex buffer to binary", () => {
            assert.equal(
                new Buffer("31323334353621402324255e", "hex").toString("binary"),
                "123456!@#$%^"
            );

        });

        it("utf8 to binary", () => {
            /* jshint -W100 */
            assert.equal(
                new Buffer("öäüõÖÄÜÕ", "utf8").toString("binary"),
                "Ã¶Ã¤Ã¼ÃµÃÃÃÃ"
            );
            /* jshint +W100 */

        });

        it("utf8 replacement chars (1 byte sequence)", () => {
            assert.equal(
                new Buffer([0x80]).toString(),
                "\uFFFD"
            );
            assert.equal(
                new Buffer([0x7F]).toString(),
                "\u007F"
            );

        });

        it("utf8 replacement chars (2 byte sequences)", () => {
            assert.equal(
                new Buffer([0xC7]).toString(),
                "\uFFFD"
            );
            assert.equal(
                new Buffer([0xC7, 0xB1]).toString(),
                "\u01F1"
            );
            assert.equal(
                new Buffer([0xC0, 0xB1]).toString(),
                "\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xC1, 0xB1]).toString(),
                "\uFFFD\uFFFD"
            );

        });

        it("utf8 replacement chars (3 byte sequences)", () => {
            assert.equal(
                new Buffer([0xE0]).toString(),
                "\uFFFD"
            );
            assert.equal(
                new Buffer([0xE0, 0xAC]).toString(),
                "\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xE0, 0xAC, 0xB9]).toString(),
                "\u0B39"
            );

        });

        it("utf8 replacement chars (4 byte sequences)", () => {
            assert.equal(
                new Buffer([0xF4]).toString(),
                "\uFFFD"
            );
            assert.equal(
                new Buffer([0xF4, 0x8F]).toString(),
                "\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xF4, 0x8F, 0x80]).toString(),
                "\uFFFD\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xF4, 0x8F, 0x80, 0x84]).toString(),
                "\uDBFC\uDC04"
            );
            assert.equal(
                new Buffer([0xFF]).toString(),
                "\uFFFD"
            );
            assert.equal(
                new Buffer([0xFF, 0x8F, 0x80, 0x84]).toString(),
                "\uFFFD\uFFFD\uFFFD\uFFFD"
            );

        });

        it("utf8 replacement chars on 256 random bytes", () => {
            assert.equal(
                new Buffer([152, 130, 206, 23, 243, 238, 197, 44, 27, 86, 208, 36, 163, 184, 164, 21, 94, 242, 178, 46, 25, 26, 253, 178, 72, 147, 207, 112, 236, 68, 179, 190, 29, 83, 239, 147, 125, 55, 143, 19, 157, 68, 157, 58, 212, 224, 150, 39, 128, 24, 94, 225, 120, 121, 75, 192, 112, 19, 184, 142, 203, 36, 43, 85, 26, 147, 227, 139, 242, 186, 57, 78, 11, 102, 136, 117, 180, 210, 241, 92, 3, 215, 54, 167, 249, 1, 44, 225, 146, 86, 2, 42, 68, 21, 47, 238, 204, 153, 216, 252, 183, 66, 222, 255, 15, 202, 16, 51, 134, 1, 17, 19, 209, 76, 238, 38, 76, 19, 7, 103, 249, 5, 107, 137, 64, 62, 170, 57, 16, 85, 179, 193, 97, 86, 166, 196, 36, 148, 138, 193, 210, 69, 187, 38, 242, 97, 195, 219, 252, 244, 38, 1, 197, 18, 31, 246, 53, 47, 134, 52, 105, 72, 43, 239, 128, 203, 73, 93, 199, 75, 222, 220, 166, 34, 63, 236, 11, 212, 76, 243, 171, 110, 78, 39, 205, 204, 6, 177, 233, 212, 243, 0, 33, 41, 122, 118, 92, 252, 0, 157, 108, 120, 70, 137, 100, 223, 243, 171, 232, 66, 126, 111, 142, 33, 3, 39, 117, 27, 107, 54, 1, 217, 227, 132, 13, 166, 3, 73, 53, 127, 225, 236, 134, 219, 98, 214, 125, 148, 24, 64, 142, 111, 231, 194, 42, 150, 185, 10, 182, 163, 244, 19, 4, 59, 135, 16]).toString(),
                "\uFFFD\uFFFD\uFFFD\u0017\uFFFD\uFFFD\uFFFD\u002C\u001B\u0056\uFFFD\u0024\uFFFD\uFFFD\uFFFD\u0015\u005E\uFFFD\uFFFD\u002E\u0019\u001A\uFFFD\uFFFD\u0048\uFFFD\uFFFD\u0070\uFFFD\u0044\uFFFD\uFFFD\u001D\u0053\uFFFD\uFFFD\u007D\u0037\uFFFD\u0013\uFFFD\u0044\uFFFD\u003A\uFFFD\uFFFD\uFFFD\u0027\uFFFD\u0018\u005E\uFFFD\u0078\u0079\u004B\uFFFD\u0070\u0013\uFFFD\uFFFD\uFFFD\u0024\u002B\u0055\u001A\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\u0039\u004E\u000B\u0066\uFFFD\u0075\uFFFD\uFFFD\uFFFD\u005C\u0003\uFFFD\u0036\uFFFD\uFFFD\u0001\u002C\uFFFD\uFFFD\u0056\u0002\u002A\u0044\u0015\u002F\uFFFD\u0319\uFFFD\uFFFD\uFFFD\u0042\uFFFD\uFFFD\u000F\uFFFD\u0010\u0033\uFFFD\u0001\u0011\u0013\uFFFD\u004C\uFFFD\u0026\u004C\u0013\u0007\u0067\uFFFD\u0005\u006B\uFFFD\u0040\u003E\uFFFD\u0039\u0010\u0055\uFFFD\uFFFD\u0061\u0056\uFFFD\uFFFD\u0024\uFFFD\uFFFD\uFFFD\uFFFD\u0045\uFFFD\u0026\uFFFD\u0061\uFFFD\uFFFD\uFFFD\uFFFD\u0026\u0001\uFFFD\u0012\u001F\uFFFD\u0035\u002F\uFFFD\u0034\u0069\u0048\u002B\uFFFD\uFFFD\uFFFD\u0049\u005D\uFFFD\u004B\uFFFD\u0726\u0022\u003F\uFFFD\u000B\uFFFD\u004C\uFFFD\uFFFD\u006E\u004E\u0027\uFFFD\uFFFD\u0006\uFFFD\uFFFD\uFFFD\uFFFD\u0000\u0021\u0029\u007A\u0076\u005C\uFFFD\u0000\uFFFD\u006C\u0078\u0046\uFFFD\u0064\uFFFD\uFFFD\uFFFD\uFFFD\u0042\u007E\u006F\uFFFD\u0021\u0003\u0027\u0075\u001B\u006B\u0036\u0001\uFFFD\uFFFD\uFFFD\u000D\uFFFD\u0003\u0049\u0035\u007F\uFFFD\uFFFD\uFFFD\uFFFD\u0062\uFFFD\u007D\uFFFD\u0018\u0040\uFFFD\u006F\uFFFD\uFFFD\u002A\uFFFD\uFFFD\u000A\uFFFD\uFFFD\uFFFD\u0013\u0004\u003B\uFFFD\u0010"
            );

        });

        it("utf8 replacement chars for anything in the surrogate pair range", () => {
            assert.equal(
                new Buffer([0xED, 0x9F, 0xBF]).toString(),
                "\uD7FF"
            );
            assert.equal(
                new Buffer([0xED, 0xA0, 0x80]).toString(),
                "\uFFFD\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xED, 0xBE, 0x8B]).toString(),
                "\uFFFD\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xED, 0xBF, 0xBF]).toString(),
                "\uFFFD\uFFFD\uFFFD"
            );
            assert.equal(
                new Buffer([0xEE, 0x80, 0x80]).toString(),
                "\uE000"
            );

        });

        it("utf8 don't replace the replacement char", () => {
            assert.equal(
                new Buffer("\uFFFD").toString(),
                "\uFFFD"
            );

        });
    });

    describe("is buffer", () => {
        it("is-buffer tests", () => {
            assert.ok(is.buffer(new Buffer(4)), "new Buffer(4)");

            assert.notOk(is.buffer(undefined), "undefined");
            assert.notOk(is.buffer(null), "null");
            assert.notOk(is.buffer(""), "empty string");
            assert.notOk(is.buffer(true), "true");
            assert.notOk(is.buffer(false), "false");
            assert.notOk(is.buffer(0), "0");
            assert.notOk(is.buffer(1), "1");
            assert.notOk(is.buffer(1.0), "1.0");
            assert.notOk(is.buffer("string"), "string");
            assert.notOk(is.buffer({}), "{}");
            assert.notOk(is.buffer(function foo() { }), "function foo () {}");
        });
    });

    describe("basic", () => {
        it("instanceof Buffer", () => {
            const buf = new Buffer([1, 2]);
            assert.ok(buf instanceof Buffer);

        });

        it("convert to Uint8Array in modern browsers", () => {
            const buf = new Buffer([1, 2]);
            const uint8array = new Uint8Array(buf.buffer);
            assert.ok(uint8array instanceof Uint8Array);
            assert.equal(uint8array[0], 1);
            assert.equal(uint8array[1], 2);

        });

        it("indexes from a string", () => {
            const buf = new Buffer("abc");
            assert.equal(buf[0], 97);
            assert.equal(buf[1], 98);
            assert.equal(buf[2], 99);

        });

        it("indexes from an array", () => {
            const buf = new Buffer([97, 98, 99]);
            assert.equal(buf[0], 97);
            assert.equal(buf[1], 98);
            assert.equal(buf[2], 99);

        });

        it("setting index value should modify buffer contents", () => {
            const buf = new Buffer([97, 98, 99]);
            assert.equal(buf[2], 99);
            assert.equal(buf.toString(), "abc");

            buf[2] += 10;
            assert.equal(buf[2], 109);
            assert.equal(buf.toString(), "abm");

        });

        it("storing negative number should cast to unsigned", () => {
            let buf = new Buffer(1);

            buf[0] = -3;
            assert.equal(buf[0], 253);

            buf = new Buffer(1);
            buf.writeInt8(-3, 0);
            assert.equal(buf[0], 253);


        });

        it("test that memory is copied from array-like", () => {
            const u = new Uint8Array(4);
            const b = new Buffer(u);
            b[0] = 1;
            b[1] = 2;
            b[2] = 3;
            b[3] = 4;

            assert.equal(u[0], 0);
            assert.equal(u[1], 0);
            assert.equal(u[2], 0);
            assert.equal(u[3], 0);


        });

    });

    describe("base64", () => {
        it("base64: ignore whitespace", () => {
            const text = "\n   YW9ldQ==  ";
            const buf = new Buffer(text, "base64");
            assert.equal(buf.toString(), "aoeu");
        });

        it("base64: strings without padding", () => {
            assert.equal((new Buffer("YW9ldQ", "base64").toString()), "aoeu");
        });

        it("base64: newline in utf8 -- should not be an issue", () => {
            assert.equal(
                new Buffer("LS0tCnRpdGxlOiBUaHJlZSBkYXNoZXMgbWFya3MgdGhlIHNwb3QKdGFnczoK", "base64").toString("utf8"),
                "---\ntitle: Three dashes marks the spot\ntags:\n"
            );

        });

        it("base64: newline in base64 -- should get stripped", () => {
            assert.equal(
                new Buffer("LS0tCnRpdGxlOiBUaHJlZSBkYXNoZXMgbWFya3MgdGhlIHNwb3QKdGFnczoK\nICAtIHlhbWwKICAtIGZyb250LW1hdHRlcgogIC0gZGFzaGVzCmV4cGFuZWQt", "base64").toString("utf8"),
                "---\ntitle: Three dashes marks the spot\ntags:\n  - yaml\n  - front-matter\n  - dashes\nexpaned-"
            );

        });

        it("base64: tab characters in base64 - should get stripped", () => {
            assert.equal(
                new Buffer("LS0tCnRpdGxlOiBUaHJlZSBkYXNoZXMgbWFya3MgdGhlIHNwb3QKdGFnczoK\t\t\t\tICAtIHlhbWwKICAtIGZyb250LW1hdHRlcgogIC0gZGFzaGVzCmV4cGFuZWQt", "base64").toString("utf8"),
                "---\ntitle: Three dashes marks the spot\ntags:\n  - yaml\n  - front-matter\n  - dashes\nexpaned-"
            );

        });

        it("base64: invalid non-alphanumeric characters -- should be stripped", () => {
            assert.equal(
                new Buffer('!"#$%&\'()*,.:;<=>?@[\\]^`{|}~', "base64").toString("utf8"),
                ""
            );

        });

        it("base64: high byte", () => {
            const highByte = Buffer.from([128]);
            assert.deepEqual(
                Buffer.alloc(1, highByte.toString("base64"), "base64"),
                highByte
            );

        });
    });

    describe("comapre", () => {
        it("buffer.compare", () => {
            const b = new Buffer(1).fill("a");
            const c = new Buffer(1).fill("c");
            const d = new Buffer(2).fill("aa");

            assert.equal(b.compare(c), -1);
            assert.equal(c.compare(d), 1);
            assert.equal(d.compare(b), 1);
            assert.equal(b.compare(d), -1);

            // static method
            assert.equal(Buffer.compare(b, c), -1);
            assert.equal(Buffer.compare(c, d), 1);
            assert.equal(Buffer.compare(d, b), 1);
            assert.equal(Buffer.compare(b, d), -1);

        });

        it("buffer.compare argument validation", () => {
            assert.throws(() => {
                const b = new Buffer(1);
                Buffer.compare(b, "abc");
            });

            assert.throws(() => {
                const b = new Buffer(1);
                Buffer.compare("abc", b);
            });

            assert.throws(() => {
                const b = new Buffer(1);
                b.compare("abc");
            });

        });

        it("buffer.equals", () => {
            const b = new Buffer(5).fill("abcdf");
            const c = new Buffer(5).fill("abcdf");
            const d = new Buffer(5).fill("abcde");
            const e = new Buffer(6).fill("abcdef");

            assert.ok(b.equals(c));
            assert.ok(!c.equals(d));
            assert.ok(!d.equals(e));

        });

        it("buffer.equals argument validation", () => {
            assert.throws(() => {
                const b = new Buffer(1);
                b.equals("abc");
            });

        });
    });

    describe("methods", () => {
        it("buffer.toJSON", () => {
            const data = [1, 2, 3, 4];
            assert.deepEqual(
                new Buffer(data).toJSON(),
                { type: "Buffer", data: [1, 2, 3, 4] }
            );

        });

        it("buffer.copy", () => {
            // copied from nodejs.org example
            const buf1 = new Buffer(26);
            const buf2 = new Buffer(26);

            for (let i = 0; i < 26; i++) {
                buf1[i] = i + 97; // 97 is ASCII a
                buf2[i] = 33; // ASCII !
            }

            buf1.copy(buf2, 8, 16, 20);

            assert.equal(
                buf2.toString("ascii", 0, 25),
                "!!!!!!!!qrst!!!!!!!!!!!!!"
            );

        });

        it("test offset returns are correct", () => {
            const b = new Buffer(16);
            assert.equal(4, b.writeUInt32LE(0, 0));
            assert.equal(6, b.writeUInt16LE(0, 4));
            assert.equal(7, b.writeUInt8(0, 6));
            assert.equal(8, b.writeInt8(0, 7));
            assert.equal(16, b.writeDoubleLE(0, 8));

        });

        it("concat() a varying number of buffers", () => {
            const zero = [];
            const one = [new Buffer("asdf")];
            const long = [];
            for (let i = 0; i < 10; i++) {
                long.push(new Buffer("asdf"));
            }

            const flatZero = Buffer.concat(zero);
            const flatOne = Buffer.concat(one);
            const flatLong = Buffer.concat(long);
            const flatLongLen = Buffer.concat(long, 40);

            assert.equal(flatZero.length, 0);
            assert.equal(flatOne.toString(), "asdf");
            assert.deepEqual(flatOne, one[0]);
            assert.equal(flatLong.toString(), (new Array(10 + 1).join("asdf")));
            assert.equal(flatLongLen.toString(), (new Array(10 + 1).join("asdf")));

        });

        it("fill", () => {
            const b = new Buffer(10);
            b.fill(2);
            assert.equal(b.toString("hex"), "02020202020202020202");

        });

        it("fill (string)", () => {
            const b = new Buffer(10);
            b.fill("abc");
            assert.equal(b.toString(), "abcabcabca");
            b.fill("է");
            assert.equal(b.toString(), "էէէէէ");

        });

        it("copy() empty buffer with sourceEnd=0", () => {
            const source = new Buffer([42]);
            const destination = new Buffer([43]);
            source.copy(destination, 0, 0, 0);
            assert.equal(destination.readUInt8(0), 43);

        });

        it("copy() after slice()", () => {
            const source = new Buffer(200);
            const dest = new Buffer(200);
            const expected = new Buffer(200);
            for (let i = 0; i < 200; i++) {
                source[i] = i;
                dest[i] = 0;
            }

            source.slice(2).copy(dest);
            source.copy(expected, 0, 2);
            assert.deepEqual(dest, expected);

        });

        it("copy() ascending", () => {
            const b = new Buffer("abcdefghij");
            b.copy(b, 0, 3, 10);
            assert.equal(b.toString(), "defghijhij");

        });

        it("copy() descending", () => {
            const b = new Buffer("abcdefghij");
            b.copy(b, 3, 0, 7);
            assert.equal(b.toString(), "abcabcdefg");

        });

        it("buffer.slice sets indexes", () => {
            assert.equal((new Buffer("hallo")).slice(0, 5).toString(), "hallo");

        });

        it("buffer.slice out of range", () => {
            assert.equal((new Buffer("hallo")).slice(0, 10).toString(), "hallo");
            assert.equal((new Buffer("hallo")).slice(10, 2).toString(), "");

        });
    });

    describe("slice", () => {
        it("modifying buffer created by .slice() modifies original memory", () => {
            const buf1 = new Buffer(26);
            for (let i = 0; i < 26; i++) {
                buf1[i] = i + 97; // 97 is ASCII a
            }

            const buf2 = buf1.slice(0, 3);
            assert.equal(buf2.toString("ascii", 0, buf2.length), "abc");

            buf2[0] = "!".charCodeAt(0);
            assert.equal(buf1.toString("ascii", 0, buf2.length), "!bc");


        });

        it("modifying parent buffer modifies .slice() buffer's memory", () => {
            const buf1 = new Buffer(26);
            for (let i = 0; i < 26; i++) {
                buf1[i] = i + 97; // 97 is ASCII a
            }

            const buf2 = buf1.slice(0, 3);
            assert.equal(buf2.toString("ascii", 0, buf2.length), "abc");

            buf1[0] = "!".charCodeAt(0);
            assert.equal(buf2.toString("ascii", 0, buf2.length), "!bc");


        });
    });

    describe("write", () => {
        it("buffer.write string should get parsed as number", () => {
            const b = new Buffer(64);
            b.writeUInt16LE("1003", 0);
            assert.equal(b.readUInt16LE(0), 1003);

        });

        it("buffer.writeUInt8 a fractional number will get Math.floored", () => {
            // Some extra work is necessary to make this test pass with the Object implementation

            const b = new Buffer(1);
            b.writeInt8(5.5, 0);
            assert.equal(b[0], 5);

        });

        it("writeUint8 with a negative number throws", () => {
            const buf = new Buffer(1);

            assert.throws(() => {
                buf.writeUInt8(-3, 0);
            });


        });

        it("hex of write{Uint,Int}{8,16,32}{LE,BE}", () => {
            const hex = [
                "03", "0300", "0003", "03000000", "00000003",
                "fd", "fdff", "fffd", "fdffffff", "fffffffd"
            ];
            const reads = [3, 3, 3, 3, 3, -3, -3, -3, -3, -3];
            const xs = ["UInt", "Int"];
            const ys = [8, 16, 32];
            for (let i = 0; i < xs.length; i++) {
                const x = xs[i];
                for (let j = 0; j < ys.length; j++) {
                    const y = ys[j];
                    const endianesses = (y === 8) ? [""] : ["LE", "BE"];
                    for (let k = 0; k < endianesses.length; k++) {
                        const z = endianesses[k];

                        const v1 = new Buffer(y / 8);
                        const writefn = `write${x}${y}${z}`;
                        const val = (x === "Int") ? -3 : 3;
                        v1[writefn](val, 0);
                        assert.equal(
                            v1.toString("hex"),
                            hex.shift()
                        );
                        const readfn = `read${x}${y}${z}`;
                        assert.equal(
                            v1[readfn](0),
                            reads.shift()
                        );
                    }
                }
            }

        });

        it("hex of write{Uint,Int}{8,16,32}{LE,BE} with overflow", () => {
            const hex = [
                "", "03", "00", "030000", "000000",
                "", "fd", "ff", "fdffff", "ffffff"
            ];
            const reads = [
                undefined, 3, 0, NaN, 0,
                undefined, 253, -256, 16777213, -256
            ];
            const xs = ["UInt", "Int"];
            const ys = [8, 16, 32];
            for (let i = 0; i < xs.length; i++) {
                const x = xs[i];
                for (let j = 0; j < ys.length; j++) {
                    const y = ys[j];
                    const endianesses = (y === 8) ? [""] : ["LE", "BE"];
                    for (let k = 0; k < endianesses.length; k++) {
                        const z = endianesses[k];

                        const v1 = new Buffer((y / 8) - 1);
                        const next = new Buffer(4);
                        next.writeUInt32BE(0, 0);
                        const writefn = `write${x}${y}${z}`;
                        const val = (x === "Int") ? -3 : 3;
                        v1[writefn](val, 0, true);
                        assert.equal(
                            v1.toString("hex"),
                            hex.shift()
                        );
                        // check that nothing leaked to next buffer.
                        assert.equal(next.readUInt32BE(0), 0);
                        // check that no bytes are read from next buffer.
                        next.writeInt32BE(~0, 0);
                        const readfn = `read${x}${y}${z}`;
                        const r = reads.shift();
                        if (is.nan(r)) {
                            assert.ok("equal");
                        } else {
                            assert.equal(v1[readfn](0, true), r);
                        }
                    }
                }
            }

        });
        it("large values do not improperly roll over (ref #80)", () => {
            const nums = [-25589992, -633756690, -898146932];
            const out = new Buffer(12);
            out.fill(0);
            out.writeInt32BE(nums[0], 0);
            let newNum = out.readInt32BE(0);
            assert.equal(nums[0], newNum);
            out.writeInt32BE(nums[1], 4);
            newNum = out.readInt32BE(4);
            assert.equal(nums[1], newNum);
            out.writeInt32BE(nums[2], 8);
            newNum = out.readInt32BE(8);
            assert.equal(nums[2], newNum);

        });
    });

    describe("write infinity", () => {
        it("write/read Infinity as a float", () => {
            const buf = new Buffer(4);
            assert.equal(buf.writeFloatBE(Infinity, 0), 4);
            assert.equal(buf.readFloatBE(0), Infinity);

        });

        it("write/read -Infinity as a float", () => {
            const buf = new Buffer(4);
            assert.equal(buf.writeFloatBE(-Infinity, 0), 4);
            assert.equal(buf.readFloatBE(0), -Infinity);

        });

        it("write/read Infinity as a double", () => {
            const buf = new Buffer(8);
            assert.equal(buf.writeDoubleBE(Infinity, 0), 8);
            assert.equal(buf.readDoubleBE(0), Infinity);

        });

        it("write/read -Infinity as a double", () => {
            const buf = new Buffer(8);
            assert.equal(buf.writeDoubleBE(-Infinity, 0), 8);
            assert.equal(buf.readDoubleBE(0), -Infinity);

        });

        it("write/read float greater than max", () => {
            const buf = new Buffer(4);
            assert.equal(buf.writeFloatBE(4e38, 0), 4);
            assert.equal(buf.readFloatBE(0), Infinity);

        });

        it("write/read float less than min", () => {
            const buf = new Buffer(4);
            assert.equal(buf.writeFloatBE(-4e40, 0), 4);
            assert.equal(buf.readFloatBE(0), -Infinity);

        });
    });

    describe("static", () => {
        it("Buffer.isEncoding", () => {
            assert.equal(Buffer.isEncoding("HEX"), true);
            assert.equal(Buffer.isEncoding("hex"), true);
            assert.equal(Buffer.isEncoding("bad"), false);

        });

        it("Buffer.isBuffer", () => {
            assert.equal(Buffer.isBuffer(new Buffer("hey", "utf8")), true);
            assert.equal(Buffer.isBuffer(new Buffer([1, 2, 3], "utf8")), true);
            assert.equal(Buffer.isBuffer("hey"), false);

        });
    });
});
