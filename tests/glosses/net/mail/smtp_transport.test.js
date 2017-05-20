process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const net = require("net");
const smtpTransport = adone.net.mail.smtpTransport;
const SMTPServer = require("smtp-server").SMTPServer;

const PORT_NUMBER = 8397;

function MockBuilder(envelope, message) {
    this.envelope = envelope;
    this.message = message;
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
    this.timeout(10000);

    describe("Anonymous sender tests", () => {

        let server;

        beforeEach((done) => {
            server = new SMTPServer({
                disabledCommands: ["STARTTLS", "AUTH"],

                onData(stream, session, callback) {
                    stream.on("data", () => {});
                    stream.on("end", callback);
                },

                onMailFrom(address, session, callback) {
                    if (!/@valid.sender/.test(address.address)) {
                        return callback(new Error("Only user@valid.sender is allowed to send mail"));
                    }
                    return callback(); // Accept the address
                },

                onRcptTo(address, session, callback) {
                    if (!/@valid.recipient/.test(address.address)) {
                        return callback(new Error("Only user@valid.recipient is allowed to receive mail"));
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
            const client = smtpTransport();
            expect(client.name).to.exist;
            expect(client.version).to.exist;
        });

        it("Should detect wellknown data", () => {
            const client = smtpTransport({
                service: "google mail",
                logger: false
            });
            expect(client.options.host).to.equal("smtp.gmail.com");
            expect(client.options.port).to.equal(465);
            expect(client.options.secure).to.be.true;
        });

        it("Should fail envelope", (done) => {
            const client = smtpTransport({
                port: PORT_NUMBER,
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@invalid.sender",
                    to: "test@valid.recipient"
                }, "test")
            }, (err) => {
                expect(err.code).to.equal("EENVELOPE");
                done();
            });
        });

        it("Should fail message", (done) => {
            const client = smtpTransport({
                port: PORT_NUMBER,
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, "")
            }, (err) => {
                expect(err.code).to.equal("EMESSAGE");
                done();
            });
        });

        it("Should fail auth", (done) => {
            const client = smtpTransport({
                port: PORT_NUMBER,
                auth: {
                    user: "zzz"
                },
                logger: false
            });

            client.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, "message")
            }, (err) => {
                expect(err.code).to.equal("EAUTH");
                done();
            });
        });

        it("Should send mail", (done) => {
            const client = smtpTransport(`smtp:localhost:${PORT_NUMBER}?logger=false`);
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
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe("Authenticated sender tests", () => {

        let server;

        beforeEach((done) => {
            server = new SMTPServer({
                authMethods: ["PLAIN", "XOAUTH2"],
                disabledCommands: ["STARTTLS"],

                onData(stream, session, callback) {
                    stream.on("data", () => {});
                    stream.on("end", callback);
                },

                onAuth(auth, session, callback) {
                    if (auth.method !== "XOAUTH2") {
                        if (auth.username !== "testuser" || auth.password !== "testpass") {
                            return callback(new Error("Invalid username or password"));
                        }
                    } else if (auth.username !== "testuser" || auth.accessToken !== "testtoken") {
                        return callback(null, {
                            data: {
                                status: "401",
                                schemes: "bearer mac",
                                scope: "my_smtp_access_scope_name"
                            }
                        });
                    }
                    callback(null, {
                        user: 123
                    });
                },
                onMailFrom(address, session, callback) {
                    if (!/@valid.sender/.test(address.address)) {
                        return callback(new Error("Only user@valid.sender is allowed to send mail"));
                    }
                    return callback(); // Accept the address
                },
                onRcptTo(address, session, callback) {
                    if (!/@valid.recipient/.test(address.address)) {
                        return callback(new Error("Only user@valid.recipient is allowed to receive mail"));
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

        it("Should login and send mail", (done) => {
            const client = smtpTransport({
                url: `smtp:testuser:testpass@localhost:${PORT_NUMBER}`,
                logger: false
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
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                done();
            });
        });

        it("Should verify connection with success", (done) => {
            const client = smtpTransport({
                url: `smtp:testuser:testpass@localhost:${PORT_NUMBER}`,
                logger: false
            });

            client.verify((err, success) => {
                expect(err).to.not.exist;
                expect(success).to.be.true;
                done();
            });
        });

        it("Should not verify connection", (done) => {
            const client = smtpTransport({
                url: `smtp:testuser:testpass@localhost:999${PORT_NUMBER}`,
                logger: false
            });

            client.verify((err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("Should login and send mail using proxied socket", (done) => {
            const client = smtpTransport({
                url: "smtp:testuser:testpass@www.example.com:1234",
                logger: false,
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
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                done();
            });
        });
    });
});
