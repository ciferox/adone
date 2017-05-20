const libbase64 = adone.net.mail.base64;
const crypto = require("crypto");
const fs = require("fs");

describe("libbase64", () => {

    const encodeFixtures = [
        ["abcd= ÕÄÖÜ", "YWJjZD0gw5XDhMOWw5w="],
        ["foo bar  ", "Zm9vIGJhciAg"],
        ["foo bar\t\t", "Zm9vIGJhcgkJ"],
        ["foo \r\nbar", "Zm9vIA0KYmFy"]
    ];

    const decodeFixtures = [
        ["foo bar\r\nbaz\r\n", "Zm9v\r\nIGJhcg0\r\nKYmF6DQo="]
    ];

    const wrapFixtures = [
        [
            "dGVyZSwgdGVyZSwgdmFuYSBrZXJlLCBrdWlkYXMgc3VsIGzDpGhlYj8=",
            "dGVyZSwgdGVyZSwgdmFu\r\nYSBrZXJlLCBrdWlkYXMg\r\nc3VsIGzDpGhlYj8="
        ]
    ];

    const streamFixture = [
        "123456789012345678  90\r\nõäöüõäöüõäöüõäöüõäöüõäöüõäöüõäöü another line === ",
        "MTIzNDU2N\r\nzg5MDEyMz\r\nQ1Njc4ICA\r\n5MA0Kw7XD\r\npMO2w7zDt\r\ncOkw7bDvM\r\nO1w6TDtsO\r\n8w7XDpMO2\r\nw7zDtcOkw\r\n7bDvMO1w6\r\nTDtsO8w7X\r\nDpMO2w7zD\r\ntcOkw7bDv\r\nCBhbm90aG\r\nVyIGxpbmU\r\ngPT09IA=="
    ];

    describe("#encode", () => {
        it("shoud encode UTF-8 string to base64", () => {
            encodeFixtures.forEach((test) => {
                expect(libbase64.encode(test[0])).to.equal(test[1]);
            });
        });

        it("shoud encode Buffer to base64", () => {
            expect(libbase64.encode(new Buffer([0x00, 0x01, 0x02, 0x20, 0x03]))).to.equal("AAECIAM=");
        });
    });

    describe("#decode", () => {
        it("shoud decode base64", () => {
            encodeFixtures.concat(decodeFixtures).forEach((test) => {
                expect(libbase64.decode(test[1]).toString("utf-8")).to.equal(test[0]);
            });
        });
    });

    describe("#wrap", () => {
        it("should wrap long base64 encoded lines", () => {
            wrapFixtures.forEach((test) => {
                expect(libbase64.wrap(test[0], 20)).to.equal(test[1]);
            });
        });
    });

    describe("base64 Streams", () => {

        it("should transform incoming bytes to base64", (done) => {
            const encoder = new libbase64.Encoder({
                lineLength: 9
            });

            let bytes = new Buffer(streamFixture[0]),
                i = 0,
                buf = [],
                buflen = 0;

            encoder.on("data", (chunk) => {
                buf.push(chunk);
                buflen += chunk.length;
            });

            encoder.on("end", (chunk) => {
                if (chunk) {
                    buf.push(chunk);
                    buflen += chunk.length;
                }
                buf = Buffer.concat(buf, buflen);

                expect(buf.toString()).to.equal(streamFixture[1]);
                done();
            });

            var sendNextByte = function () {
                if (i >= bytes.length) {
                    return encoder.end();
                }

                const ord = bytes[i++];
                encoder.write(new Buffer([ord]));
                setImmediate(sendNextByte);
            };

            sendNextByte();
        });


        it("should transform incoming base64 to bytes", (done) => {
            const decoder = new libbase64.Decoder();

            let bytes = new Buffer(streamFixture[1]),
                i = 0,
                buf = [],
                buflen = 0;

            decoder.on("data", (chunk) => {
                buf.push(chunk);
                buflen += chunk.length;
            });

            decoder.on("end", (chunk) => {
                if (chunk) {
                    buf.push(chunk);
                    buflen += chunk.length;
                }
                buf = Buffer.concat(buf, buflen);

                expect(buf.toString()).to.equal(streamFixture[0]);
                done();
            });

            var sendNextByte = function () {
                if (i >= bytes.length) {
                    return decoder.end();
                }

                const ord = bytes[i++];
                decoder.write(new Buffer([ord]));
                setImmediate(sendNextByte);
            };

            sendNextByte();
        });

        it("should transform incoming bytes to base64 and back", (done) => {
            const decoder = new libbase64.Decoder();
            const encoder = new libbase64.Encoder();
            const file = fs.createReadStream(`${__dirname}/fixtures/alice.txt`);

            let fhash = crypto.createHash("md5");
            let dhash = crypto.createHash("md5");

            file.pipe(encoder).pipe(decoder);

            file.on("data", (chunk) => {
                fhash.update(chunk);
            });

            file.on("end", () => {
                fhash = fhash.digest("hex");
            });

            decoder.on("data", (chunk) => {
                dhash.update(chunk);
            });

            decoder.on("end", () => {
                dhash = dhash.digest("hex");
                expect(fhash).to.equal(dhash);
                done();
            });
        });
    });
});
