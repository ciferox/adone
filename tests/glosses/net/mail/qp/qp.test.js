import * as libqp from "libqp";

describe("net", "mail", "Quoted-Printable Tests", () => {
    const { net: { mail: { __: { qp } } }, std: { crypto, fs, path } } = adone;

    const encodeFixtures = [
        ["abcd= ÕÄÖÜ", "abcd=3D =C3=95=C3=84=C3=96=C3=9C"],
        ["foo bar  ", "foo bar =20"],
        ["foo bar\t\t", "foo bar\t=09"],
        ["foo \r\nbar", "foo=20\r\nbar"]
    ];

    const wrapFixtures = [
        [
            "tere, tere, vana kere, kuidas sul l=C3=A4heb?",
            "tere, tere, vana =\r\nkere, kuidas sul =\r\nl=C3=A4heb?"
        ],
        [
            "=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4=C3=A4",
            "=C3=A4=C3=A4=\r\n=C3=A4=C3=A4=\r\n=C3=A4=C3=A4=\r\n=C3=A4=C3=A4=\r\n=C3=A4=C3=A4"
        ],
        [
            "1234567890123456789=C3=A40", "1234567890123456789=\r\n=C3=A40"
        ],
        [
            "123456789012345678  90", "123456789012345678 =\r\n 90"
        ]
    ];

    const streamFixture = [
        "123456789012345678  90\r\nõäöüõäöüõäöüõäöüõäöüõäöüõäöüõäöü another line === ",
        "12345678=\r\n90123456=\r\n78=20=20=\r\n90\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=20anoth=\r\ner=20lin=\r\ne=20=3D=\r\n=3D=3D=20"
    ];

    describe("#encode", () => {
        it("shoud encode UTF-8 string to QP", () => {
            encodeFixtures.forEach((test) => {
                expect(qp.encode(test[0])).to.equal(test[1]);
            });
        });

        it("shoud encode Buffer to QP", () => {
            expect(qp.encode(new Buffer([0x00, 0x01, 0x02, 0x20, 0x03]))).to.equal("=00=01=02 =03");
        });
    });

    describe("#wrap", () => {
        it("should wrap long QP encoded lines", () => {
            wrapFixtures.forEach((test) => {
                expect(qp.wrap(test[0], 20)).to.equal(test[1]);
            });
        });

        it("should wrap line ending with <CR>", () => {
            expect(qp.wrap("alfa palfa kalfa ralfa\r", 10)).to.equal("alfa palf=\r\na kalfa =\r\nralfa\r");
        });
    });

    describe("QP Streams", () => {

        it("should transform incoming bytes to QP", (done) => {
            const encoder = new qp.Encoder({
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

            const sendNextByte = function () {
                if (i >= bytes.length) {
                    return encoder.end();
                }

                const ord = bytes[i++];
                encoder.write(new Buffer([ord]));
                setImmediate(sendNextByte);
            };

            sendNextByte();
        });

        it("should transform incoming bytes to QP and back", (done) => {
            const decoder = new libqp.Decoder();
            const encoder = new qp.Encoder();
            const file = fs.createReadStream(path.resolve(__dirname, "fixtures", "alice.txt"));

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
