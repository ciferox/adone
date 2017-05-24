describe("glosses", "net", "mail", "DKIM MessageParser Tests", () => {
    const { net: { mail: { __: { dkim: { MessageParser } } } } } = adone;

    it("should extract header and body", (done) => {
        const parser = new MessageParser();
        const message =
            `From: saatja aadress
To: Saaja aadress
Subject: pealkiri
  mitmel
  real
Message-Id: test

tere tere
teine rida
`;

        const chunks = [];
        let headers = false;
        let end = false;

        parser.on("data", (chunk) => {
            chunks.push(chunk);
        });

        parser.on("end", () => {
            end = true;
            const body = Buffer.concat(chunks).toString();
            expect(body).to.equal("tere tere\nteine rida\n");
            if (headers) {
                return done();
            }
        });

        parser.on("headers", (data) => {
            expect(data).to.deep.equal([
                // fix auto format
                {
                    key: "from",
                    line: "From: saatja aadress"
                },
                {
                    key: "to",
                    line: "To: Saaja aadress"
                },
                {
                    key: "subject",
                    line: "Subject: pealkiri\n  mitmel\n  real"
                },
                {
                    key: "message-id",
                    line: "Message-Id: test"
                }
            ]);
            headers = true;
            if (end) {
                return done();
            }
        });

        parser.end(Buffer.from(message));
    });
});
