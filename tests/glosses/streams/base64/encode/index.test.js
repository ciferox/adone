const libbase64 = require("libbase64");

describe("glosses", "stream", "base64", "Encode", () => {
    const { std: { crypto, fs }, stream: { base64: { Encode } } } = adone;

    const fixture = [
        "123456789012345678  90\r\nõäöüõäöüõäöüõäöüõäöüõäöüõäöüõäöü another line === ",
        "MTIzNDU2N\r\nzg5MDEyMz\r\nQ1Njc4ICA\r\n5MA0Kw7XD\r\npMO2w7zDt\r\ncOkw7bDvM\r\nO1w6TDtsO\r\n8w7XDpMO2\r\nw7zDtcOkw\r\n7bDvMO1w6\r\nTDtsO8w7X\r\nDpMO2w7zD\r\ntcOkw7bDv\r\nCBhbm90aG\r\nVyIGxpbmU\r\ngPT09IA=="
    ];

    it("should transform incoming bytes to base64", (done) => {
        const encoder = new Encode({
            lineLength: 9
        });

        const bytes = Buffer.from(fixture[0]);
        let i = 0;
        let buf = [];
        let buflen = 0;

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

            expect(buf.toString()).to.equal(fixture[1]);
            done();
        });

        const sendNextByte = function () {
            if (i >= bytes.length) {
                return encoder.end();
            }

            const ord = bytes[i++];
            encoder.write(Buffer.from([ord]));
            setImmediate(sendNextByte);
        };

        sendNextByte();
    });

    it("should transform incoming bytes to base64 and back", (done) => {
        const decoder = new libbase64.Decoder();
        const encoder = new Encode();
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
