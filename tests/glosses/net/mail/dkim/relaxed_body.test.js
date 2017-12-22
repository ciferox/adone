describe("net", "mail", "DKIM RelaxedBody Tests", () => {
    const { net: { mail: { __: { dkim: { RelaxedBody } } } }, std: { fs, path } } = adone;

    it("Should calculate body hash byte by byte", (done) => {
        fs.readFile(path.resolve(__dirname, "fixtures", "message1.eml"), "utf-8", (err, message) => {
            expect(err).to.not.exist();

            message = message.replace(/\r?\n/g, "\r\n");
            message = message.split("\r\n\r\n");
            message.shift();
            message = message.join("\r\n\r\n");

            message = Buffer.from(message);

            const s = new RelaxedBody({
                hashAlgo: "sha256",
                debug: true
            });

            s.on("hash", (hash) => {
                expect(hash).to.equal("D2H5TEwtUgM2u8Ew0gG6vnt/Na6L+Zep7apmSmfy8IQ=");
                done();
            });

            let pos = 0;
            const stream = () => {
                if (pos >= message.length) {
                    return s.end();
                }
                const ord = Buffer.from([message[pos++]]);
                s.write(ord);
                setImmediate(stream);
            };
            setImmediate(stream);
        });
    });


    it("Should calculate body hash all at once", (done) => {
        fs.readFile(path.resolve(__dirname, "fixtures", "message1.eml"), "utf-8", (err, message) => {
            expect(err).to.not.exist();

            message = message.replace(/\r?\n/g, "\r\n");
            message = message.split("\r\n\r\n");
            message.shift();
            message = message.join("\r\n\r\n");

            message = Buffer.from(message);

            const s = new RelaxedBody({
                hashAlgo: "sha256",
                debug: true
            });

            s.on("hash", (hash) => {
                expect(hash).to.equal("D2H5TEwtUgM2u8Ew0gG6vnt/Na6L+Zep7apmSmfy8IQ=");
                done();
            });

            setImmediate(() => s.end(message));
        });

    });
});
