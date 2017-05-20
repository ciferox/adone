process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const net = require("net");
const smtpPool = adone.net.mail.smtpPool;
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

describe("SMTP Pool Tests", function () {
    this.timeout(100 * 1000);

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

                if (!/timeout/.test(address.address)) {
                    return callback(); // Accept the address
                }
            },
            logger: false
        });

        server.listen(PORT_NUMBER, done);
    });

    afterEach((done) => {
        server.close(done);
    });

    it("Should expose version number", () => {
        const pool = smtpPool();
        expect(pool.name).to.exist;
        expect(pool.version).to.exist;
    });

    it("Should detect wellknown data", () => {
        const pool = smtpPool({
            service: "google mail"
        });
        expect(pool.options.host).to.equal("smtp.gmail.com");
        expect(pool.options.port).to.equal(465);
        expect(pool.options.secure).to.be.true;
    });

    it("should send mail", (done) => {
        const pool = smtpPool({
            port: PORT_NUMBER,
            auth: {
                user: "testuser",
                pass: "testpass"
            },
            logger: false,
            debug: true
        });

        const message = new Array(1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        pool.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, message)
        }, (err) => {
            expect(err).to.not.exist;
            pool.close();
            done();
        });
    });

    it("should send multiple mails", (done) => {
        const pool = smtpPool(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?logger=false`);
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                callback();
            });
        }

        const total = 100;
        let returned = 0;
        const cb = function () {
            let sent = 0;

            if (++returned === total) {
                expect(pool._connections.length).to.be.above(1);
                pool._connections.forEach((conn) => {
                    expect(conn.messages).to.be.above(1);
                    sent += conn.messages;
                });

                expect(sent).to.be.equal(total);

                pool.close();
                return done();
            }
        };
        for (let i = 0; i < total; i++) {
            sendMessage(cb);
        }
    });

    it("should tolerate connection errors", (done) => {
        const pool = smtpPool({
            port: PORT_NUMBER,
            auth: {
                user: "testuser",
                pass: "testpass"
            },
            logger: false
        });
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        let c = 0;

        function sendMessage(callback) {
            const isErr = c++ % 2; // fail 50% of messages
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: isErr ? "test@invalid.sender" : "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                if (isErr) {
                    expect(err).to.exist;
                } else {
                    expect(err).to.not.exist;
                }

                callback();
            });
        }

        const total = 100;
        let returned = 0;
        const cb = function () {
            if (++returned === total) {
                pool.close();
                return done();
            }
        };
        for (let i = 0; i < total; i++) {
            sendMessage(cb);
        }
    });

    it("should tolerate idle connections and re-assign messages to other connections", (done) => {
        const pool = smtpPool({
            port: PORT_NUMBER,
            auth: {
                user: "testuser",
                pass: "testpass"
            },
            logger: false
        });

        const total = 20;
        const message = new Array(10 * 1024).join("teretere, vana kere\n");
        let sentMessages = 0;
        let killedConnections = false;

        server.onData = function (stream, session, callback) {
            let callCallback = true;

            stream.on("data", () => {
                // If we hit half the messages, simulate the server closing connections
                // that are open for long time
                if (!killedConnections && sentMessages === total / 2) {
                    killedConnections = true;
                    callCallback = false;
                    server.connections.forEach((connection) => {
                        connection._socket.end();
                    });
                }
            });

            stream.on("end", () => {
                if (callCallback) {
                    sentMessages += 1;
                    return callback();
                }
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                callback();
            });
        }

        // Send 10 messages in a row.. then wait a bit and send 10 more
        // When we wait a bit.. the server will kill the "idle" connections
        // so that we can ensure the pool will handle it properly
        let returned = 0;
        const cb = function () {
            returned++;

            if (returned === total) {
                pool.close();
                return done();
            } else if (returned === total / 2) {
                setTimeout(sendHalfBulk, 1500);
            }
        };

        function sendHalfBulk() {
            for (let i = 0; i < total / 2; i++) {
                sendMessage(cb);
            }
        }

        sendHalfBulk();
    });

    it("should call back with connection errors to senders having messages in flight", (done) => {
        const pool = smtpPool({
            maxConnections: 1,
            socketTimeout: 200,
            port: PORT_NUMBER,
            auth: {
                user: "testuser",
                pass: "testpass"
            },
            logger: false
        });
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        pool.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, message)
        }, (err) => {
            expect(err).not.to.exist;
        });

        pool.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test+timeout@valid.recipient"
            }, message)
        }, (err) => {
            expect(err).to.exist;
            pool.close();
            done();
        });
    });

    it("should not send more then allowed for one connection", (done) => {
        const pool = smtpPool(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?maxConnections=1&maxMessages=5&logger=false`);
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                callback();
            });
        }

        const total = 100;
        let returned = 0;
        const cb = function () {
            if (++returned === total) {
                expect(pool._connections.length).to.be.equal(1);
                expect(pool._connections[0].messages).to.be.below(6);
                pool.close();
                return done();
            }
        };
        for (let i = 0; i < total; i++) {
            sendMessage(cb);
        }
    });

    it("should send multiple mails with rate limit", (done) => {
        const pool = smtpPool({
            port: PORT_NUMBER,
            auth: {
                user: "testuser",
                pass: "testpass"
            },
            maxConnections: 10,
            rateLimit: 200, // 200 messages in sec, so sending 5000 messages should take at least 24 seconds and probably under 25 sec
            logger: false
        });
        const message = "teretere, vana kere\n";
        const startTime = Date.now();

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.not.exist;
                callback();
            });
        }

        const total = 5000;
        let returned = 0;
        const cb = function () {
            if (++returned === total) {
                const endTime = Date.now();
                expect(endTime - startTime).to.be.at.least(24000);

                pool.close();
                return done();
            }
        };

        let i = 0;
        var send = function () {
            if (i++ >= total) {
                return;
            }
            sendMessage(cb);
            setImmediate(send);
        };

        send();
    });

    it("should return pending messages once closed", (done) => {
        const pool = smtpPool(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?maxConnections=1&logger=false`);
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, (err) => {
                expect(err).to.exist;
                callback();
            });
        }

        const total = 100;
        let returned = 0;
        const cb = function () {
            if (++returned === total) {
                return done();
            }
        };
        for (let i = 0; i < total; i++) {
            sendMessage(cb);
        }
        pool.close();
    });

    it("should emit idle for free slots in the pool", (done) => {
        const pool = smtpPool(`smtp://testuser:testpass@localhost:${PORT_NUMBER}/?logger=false`);
        const message = new Array(10 * 1024).join("teretere, vana kere\n");

        server.onData = function (stream, session, callback) {
            const chunks = [];
            stream.on("data", (chunk) => {
                chunks.push(chunk);
            });
            stream.on("end", () => {
                const body = Buffer.concat(chunks);
                expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
                callback();
            });
        };

        function sendMessage(callback) {
            pool.send({
                data: {},
                message: new MockBuilder({
                    from: "test@valid.sender",
                    to: "test@valid.recipient"
                }, message)
            }, callback);
        }

        const total = 100;
        let returned = 0;
        const cb = function () {
            if (++returned === total) {
                pool.close();
                return done();
            }
        };

        let i = 0;
        pool.on("idle", () => {
            setTimeout(() => {
                while (i < total && pool.isIdle()) {
                    i++;
                    sendMessage(cb);
                }
                if (i > 50) {
                    // kill all connections. We should still end up with the same amount of callbacks
                    setImmediate(() => {
                        for (let j = 5 - 1; j >= 0; j--) {
                            if (pool._connections[j] && pool._connections[j].connection) {
                                pool._connections[j].connection._socket.emit("error", new Error("TESTERROR"));
                            }
                        }
                    });
                }
            }, 1000);
        });
    });

    it("Should login and send mail using proxied socket", (done) => {
        const pool = smtpPool({
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
            expect(body.toString()).to.equal(`${message.trim().replace(/\n/g, "\r\n")}\r\n`);
            callback(null, true);
        });

        pool.send({
            data: {},
            message: new MockBuilder({
                from: "test@valid.sender",
                to: "test@valid.recipient"
            }, message)
        }, (err) => {
            expect(err).to.not.exist;
            pool.close();
            return done();
        });
    });

    it("Should verify connection with success", (done) => {
        const client = smtpPool({
            url: `smtp:testuser:testpass@localhost:${PORT_NUMBER}`,
            logger: false
        });

        client.verify((err, success) => {
            expect(err).to.not.exist;
            expect(success).to.be.true;
            client.close();
            done();
        });
    });

    it("Should not verify connection", (done) => {
        const client = smtpPool({
            url: `smtp:testuser:testpass@localhost:999${PORT_NUMBER}`,
            logger: false
        });

        client.verify((err) => {
            expect(err).to.exist;
            client.close();
            done();
        });
    });
});
