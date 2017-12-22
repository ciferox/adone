describe("net", "mail", "Sendmail Transport Tests", () => {
    const {
        net: { mail: { __: { SendmailTransport } } },
        event: { EventEmitter },
        std: { stream: { PassThrough } }
    } = adone;

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

    const NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    before(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    });

    after(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED;
    });

    it("Should expose version number", () => {
        const client = new SendmailTransport();
        expect(client.name).to.exist();
        expect(client.version).to.exist();
    });

    it("Should send message", (done) => {
        const client = new SendmailTransport();

        const stubbedSpawn = new EventEmitter();
        stubbedSpawn.stdin = new PassThrough();
        stubbedSpawn.stdout = new PassThrough();

        let output = "";
        stubbedSpawn.stdin.on("data", (chunk) => {
            output += chunk.toString();
        });

        stubbedSpawn.stdin.on("end", () => {
            stubbedSpawn.emit("close", 0);
            stubbedSpawn.emit("exit", 0);
        });

        stub(client, "_spawn").returns(stubbedSpawn);

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, "message\r\nline 2")
        }, (err, data) => {
            expect(err).to.not.exist();
            expect(data.messageId).to.equal("<test>");
            expect(output).to.equal("message\nline 2");
            client._spawn.restore();
            done();
        });
    });

    it("Should return an error", (done) => {
        const client = new SendmailTransport();

        const stubbedSpawn = new EventEmitter();
        stubbedSpawn.stdin = new PassThrough();
        stubbedSpawn.stdout = new PassThrough();

        stubbedSpawn.stdin.on("data", () => false);

        stubbedSpawn.stdin.on("end", () => {
            stubbedSpawn.emit("close", 127);
            stubbedSpawn.emit("exit", 127);
        });

        stub(client, "_spawn").returns(stubbedSpawn);

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, "message\r\nline 2")
        }, (err, data) => {
            expect(err).to.exist();
            expect(data).to.not.exist();
            client._spawn.restore();
            done();
        });
    });
});
