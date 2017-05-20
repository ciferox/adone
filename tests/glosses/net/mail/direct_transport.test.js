process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const net = require("net");
const directTransport = adone.net.mail.directTransport;
const SMTPServer = require("smtp-server").SMTPServer;

const PORT_NUMBER = 8712;

function MockBuilder(envelope, message) {
    this.envelope = envelope;
    this.message = message;
    this._headers = [];
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

describe("SMTP Transport Tests", function () {
    this.timeout(100 * 1000); // eslint-disable-line

    let server;
    let retryCount = 0;

    beforeEach((done) => {
        server = new SMTPServer({
            disabledCommands: ["STARTTLS", "AUTH"],

            onData(stream, session, callback) {
                stream.on("data", () => {});
                stream.on("end", () => {
                    let err;
                    if (/retry@/.test(session.envelope.mailFrom.address) && retryCount++ < 3) {
                        err = new Error("Please try again later");
                        err.responseCode = 451;
                        return callback(err);
                    } 
                    return callback(null, "OK");
                    
                });
            },

            onMailFrom(address, session, callback) {
                if (/invalid@/.test(address.address)) {
                    return callback(new Error("Invalid sender"));
                }
                return callback(); // Accept the address
            },
            onRcptTo(address, session, callback) {
                if (/invalid@/.test(address.address)) {
                    return callback(new Error("Invalid recipient"));
                }
                return callback(); // Accept the address
            },
            logger: false
        });

        server.listen(PORT_NUMBER, done);
    });

    afterEach((done) => {
        server.close(done);
    });

    it("Should expose version number", () => {
        const client = directTransport();
        expect(client.name).to.exist;
        expect(client.version).to.exist;
    });

    it("Should send mail", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            logger: false,
            debug: true
        });

        const chunks = [];
        const message = new Array(1024).join("teretere, vana kere\n");

        server.on("data", (connection, chunk) => {
            chunks.push(chunk);
        });

        server.on("dataReady", (connection, callback) => {
            const body = Buffer.concat(chunks);
            expect(body.toString()).to.equal(message.trim().replace(/\n/g, "\r\n"));
            callback(null, true);
        });

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@[127.0.0.1]",
                to: ["test@[127.0.0.1]"]
            }, message)
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.accepted).to.deep.equal(["test@[127.0.0.1]"]);
            done();
        });
    });

    it("Should retry mail", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            retryDelay: 1000,
            logger: false,
            debug: true
        });

        client.send({
            data: {},
            message: new MockBuilder({
                from: "retry@[127.0.0.1]",
                to: ["test@[127.0.0.1]", "test2@[127.0.0.1]"]
            }, "test")
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.pending.length).to.equal(1);
            done();
        });
    });

    it("Should reject mail", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            retryDelay: 1000,
            logger: false,
            debug: true
        });

        client.send({
            data: {},
            message: new MockBuilder({
                from: "invalid@[127.0.0.1]",
                to: ["test@[127.0.0.1]", "test2@[127.0.0.1]"]
            }, "test")
        }, (err) => {
            expect(err).to.exist;
            expect(err.errors[0].recipients).to.deep.equal(["test@[127.0.0.1]", "test2@[127.0.0.1]"]);
            done();
        });
    });

    it("Should resolve MX", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            retryDelay: 1000,
            logger: false,
            debug: true
        });

        client._resolveMx("kreata.ee", (err, list) => {
            expect(err).to.not.exist;
            expect(list.sort((a, b) => {
                return a.priority - b.priority;
            })).to.deep.equal([{
                exchange: "aspmx.l.google.com",
                priority: 10
            }, {
                exchange: "alt1.aspmx.l.google.com",
                priority: 20
            }, {
                exchange: "alt2.aspmx.l.google.com",
                priority: 30
            }]);
            done();
        });
    });

    it("Should resolve A", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            retryDelay: 1000,
            logger: false,
            debug: true
        });

        client._resolveMx("localhost.kreata.ee", (err, list) => {
            expect(err).to.not.exist;
            expect(list).to.deep.equal([{
                priority: 0,
                exchange: "127.0.0.1"
            }]);
            done();
        });
    });

    it("Should send mail to next alternative MX", (done) => {
        const client = directTransport({
            port: PORT_NUMBER,
            logger: false,
            debug: false
        });

        const chunks = [];
        const message = new Array(1024).join("teretere, vana kere\n");

        server.on("data", (connection, chunk) => {
            chunks.push(chunk);
        });

        server.on("dataReady", (connection, callback) => {
            const body = Buffer.concat(chunks);
            expect(body.toString()).to.equal(message.trim().replace(/\n/g, "\r\n"));
            callback(null, true);
        });

        client._resolveMx = function (mx, callback) {
            callback(null, [{
                priority: 1,
                exchange: "255.255.255.255"
            }, {
                priority: 2,
                exchange: "127.0.0.1"
            }]);
        };

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@test",
                to: ["test@test"]
            }, message)
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.accepted).to.deep.equal(["test@test"]);
            done();
        });
    });

    it("Should send mail using proxied socket", (done) => {
        const client = directTransport({
            port: 25,
            logger: false,
            debug: true,
            getSocket(options, callback) {
                const socket = net.connect(PORT_NUMBER, "localhost");
                const errHandler = function (err) {
                    callback(err);
                };
                socket.on("error", errHandler);
                socket.on("connect", () => {
                    socket.removeListener("error", errHandler);
                    callback(null, {
                        connection: socket
                    });
                });
            }
        });

        let chunks = [],
            message = new Array(1024).join("teretere, vana kere\n");

        server.on("data", (connection, chunk) => {
            chunks.push(chunk);
        });

        server.on("dataReady", (connection, callback) => {
            const body = Buffer.concat(chunks);
            expect(body.toString()).to.equal(message.trim().replace(/\n/g, "\r\n"));
            callback(null, true);
        });

        client.send({
            data: {},
            message: new MockBuilder({
                from: "test@[127.0.0.1]",
                to: ["test@[127.0.0.1]"]
            }, message)
        }, (err, info) => {
            expect(err).to.not.exist;
            expect(info.accepted).to.deep.equal(["test@[127.0.0.1]"]);
            done();
        });
    });
});
