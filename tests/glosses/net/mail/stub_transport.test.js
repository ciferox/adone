process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const stubTransport = adone.net.mail.stubTransport;
const PassThrough = require("stream").PassThrough;

function MockBuilder(envelope, message) {
    this.envelope = envelope;
    this.message = new PassThrough();
    this.message.end(message);
}

MockBuilder.prototype.getEnvelope = function () {
    return this.envelope;
};

MockBuilder.prototype.createReadStream = function () {
    return this.message;
};

MockBuilder.prototype.getHeader = function () {
    return "teretere";
};

describe("Stub Transport Tests", () => {
    it("Should expose version number", () => {
        const client = stubTransport();
        expect(client.name).to.exist;
        expect(client.version).to.exist;
    });

    it("Should send mail", (done) => {
        const client = stubTransport();

        const message = new Array(1024).join("teretere, vana kere\n");

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, message)
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.response.toString()).to.equal(message);
            done();
        });
    });

    it("Should verify settings", (done) => {
        const client = stubTransport();

        client.verify((err, status) => {
            expect(err).to.not.exist;
            expect(status).to.be.true;
            done();
        });
    });

    it("Should not verify settings", (done) => {
        const client = stubTransport({
            error: new Error("test")
        });

        client.verify((err, status) => {
            expect(err).to.exist;
            expect(status).to.not.be.true;
            done();
        });
    });

    it("Should fire the events", (done) => {
        const envelopeSpy = spy();
        const dataSpy = spy();
        const endSpy = spy();
        const client = stubTransport();
        client.on("envelope", envelopeSpy);
        client.on("data", dataSpy);
        client.on("end", endSpy);

        const message = new Array(1024).join("teretere, vana kere\n");
        const envelope = {
            from: "test@valid.sender",
            to: "test@valid.recipient"
        };

        client.send({
            data: {},
            message: new MockBuilder(envelope, message)
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.response.toString()).to.equal(message);
            expect(envelopeSpy.calledWith(envelope)).to.be.true;
            expect(dataSpy.calledWith(message)).to.be.true;
            expect(endSpy.calledWith(info)).to.be.true;
            done();
        });
    });

    it("Should return an error", (done) => {
        const client = stubTransport({
            error: new Error("Invalid recipient")
        });

        const message = new Array(1024).join("teretere, vana kere\n");

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, message)
        }, (err) => {
            expect(err).to.exist;
            done();
        });
    });
});
