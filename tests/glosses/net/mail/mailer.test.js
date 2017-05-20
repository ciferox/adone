const mailer = adone.net.mail.mailer;
const stubTransport = adone.net.mail.stubTransport;
const SMTPServer = require("smtp-server").SMTPServer;
const crypto = require("crypto");
const stream = require("stream");
const path = require("path");
const templateDir = path.join(__dirname, "fixtures", "welcome-email");
const net = require("net");

const PORT_NUMBER = 8397;

describe("mailer unit tests", () => {
    let nm, transport;

    beforeEach(() => {
        transport = {
            name: "testsend",
            version: "1",
            send(data, callback) {
                callback();
            },
            logger: false
        };
        nm = mailer.createTransport(transport);
    });

    it("should create mailer transport object", () => {
        expect(nm).to.exist;
    });

    describe("Hooking plugins", () => {
        it("should add a plugin to queue", () => {
            nm.use("compile", "abc");
            nm.use("compile", "def");

            expect(nm._plugins).to.deep.equal({
                compile: [
                    "abc",
                    "def"
                ],
                stream: []
            });
        });

        it("should process compile and stream plugins", (done) => {
            const compilePlugin = stub().yields(null);
            const streamPlugin = stub().yields(null);

            nm.use("compile", compilePlugin);
            nm.use("compile", streamPlugin);

            nm.sendMail({
                subject: "test"
            }, () => {
                expect(compilePlugin.callCount).to.equal(1);
                expect(compilePlugin.args[0][0].data.subject).to.equal("test");
                expect(compilePlugin.args[0][0].message).to.exist;

                expect(streamPlugin.callCount).to.equal(1);
                expect(streamPlugin.args[0][0].data.subject).to.equal("test");
                expect(streamPlugin.args[0][0].message).to.exist;
                done();
            });
        });
    });

    describe("#sendMail", () => {
        it("should process sendMail", (done) => {
            stub(transport, "send").yields(null, "tere tere");

            nm.sendMail({
                subject: "test"
            }, (err, info) => {
                expect(err).to.not.exist;
                expect(transport.send.callCount).to.equal(1);
                expect(info).to.equal("tere tere");
                transport.send.restore();
                done();
            });
        });

        it("should process sendMail as a Promise", (done) => {
            stub(transport, "send").yields(null, "tere tere");

            nm.sendMail({
                subject: "test"
            }).then((info) => {
                expect(transport.send.callCount).to.equal(1);
                expect(info).to.equal("tere tere");
                transport.send.restore();
                done();
            });
        });

        it("should return transport error", (done) => {
            stub(transport, "send").yields("tere tere");

            nm.sendMail({
                subject: "test"
            }, (err) => {
                expect(transport.send.callCount).to.equal(1);
                expect(err).to.equal("tere tere");
                transport.send.restore();
                done();
            });
        });

        it("should return transport error as Promise", (done) => {
            stub(transport, "send").yields("tere tere");

            nm.sendMail({
                subject: "test"
            }).catch((err) => {
                expect(transport.send.callCount).to.equal(1);
                expect(err).to.equal("tere tere");
                transport.send.restore();
                done();
            });
        });

        it("should override xMailer", (done) => {
            stub(transport, "send").callsFake((mail, callback) => {
                expect(mail.message.getHeader("x-mailer")).to.equal("yyyy");
                callback();
            });
            nm.sendMail({
                subject: "test",
                xMailer: "yyyy"
            }, () => {
                expect(transport.send.callCount).to.equal(1);
                transport.send.restore();
                done();
            });
        });

        it("should set priority headers", (done) => {
            stub(transport, "send").callsFake((mail, callback) => {
                expect(mail.message.getHeader("X-Priority")).to.equal("5 (Lowest)");
                expect(mail.message.getHeader("X-Msmail-Priority")).to.equal("Low");
                expect(mail.message.getHeader("Importance")).to.equal("Low");
                callback();
            });
            nm.sendMail({
                priority: "low"
            }, () => {
                expect(transport.send.callCount).to.equal(1);
                transport.send.restore();
                done();
            });
        });

        it("return invalid configuration error", (done) => {
            nm = mailer.createTransport("SMTP", {});
            nm.sendMail({
                subject: "test",
                xMailer: "yyyy"
            }, (err) => {
                expect(err).to.exist;
                done();
            });
        });
    });
});

describe("mailer integration tests", function () {
    this.timeout(10000); // eslint-disable-line no-invalid-this
    let server;

    beforeEach((done) => {
        server = new SMTPServer({
            authMethods: ["PLAIN", "XOAUTH2"],
            disabledCommands: ["STARTTLS"],

            onData(stream, session, callback) {
                const hash = crypto.createHash("md5");
                stream.on("data", (chunk) => {
                    hash.update(chunk);
                });
                stream.on("end", () => {
                    callback(null, hash.digest("hex"));
                });
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

    describe("smtp-transport tests", () => {

        it("Should verify connection with success", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            nm.verify().then((success) => {
                expect(success).to.be.true;
                done();
            }).catch((err) => {
                expect(err).to.not.exist;
                done();
            });
        });

        it("Should not verify connection", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                requireTLS: true,
                logger: false
            });

            nm.verify((err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("should log in and send mail", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "to1@valid.recipient",
                    "to2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([
                    "to@invalid.recipient"
                ]);
                expect(info.messageId).to.equal("abc@def");
                expect(/d1ed1d46968a6ccdb4f1726fee6d4fb6/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should log in and send mail using connection url", (done) => {
            const nm = mailer.createTransport(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?logger=false&debug=true`);

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "to1@valid.recipient",
                    "to2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([
                    "to@invalid.recipient"
                ]);
                expect(info.messageId).to.equal("abc@def");
                expect(/d1ed1d46968a6ccdb4f1726fee6d4fb6/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should return stream error, not send", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: new stream.PassThrough()
            };

            nm.sendMail(mailData, (err) => {
                expect(err).to.exist;
                done();
            });

            mailData.text.write("teretere");
            setTimeout(() => {
                mailData.text.emit("error", new Error("Stream error"));
            }, 400);
        });

        it("should response auth error", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "invalid user",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.exist;
                expect(info).to.not.exist;
                expect(err.code).to.equal("EAUTH");
                done();
            });
        });

        it("should response envelope error", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                to: ["to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.exist;
                expect(info).to.not.exist;
                expect(err.code).to.equal("EENVELOPE");
                done();
            });
        });

        it("should override envelope", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu",
                envelope: {
                    from: "aaa@valid.sender",
                    to: "vvv@valid.recipient",
                    cc: "vvv2@valid.recipient"
                }
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "vvv@valid.recipient",
                    "vvv2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([]);
                expect(info.messageId).to.equal("abc@def");
                expect(/4f16894de78867c6177b6379a78724ac/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should send to internationalized address", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false,
                debug: false
            });

            const mailData = {
                from: "from@valid.sender",
                to: ["internätiõnäližed@valid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal(["internätiõnäližed@valid.recipient"]);
                expect(info.rejected).to.deep.equal([]);
                expect(info.messageId).to.equal("abc@def");
                done();
            });
        });

        it("should log in send mail with attachment", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu",
                baseBoundary: "test",
                attachments: [{
                    path: adone.std.path.join(__dirname, "fixtures/attachment.bin")
                }]
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "to1@valid.recipient",
                    "to2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([
                    "to@invalid.recipient"
                ]);
                expect(info.messageId).to.equal("abc@def");
                expect(/1908f76a72db88adff9a6c926c61a416/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should return an error for disabled file access", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false,
                disableFileAccess: true
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu",
                attachments: [{
                    path: `${__dirname}/fixtures/attachment.bin`
                }]
            };

            nm.sendMail(mailData, (err, info) => {
                expect(err).to.exist;
                expect(info).to.not.exist;
                done();
            });
        });

    });

    describe("smtp-pool tests", () => {

        it("Should verify connection with success", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                pool: true,
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false
            });

            nm.verify((err, success) => {
                expect(err).to.not.exist;
                expect(success).to.be.true;
                nm.close();
                done();
            });
        });

        it("Should not verify connection", (done) => {
            const nm = mailer.createTransport({
                host: "localhost",
                pool: true,
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                requireTLS: true,
                logger: false
            });

            nm.verify((err) => {
                expect(err).to.exist;
                nm.close();
                done();
            });
        });

        it("should log in and send mail", (done) => {
            const nm = mailer.createTransport({
                pool: true,
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false,
                debug: true
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                nm.close();
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "to1@valid.recipient",
                    "to2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([
                    "to@invalid.recipient"
                ]);
                expect(info.messageId).to.equal("abc@def");
                expect(/d1ed1d46968a6ccdb4f1726fee6d4fb6/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should log in and send mail using connection url", (done) => {
            const nm = mailer.createTransport(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?pool=true&logger=false&debug=true`);

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                nm.close();
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal([
                    "to1@valid.recipient",
                    "to2@valid.recipient"
                ]);
                expect(info.rejected).to.deep.equal([
                    "to@invalid.recipient"
                ]);
                expect(info.messageId).to.equal("abc@def");
                expect(/d1ed1d46968a6ccdb4f1726fee6d4fb6/i.test(info.response)).to.be.true;
                done();
            });
        });

        it("should return stream error, not send", (done) => {
            const nm = mailer.createTransport({
                pool: true,
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                maxConnections: 1,
                logger: false,
                debug: true
            });

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: new stream.PassThrough()
            };

            nm.sendMail(mailData, (err) => {
                nm.close();
                expect(err).to.exist;
                done();
            });

            mailData.text.write("teretere");
            setTimeout(() => {
                mailData.text.emit("error", new Error("Stream error"));
            }, 400);
        });

        it("should return proxy error, not send", (done) => {
            const nm = mailer.createTransport({
                pool: true,
                host: "example.com",
                port: 25,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                maxConnections: 1,
                logger: false,
                debug: true
            });

            nm.getSocket = function (options, callback) {
                return callback(new Error("PROXY ERROR"));
            };

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err) => {
                nm.close();
                expect(err).to.exist;
                done();
            });
        });

        it("should send using proxy call", (done) => {
            const nm = mailer.createTransport({
                pool: true,
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                maxConnections: 1,
                logger: false,
                debug: true
            });

            let socketCreated = false;

            nm.getSocket = function (options, callback) {
                var socket = net.connect(PORT_NUMBER, "localhost", () => {
                    socketCreated = true;
                    return callback(null, {
                        connection: socket
                    });
                });
            };

            const mailData = {
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            };

            nm.sendMail(mailData, (err, info) => {
                nm.close();
                expect(socketCreated).to.be.true;
                expect(err).to.not.exist;
                expect(info.accepted).to.deep.equal(["to1@valid.recipient", "to2@valid.recipient"]);
                done();
            });
        });

        it("should send mail on idle", (done) => {
            const nm = mailer.createTransport({
                pool: true,
                host: "localhost",
                port: PORT_NUMBER,
                auth: {
                    user: "testuser",
                    pass: "testpass"
                },
                ignoreTLS: true,
                logger: false,
                debug: true
            });

            const mailData = [{
                from: "from@valid.sender",
                sender: "sender@valid.sender",
                to: ["to1@valid.recipient", "to2@valid.recipient", "to@invalid.recipient"],
                subject: "test",
                date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
                messageId: "abc@def",
                xMailer: "aaa",
                text: "uuu"
            }];

            nm.on("idle", () => {
                if (nm.isIdle() && mailData.length) {
                    nm.sendMail(mailData.pop(), (err, info) => {
                        nm.close();
                        expect(err).to.not.exist;
                        expect(info.accepted).to.deep.equal([
                            "to1@valid.recipient",
                            "to2@valid.recipient"
                        ]);
                        expect(info.rejected).to.deep.equal([
                            "to@invalid.recipient"
                        ]);
                        expect(info.messageId).to.equal("abc@def");
                        expect(/d1ed1d46968a6ccdb4f1726fee6d4fb6/i.test(info.response)).to.be.true;
                        done();
                    });
                }
            });
        });
    });
});

describe("direct-transport tests", function () {

    this.timeout(10000); // eslint-disable-line no-invalid-this
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

    it("should send mail", (done) => {
        const nm = mailer.createTransport({
            direct: true,
            port: PORT_NUMBER,
            logger: false,
            debug: true
        });

        const mailData = {
            from: "from@valid.sender",
            to: ["test@[127.0.0.1]"],
            subject: "test",
            date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
            messageId: "abc@def",
            xMailer: "aaa",
            text: "uuu"
        };

        nm.sendMail(mailData, (err, info) => {
            nm.close();
            expect(err).to.not.exist;
            expect(info.accepted).to.deep.equal([
                "test@[127.0.0.1]"
            ]);
            expect(info.rejected).to.deep.equal([]);
            expect(info.messageId).to.equal("abc@def");
            done();
        });
    });

    it("should send mail using connection url", (done) => {
        const nm = mailer.createTransport(`direct:?port=${PORT_NUMBER}&logger=false&debug=true`);

        const mailData = {
            from: "from@valid.sender",
            to: ["test@[127.0.0.1]"],
            subject: "test",
            date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
            messageId: "abc@def",
            xMailer: "aaa",
            text: "uuu"
        };

        nm.sendMail(mailData, (err, info) => {
            nm.close();
            expect(err).to.not.exist;
            expect(info.accepted).to.deep.equal([
                "test@[127.0.0.1]"
            ]);
            expect(info.rejected).to.deep.equal([]);
            expect(info.messageId).to.equal("abc@def");
            done();
        });
    });

    it("should return stream error, not send", (done) => {
        const nm = mailer.createTransport({
            direct: true,
            port: PORT_NUMBER,
            logger: false,
            debug: true
        });

        const mailData = {
            from: "from@valid.sender",
            sender: "sender@valid.sender",
            to: ["test@[127.0.0.1]"],
            subject: "test",
            date: new Date("Mon, 31 Jan 2011 23:01:00 +0000"),
            messageId: "abc@def",
            xMailer: "aaa",
            text: new stream.PassThrough()
        };

        nm.sendMail(mailData, (err) => {
            nm.close();
            expect(err).to.exist;
            done();
        });

        mailData.text.write("teretere");
        setTimeout(() => {
            mailData.text.emit("error", new Error("Stream error"));
        }, 400);
    });
});

describe("Generated messages tests", () => {
    it("should set Message-Id automatically", (done) => {
        const nm = mailer.createTransport({
            transport: "stub"
        });
        const mailData = {
            from: "Sender Name 👻 <sender@example.com>",
            to: ["Recipient Name 1 👻 <recipient1@example.com>", "Recipient Name 2 👻 <recipient2@example.com>"],
            subject: "test 💀",
            text: "test message 👽"
        };
        nm.sendMail(mailData, (err, info) => {
            expect(err).to.not.exist;
            expect(info.envelope).to.deep.equal({
                from: "sender@example.com",
                to: ["recipient1@example.com", "recipient2@example.com"]
            });
            expect(info.messageId).to.exist;
            expect(info.response.toString()).to.exist;
            done();
        });
    });

    it("should set List-* headers", (done) => {
        const nm = mailer.createTransport(stubTransport());
        const mailData = {
            list: {
                help: [
                    // keep indent
                    {
                        url: "list@host.com?subject=help",
                        comment: "List Instructions"
                    }, "list-manager@host.com?body=info", {
                        url: "list-info@host.com>",
                        comment: "Info about the list"
                    },
                    [
                        "http://www.host.com/list/", "list-info@host.com"
                    ],
                    [
                        // keep indent
                        {
                            url: "ftp://ftp.host.com/list.txt",
                            comment: "FTP"
                        },
                        "list@host.com?subject=help"
                    ]
                ],
                unsubscribe: [
                    "list@host.com?subject=unsubscribe", {
                        url: "list-manager@host.com?body=unsubscribe%20list",
                        commend: "Use this command to get off the list"
                    },
                    "list-off@host.com", [
                        "http://www.host.com/list.cgi?cmd=unsub&lst=list",
                        "list-request@host.com?subject=unsubscribe"
                    ]
                ],
                post: [
                    [
                        "admin@exmaple.com?subject=post",
                        "admin@exmaple2.com?subject=post"
                    ]
                ]
            }
        };
        nm.sendMail(mailData, (err, info) => {
            expect(err).to.not.exist;
            expect(info.response.toString().match(/^List\-/gim).length).to.equal(10);
            done();
        });
    });

    it("should send mail using a template", (done) => {
        const nm = mailer.createTransport(stubTransport());

        const sendPwdReminder = nm.templateSender({
            subject: "Password reminder for {{username}}!",
            text: "Hello, {{username}}, Your password is: {{ password }}",
            html: "<b>Hello, <strong>{{username}}</strong>, Your password is:\n<b>{{ password }}</b></p>"
        }, {
            from: "sender@example.com",
            headers: {
                "X-Key1": "value1"
            }
        });

        sendPwdReminder(
            // keep indent
            {
                to: "receiver@example.com",
                headers: {
                    "X-Key2": "value2"
                }
            }, {
                username: "Node Mailer",
                password: "!\"'<>&some-thing"
            }
        ).then((info) => {
            const msg = info.response.toString();

            expect(msg.indexOf("\r\nFrom: sender@example.com\r\n")).to.be.gte(0);
            expect(msg.indexOf("\r\nTo: receiver@example.com\r\n")).to.be.gte(0);

            expect(msg.indexOf("\r\nX-Key1: value1\r\n")).to.be.gte(0);
            expect(msg.indexOf("\r\nX-Key2: value2\r\n")).to.be.gte(0);

            expect(msg.indexOf("\r\nSubject: Password reminder for Node Mailer!\r\n")).to.be.gte(0);
            expect(msg.indexOf("\r\nHello, Node Mailer, Your password is: !\"'<>&some-thing\r\n")).to.be.gte(0);
            expect(msg.indexOf("\n<b>!&quot;&#039;&lt;&gt;&amp;some-thing</b></p>\r\n")).to.be.gte(0);

            done();
        }).catch((err) => {
            expect(err).to.not.exist;
        });
    });

    it("should send mail using external renderer", (done) => {
        const nm = mailer.createTransport(stubTransport());

        class Renderer {
            render({ name: { first, last } }, callback) {
                callback(null, {
                    html: `Hello from external renderer to ${first} ${last}!`
                });
            }
        }

        const sendWelcome = nm.templateSender(new Renderer(), {
            from: "sender@example.com"
        });

        sendWelcome(
            // keep indent
            {
                to: "receiver@example.com"
            }, {
                name: {
                    first: "Node",
                    last: "Mailer"
                }
            }
        ).then((info) => {
            const msg = info.response.toString();

            expect(msg).to.include("Hello from external renderer to Node Mailer!");

            done();
        }).catch((err) => {
            expect(err).to.not.exist;
        });
    });

    it("should use pregenerated message", (done) => {
        const nm = mailer.createTransport(stubTransport());
        const raw = "Content-Type: text/plain\r\n" +
            "Subject: test message\r\n" +
            "\r\n" +
            "Hello world!";
        const mailData = {
            raw
        };
        nm.sendMail(mailData, (err, info) => {
            expect(err).to.not.exist;
            expect(info.response.toString()).to.equal(raw);
            done();
        });
    });
});
