describe("glosses", "net", "mail", "Stream Transport Tests", function () {
    this.timeout(10000);

    const { net: { mail: { __: { StreamTransport } } }, std: { stream: { PassThrough } } } = adone;

    class MockBuilder {
        constructor(envelope, message, messageId) {
            this.envelope = envelope;
            this.rawMessage = message;
            this.mid = messageId || "<test>";
        }

        getEnvelope() {
            return this.envelope;
        }

        messageId() {
            return this.mid;
        }

        createReadStream() {
            const stream = new PassThrough();
            setImmediate(() => stream.end(this.rawMessage));
            return stream;
        }

        getHeader() {
            return "teretere";
        }
    }


    it("Should expose version number", () => {
        const client = new StreamTransport();
        expect(client.name).to.exist;
        expect(client.version).to.exist;
    });

    describe("Send as stream", () => {

        it("Should send mail using unix newlines", (done) => {
            const client = new StreamTransport();
            let chunks = [],
                message = new Array(100).join("teretere\r\nvana kere\r\n");

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err, info) => {
                expect(err).to.not.exist;

                expect(info.envelope).to.deep.equal({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                });

                expect(info.messageId).to.equal("<test>");

                info.message.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                info.message.on("end", () => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.replace(/\r\n/g, "\n"));
                    done();
                });
            });
        });

        it("Should send mail using windows newlines", (done) => {
            const client = new StreamTransport({
                newline: "windows"
            });
            let chunks = [],
                message = new Array(100).join("teretere\nvana kere\n");

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err, info) => {
                expect(err).to.not.exist;

                info.message.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                info.message.on("end", () => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.replace(/\n/g, "\r\n"));
                    done();
                });
            });
        });
    });

    describe("Send as buffer", () => {

        it("Should send mail using unix newlines", (done) => {
            const client = new StreamTransport({
                buffer: true
            });
            const message = new Array(100).join("teretere\r\nvana kere\r\n");

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err, info) => {
                expect(err).to.not.exist;

                expect(info.message.toString()).to.equal(message.replace(/\r\n/g, "\n"));
                done();
            });
        });

        it("Should send mail using windows newlines", (done) => {
            const client = new StreamTransport({
                newline: "windows",
                buffer: true
            });
            const message = new Array(100).join("teretere\nvana kere\n");

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err, info) => {
                expect(err).to.not.exist;

                expect(info.message.toString()).to.equal(message.replace(/\n/g, "\r\n"));
                done();
            });
        });
    });
});
