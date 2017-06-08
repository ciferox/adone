import { SMTPServer } from "smtp-server";
import xoauth2Server from "./../xoauth2_mock_server";

const PORT_NUMBER = 8397;
const PROXY_PORT_NUMBER = 9999;
const LMTP_PORT_NUMBER = 8396;
const XOAUTH_PORT = 8497;

const { net: { mail: { __: { SMTPConnection, XOAuth2 } } }, std: { fs, net, path } } = adone;

describe("net", "mail", "SMTP-Connection Tests", () => {

    const NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    before(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    });

    after(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED;
    });

    describe("Version test", () => {
        it.skip("Should expose version number", () => {
            const client = new SMTPConnection();
            expect(client.version).to.equal(packageData.version);
        });
    });

    describe("Connection tests", () => {
        let server, insecureServer, invalidServer, secureServer, httpProxy;

        beforeEach((done) => {
            server = new SMTPServer({
                onAuth(auth, session, callback) {
                    if (auth.username !== "testuser" || auth.password !== "testpass") {
                        return callback(new Error("Invalid username or password"));
                    }
                    callback(null, {
                        user: 123
                    });
                },
                onData(stream, session, callback) {
                    stream.on("data", () => {});
                    stream.on("end", callback);
                },
                logger: false
            });

            insecureServer = new SMTPServer({
                disabledCommands: ["STARTTLS", "AUTH"],
                onData(stream, session, callback) {
                    let err = false;
                    stream.on("data", (chunk) => {
                        if (err || session.use8BitMime) {
                            return;
                        }
                        for (let i = 0, len = chunk.length; i < len; i++) {
                            if (chunk[i] >= 0x80) {
                                err = new Error("8 bit content not allowed");
                            }
                        }
                    });
                    stream.on("end", () => {
                        callback(err, false);
                    });
                },
                logger: false
            });

            invalidServer = net.createServer(() => {});

            secureServer = new SMTPServer({
                secure: true,
                onAuth(auth, session, callback) {
                    if (auth.username !== "testuser" || auth.password !== "testpass") {
                        return callback(new Error("Invalid username or password"));
                    }
                    callback(null, {
                        user: 123
                    });
                },
                onData(stream, session, callback) {
                    stream.on("data", () => {});
                    stream.on("end", callback);
                },
                logger: false
            });

            httpProxy = new adone.net.proxy.http.Server();

            httpProxy.use(async (ctx) => {
                await ctx.connect();
            });

            server.listen(PORT_NUMBER, () => {
                invalidServer.listen(PORT_NUMBER + 1, () => {
                    secureServer.listen(PORT_NUMBER + 2, () => {
                        insecureServer.listen(PORT_NUMBER + 3, () => {
                            httpProxy.listen(PROXY_PORT_NUMBER).then(done);
                        });
                    });
                });
            });
        });

        afterEach((done) => {
            server.close(() => {
                invalidServer.close(() => {
                    secureServer.close(() => {
                        insecureServer.close(() => {
                            httpProxy.close().then(done);
                        });
                    });
                });
            });
        });

        it("should connect to unsecure server", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 3,
                ignoreTLS: true,
                logger: false
            });

            client.connect(() => {
                expect(client.secure).to.be.false;
                client.close();
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should connect to a server and upgrade with STARTTLS", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER,
                logger: false
            });

            client.connect(() => {
                expect(client.secure).to.be.true;
                client.close();
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should connect to a server and upgrade with forced STARTTLS", (done) => {

            const client = new SMTPConnection({
                port: PORT_NUMBER,
                requireTLS: true,
                transactionLog: true,
                logger: false
            });

            client.connect(() => {
                expect(client.secure).to.be.true;
                client.close();
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should connect to a server and try to upgrade STARTTLS", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 3,
                logger: false,
                requireTLS: true,
                opportunisticTLS: true
            });

            client.connect(() => {
                expect(client.secure).to.be.false;
                client.close();
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should try upgrade with STARTTLS where not advertised", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 3,
                requireTLS: true,
                logger: false
            });

            client.connect(() => {
                // should not run
                expect(false).to.be.true;
                client.close();
            });

            client.once("error", (err) => {
                expect(err).to.exist;
            });

            client.on("end", done);
        });

        it("should receive end after STARTTLS", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER,
                logger: false
            });

            client.connect(() => {
                expect(client.secure).to.be.true;
                server.connections.forEach((conn) => {
                    conn.close();
                });
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should connect to a secure server", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 2,
                secure: true,
                logger: false
            });

            client.connect(() => {
                expect(client.secure).to.be.true;
                client.close();
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.on("end", done);
        });

        it("should emit error for invalid port", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 10,
                logger: false
            });

            client.connect(() => {
                // should not run
                expect(false).to.be.true;
                client.close();
            });

            client.once("error", (err) => {
                expect(err).to.exist;
            });

            client.on("end", done);
        });

        it("should emit error for too large port", (done) => {
            const client = new SMTPConnection({
                port: 999999999,
                logger: false
            });

            client.connect(() => {
                // should not run
                expect(false).to.be.true;
                client.close();
            });

            client.once("error", (err) => {
                expect(err).to.exist;
            });

            client.on("end", done);
        });

        it("should emit inactivity timeout error", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER,
                socketTimeout: 100,
                logger: false
            });

            client.connect(() => {
                // do nothing
            });

            client.once("error", (err) => {
                expect(err).to.exist;
                expect(err.code).to.equal("ETIMEDOUT");
            });

            client.on("end", done);
        });

        it("should connect through proxy", (done) => {
            const runTest = function (socket) {
                const client = new SMTPConnection({
                    logger: false,
                    port: PORT_NUMBER,
                    connection: socket
                });

                client.connect(() => {
                    expect(client.secure).to.be.true;
                    client.login({
                        user: "testuser",
                        credentials: {
                            user: "testuser",
                            pass: "testpass"
                        }
                    }, (err) => {
                        expect(err).to.not.exist;
                        expect(client.authenticated).to.be.true;
                        client.close();
                    });
                });

                client.on("error", (err) => {
                    expect(err).to.not.exist;
                });

                client.on("end", done);
            };

            proxyConnect(PROXY_PORT_NUMBER, "127.0.0.1", PORT_NUMBER, "127.0.0.1", (err, socket) => {
                expect(err).to.not.exist;
                runTest(socket);
            });
        });

        it("should connect through proxy to secure server", (done) => {
            const runTest = function (socket) {
                const client = new SMTPConnection({
                    logger: false,
                    port: PORT_NUMBER + 2,
                    secure: true,
                    connection: socket
                });

                client.connect(() => {
                    expect(client.secure).to.be.true;
                    client.login({
                        user: "testuser",
                        credentials: {
                            user: "testuser",
                            pass: "testpass"
                        }
                    }, (err) => {
                        expect(err).to.not.exist;
                        expect(client.authenticated).to.be.true;
                        client.close();
                    });
                });

                client.on("error", (err) => {
                    expect(err).to.not.exist;
                });

                client.on("end", done);
            };

            proxyConnect(PROXY_PORT_NUMBER, "127.0.0.1", PORT_NUMBER + 2, "127.0.0.1", (err, socket) => {
                expect(err).to.not.exist;
                runTest(socket);
            });
        });

        it("should send to unsecure server", (done) => {
            const client = new SMTPConnection({
                port: PORT_NUMBER + 3,
                ignoreTLS: true,
                logger: false
            });

            client.on("error", (err) => {
                expect(err).to.not.exist;
            });

            client.connect(() => {
                expect(client.secure).to.be.false;

                let chunks = [],
                    fname = path.join(__dirname, "some_data"),
                    message = fs.readFileSync(fname, "utf-8");

                server.on("data", (connection, chunk) => {
                    chunks.push(chunk);
                });

                server.removeAllListeners("dataReady");
                server.on("dataReady", (connection, callback) => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.toString().trim().replace(/\n/g, "\r\n"));
                    callback(null, "ABC1");
                });

                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, fs.createReadStream(fname), (err) => {
                    expect(err).to.not.exist;
                    client.close();
                });

            });

            client.on("end", done);
        });
    });

    describe("Login tests", function () {
        this.timeout(10 * 1000);

        let server, lmtpServer, client, lmtpClient, testtoken = "testtoken";

        beforeEach((done) => {
            server = new SMTPServer({
                authMethods: ["PLAIN", "XOAUTH2"],
                disabledCommands: ["STARTTLS"],

                size: 100 * 1024,

                onData(stream, session, callback) {
                    let err = false;
                    stream.on("data", (chunk) => {
                        if (err || session.use8BitMime) {
                            return;
                        }
                        for (let i = 0, len = chunk.length; i < len; i++) {
                            if (chunk[i] >= 0x80) {
                                err = new Error("8 bit content not allowed");
                            }
                        }
                    });
                    stream.on("end", () => {
                        callback(err, false);
                    });
                },

                onAuth(auth, session, callback) {
                    if (auth.method !== "XOAUTH2") {
                        if (auth.username !== "testuser" || auth.password !== "testpass") {
                            return callback(new Error("Invalid username or password"));
                        }
                    } else if (auth.username !== "testuser" || auth.accessToken !== testtoken) {
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
                    if (address.args && parseInt(address.args.SIZE, 10) > 50 * 1024) {
                        return callback(new Error(`452 Insufficient channel storage: ${address.address}`));
                    }

                    if (!/@valid.sender/.test(address.address)) {
                        return callback(new Error("Only user@valid.sender is allowed to send mail"));
                    }

                    if (address.args.SMTPUTF8) {
                        session.smtpUtf8 = true;
                    }

                    if (address.args.BODY === "8BITMIME") {
                        session.use8BitMime = true;
                    }

                    if (/[\x80-\uFFFF]/.test(address.address) && !session.smtpUtf8) {
                        return callback(new Error("Trying to use Unicode address without declaring SMTPUTF8 first"));
                    }

                    return callback(); // Accept the address
                },
                onRcptTo(address, session, callback) {
                    if (!/@valid.recipient/.test(address.address)) {
                        return callback(new Error("Only user@valid.recipient is allowed to receive mail"));
                    }
                    if (/[\x80-\uFFFF]/.test(address.address) && !session.smtpUtf8) {
                        return callback(new Error("Trying to use Unicode address without declaring SMTPUTF8 first"));
                    }
                    return callback(); // Accept the address
                },
                logger: false
            });

            lmtpServer = new SMTPServer({
                lmtp: true,
                disabledCommands: ["STARTTLS", "AUTH"],

                onData(stream, session, callback) {
                    stream.on("data", () => {});
                    stream.on("end", () => {
                        const response = session.envelope.rcptTo.map((rcpt, i) => {
                            if (i % 2) {
                                return `<${rcpt.address}> Accepted`;
                            }
                            return new Error(`<${rcpt.address}> Not accepted`);

                        });
                        callback(null, response);
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

            client = new SMTPConnection({
                port: PORT_NUMBER,
                logger: false,
                debug: false
            });

            lmtpClient = new SMTPConnection({
                port: LMTP_PORT_NUMBER,
                lmtp: true,
                logger: false,
                debug: false
            });

            server.listen(PORT_NUMBER, () => {
                lmtpServer.listen(LMTP_PORT_NUMBER, () => {
                    client.connect(() => {
                        lmtpClient.connect(done);
                    });
                });
            });
        });

        afterEach((done) => {
            client.close();
            lmtpClient.close();
            server.close(() => {
                lmtpServer.close(done);
            });
        });

        it("should login", (done) => {
            expect(client.authenticated).to.be.false;
            client.login({
                user: "testuser",
                credentials: {
                    user: "testuser",
                    pass: "testpass"
                }
            }, (err) => {
                expect(err).to.not.exist;
                expect(client.authenticated).to.be.true;
                done();
            });
        });

        it("should return error for invalid login", (done) => {
            expect(client.authenticated).to.be.false;
            client.login({
                user: "testuser",
                credentials: {
                    user: "testuser",
                    pass: "invalid"
                }
            }, (err) => {
                expect(err).to.exist;
                expect(client.authenticated).to.be.false;
                expect(err.code).to.equal("EAUTH");
                expect(err.responseCode).to.equal(535);
                done();
            });
        });

        describe("xoauth2 login", function () {
            this.timeout(10 * 1000);
            let x2server;

            beforeEach((done) => {
                x2server = xoauth2Server({
                    port: XOAUTH_PORT,
                    onUpdate: (username, accessToken) => {
                        testtoken = accessToken;
                    }
                });

                x2server.addUser("testuser", "refresh-token");

                x2server.start(done);
            });

            afterEach((done) => {
                x2server.stop(done);
            });

            it("should login with xoauth2 string", (done) => {
                expect(client.authenticated).to.be.false;
                client.login({
                    type: "oauth2",
                    user: "testuser",
                    oauth2: new XOAuth2({
                        user: "testuser",
                        accessToken: testtoken
                    })
                }, (err) => {
                    expect(err).to.not.exist;
                    expect(client.authenticated).to.be.true;
                    done();
                });
            });

            it("should return error for invalid xoauth2 string token", (done) => {
                expect(client.authenticated).to.be.false;
                client.login({
                    type: "oauth2",
                    user: "testuser",
                    oauth2: new XOAuth2({
                        user: "testuser",
                        accessToken: "invalid"
                    })
                }, (err) => {
                    expect(err).to.exist;
                    expect(client.authenticated).to.be.false;
                    expect(err.code).to.equal("EAUTH");
                    done();
                });
            });

            it("should login with xoauth2 object", (done) => {
                expect(client.authenticated).to.be.false;
                client.login({
                    type: "oauth2",
                    user: "testuser",
                    oauth2: new XOAuth2({
                        user: "testuser",
                        clientId: "{Client ID}",
                        clientSecret: "{Client Secret}",
                        refreshToken: "refresh-token",
                        accessToken: "uuuuu",
                        accessUrl: `http://localhost:${XOAUTH_PORT}`
                    })
                }, (err) => {
                    expect(err).to.not.exist;
                    expect(client.authenticated).to.be.true;
                    done();
                });
            });

            it("should fail with xoauth2 object", (done) => {
                expect(client.authenticated).to.be.false;
                client.login({
                    type: "oauth2",
                    user: "testuser",
                    oauth2: new XOAuth2({
                        user: "testuser",
                        clientId: "{Client ID}",
                        clientSecret: "{Client Secret}",
                        refreshToken: "refrsesh-token",
                        accessToken: "uuuuu",
                        accessUrl: `http://localhost:${XOAUTH_PORT}`
                    })
                }, (err) => {
                    expect(err).to.exist;
                    expect(client.authenticated).to.be.false;
                    done();
                });
            });

            it("should fail with invalid xoauth2 response", (done) => {
                expect(client.authenticated).to.be.false;

                const oauth2 = new XOAuth2({
                    user: "testuser",
                    clientId: "{Client ID}",
                    clientSecret: "{Client Secret}",
                    refreshToken: "refrsesh-token",
                    accessToken: "uuuuu",
                    accessUrl: `http://localhost:${XOAUTH_PORT}`
                });

                stub(oauth2, "generateToken").yields(null, "dXNlcj10ZXN0dXNlcgFhdXRoPUJlYXJlciB1dXV1dQEB");

                client.login({
                    type: "oauth2",
                    user: "testuser",
                    oauth2
                }, (err) => {
                    expect(err).to.exist;
                    expect(client.authenticated).to.be.false;

                    oauth2.generateToken.restore();
                    done();
                });
            });

        });

        describe("Send without PIPELINING", () => {
            beforeEach((done) => {
                client.on("end", () => {
                    client = new SMTPConnection({
                        port: PORT_NUMBER,
                        logger: false,
                        debug: false
                    });
                    // disable PIPELINING
                    server.options.hidePIPELINING = true;
                    client.connect(() => {
                        client.login({
                            user: "testuser",
                            credentials: {
                                user: "testuser",
                                pass: "testpass"
                            }
                        }, (err) => {
                            expect(err).to.not.exist;
                            // enable PIPELINING
                            server.options.hidePIPELINING = false;
                            done();
                        });
                    });
                });
                client.close();
            });

            it("should send only to valid recipients without PIPELINING", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3@valid.recipient"]
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test1@valid.recipient", "test3@valid.recipient"],
                        rejected: ["test2@invalid.recipient"],
                        rejectedErrors: info.rejectedErrors,
                        response: "250 OK: message queued"
                    });
                    expect(info.rejectedErrors.length).to.equal(1);
                    done();
                });
            });
        });

        describe("Send messages", () => {
            beforeEach((done) => {
                client.login({
                    user: "testuser",
                    credentials: {
                        user: "testuser",
                        pass: "testpass"
                    }
                }, (err) => {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it("should send message", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test@valid.recipient"],
                        rejected: [],
                        response: "250 OK: message queued"
                    });
                    done();
                });
            });

            it("should send multiple messages", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test@valid.recipient"],
                        rejected: [],
                        response: "250 OK: message queued"
                    });
                    client.reset((err) => {
                        expect(err).to.not.exist;

                        client.send({
                            from: "test2@valid.sender",
                            to: "test2@valid.recipient"
                        }, "test2", (err, info) => {
                            expect(err).to.not.exist;
                            expect(info).to.deep.equal({
                                accepted: ["test2@valid.recipient"],
                                rejected: [],
                                response: "250 OK: message queued"
                            });
                            done();
                        });
                    });
                });
            });

            it("should send only to valid recipients", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3@valid.recipient"]
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test1@valid.recipient", "test3@valid.recipient"],
                        rejected: ["test2@invalid.recipient"],
                        rejectedErrors: info.rejectedErrors,
                        response: "250 OK: message queued"
                    });
                    expect(info.rejectedErrors.length).to.equal(1);
                    done();
                });
            });

            it("should reject all recipients", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test1@invalid.recipient", "test2@invalid.recipient", "test3@invalid.recipient"]
                }, "test", (err, info) => {
                    expect(err).to.exist;
                    expect(info).to.not.exist;
                    expect(err.rejected).to.deep.equal(["test1@invalid.recipient", "test2@invalid.recipient", "test3@invalid.recipient"]);
                    expect(err.rejectedErrors.length).to.equal(3);
                    done();
                });
            });

            it("should reject too large SIZE arguments", (done) => {
                client.send({
                    from: "test2@valid.sender",
                    to: "test2@valid.recipient",
                    size: 1024 * 1024
                }, "test", (err, info) => {
                    expect(err).to.exist;
                    expect(info).to.not.exist;
                    done();
                });
            });

            it("should reject too large message", (done) => {
                client.send({
                    from: "test2@valid.sender",
                    to: "test2@valid.recipient",
                    size: 70 * 1024
                }, "test", (err, info) => {
                    expect(err).to.exist;
                    expect(info).to.not.exist;
                    done();
                });
            });

            it("should declare SIZE", (done) => {
                client.send({
                    from: "test2@valid.sender",
                    to: "test2@valid.recipient",
                    size: 10 * 1024
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test2@valid.recipient"],
                        rejected: [],
                        response: "250 OK: message queued"
                    });
                    done();
                });
            });

            it("lmtp should send only to valid recipients", (done) => {
                lmtpClient.send({
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3@valid.recipient", "test4@valid.recipient", "test5@valid.recipient", "test6@valid.recipient"]
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info.accepted).to.deep.equal([
                        "test3@valid.recipient",
                        "test5@valid.recipient"
                    ]);
                    expect(info.rejected).to.deep.equal([
                        "test2@invalid.recipient",
                        "test1@valid.recipient",
                        "test4@valid.recipient",
                        "test6@valid.recipient"
                    ]);
                    expect(info.rejectedErrors.length).to.equal(info.rejected.length);
                    done();
                });
            });

            it("should send using SMTPUTF8", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3õ@valid.recipient"]
                }, "test", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test1@valid.recipient", "test3õ@valid.recipient"],
                        rejected: ["test2@invalid.recipient"],
                        rejectedErrors: info.rejectedErrors,
                        response: "250 OK: message queued"
                    });
                    done();
                });
            });

            it("should send using 8BITMIME", (done) => {
                client.send({
                    use8BitMime: true,
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3õ@valid.recipient"]
                }, "õõõõ", (err, info) => {
                    expect(err).to.not.exist;
                    expect(info).to.deep.equal({
                        accepted: ["test1@valid.recipient", "test3õ@valid.recipient"],
                        rejected: ["test2@invalid.recipient"],
                        rejectedErrors: info.rejectedErrors,
                        response: "250 OK: message queued"
                    });
                    done();
                });
            });

            it("should receive error for 8-bit content without 8BITMIME declaration", (done) => {
                client.send({
                    use8BitMime: false,
                    from: "test@valid.sender",
                    to: ["test1@valid.recipient", "test2@invalid.recipient", "test3õ@valid.recipient"]
                }, "õõõõ", (err) => {
                    expect(/8 bit content not allowed/.test(err.message)).to.be.true;
                    done();
                });
            });

            it("should return error for invalidly formatted recipients", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test@valid.recipient", '"address\r\n with folding"@valid.recipient']
                }, "test", (err) => {
                    expect(/^Invalid recipient/.test(err.message)).to.be.true;
                    done();
                });
            });

            it("should return error for no valid recipients", (done) => {
                client.send({
                    from: "test@valid.sender",
                    to: ["test1@invalid.recipient", "test2@invalid.recipient", "test3@invalid.recipient"]
                }, "test", (err) => {
                    expect(err).to.exist;
                    done();
                });
            });

            it("should return error for invalid sender", (done) => {
                client.send({
                    from: "test@invalid.sender",
                    to: "test@valid.recipient"
                }, "test", (err) => {
                    expect(err).to.exist;
                    done();
                });
            });

            it("should send message string", (done) => {
                let chunks = [],
                    message = new Array(1024).join("teretere, vana kere\n");

                server.on("data", (connection, chunk) => {
                    chunks.push(chunk);
                });

                server.removeAllListeners("dataReady");
                server.on("dataReady", (connection, callback) => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.trim().replace(/\n/g, "\r\n"));
                    callback(null, "ABC1");
                });

                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message, (err) => {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it("should send message buffer", (done) => {
                let chunks = [],
                    message = new Buffer(new Array(1024).join("teretere, vana kere\n"));

                server.on("data", (connection, chunk) => {
                    chunks.push(chunk);
                });

                server.removeAllListeners("dataReady");
                server.on("dataReady", (connection, callback) => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.toString().trim().replace(/\n/g, "\r\n"));
                    callback(null, "ABC1");
                });

                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message, (err) => {
                    expect(err).to.not.exist;
                    done();
                });
            });

            it("should send message stream", (done) => {
                let chunks = [],
                    fname = path.join(__dirname, "some_data"),
                    message = fs.readFileSync(fname, "utf-8");

                server.on("data", (connection, chunk) => {
                    chunks.push(chunk);
                });

                server.removeAllListeners("dataReady");
                server.on("dataReady", (connection, callback) => {
                    const body = Buffer.concat(chunks);
                    expect(body.toString()).to.equal(message.toString().trim().replace(/\n/g, "\r\n"));
                    callback(null, "ABC1");
                });

                client.send({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, fs.createReadStream(fname), (err) => {
                    expect(err).to.not.exist;
                    done();
                });
            });
        });
    });
});

function proxyConnect(port, host, destinationPort, destinationHost, callback) {
    const socket = net.connect(port, host, () => {
        socket.write(`CONNECT ${destinationHost}:${destinationPort} HTTP/1.1\r\n\r\n`);

        let headers = "";
        const onSocketData = function (chunk) {
            let match;
            let remainder;

            headers += chunk.toString("binary");
            if ((match = headers.match(/\r\n\r\n/))) {
                socket.removeListener("data", onSocketData);
                remainder = headers.substr(match.index + match[0].length);
                headers = headers.substr(0, match.index);
                if (remainder) {
                    socket.unshift(new Buffer(remainder, "binary"));
                }
                // proxy connection is now established
                return callback(null, socket);
            }
        };
        socket.on("data", onSocketData);
    });

    socket.on("error", (err) => {
        expect(err).to.not.exist;
    });
}
