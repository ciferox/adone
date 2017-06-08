describe("net", "mail", "Sendmail Unix Newlines", () => {
    const { net: { mail: { __: { LeUnix } } } } = adone;

    it("should rewrite all linebreaks (byte by byte)", (done) => {
        const source = "tere tere\nteine rida\nkolmas rida\r\nneljas rida\r\nviies rida\n kuues rida";

        const chunks = [];
        const out = new LeUnix();
        out.on("data", (chunk) => chunks.push(chunk));
        out.on("end", () => {
            expect(Buffer.concat(chunks).toString()).to.equal(source.replace(/\r?\n/g, "\n"));
            done();
        });

        const data = Buffer.from(source);
        let pos = 0;
        const writeNextByte = () => {
            if (pos >= data.length) {
                return out.end();
            }
            out.write(Buffer.from([data[pos++]]));
            setImmediate(writeNextByte);
        };

        setImmediate(writeNextByte);
    });

    it("should rewrite all linebreaks (all at once)", (done) => {
        const source = "tere tere\nteine rida\nkolmas rida\r\nneljas rida\r\nviies rida\n kuues rida";

        const chunks = [];
        const out = new LeUnix();
        out.on("data", (chunk) => chunks.push(chunk));
        out.on("end", () => {
            expect(Buffer.concat(chunks).toString()).to.equal(source.replace(/\r?\n/g, "\n"));
            done();
        });

        const data = Buffer.from(source);
        out.end(data);
    });

});
