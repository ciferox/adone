const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIBywIBAAJhANCx7ncKUfQ8wBUYmMqq6ky8rBB0NL8knBf3+uA7q/CSxpX6sQ8N
dFNtEeEd7gu7BWEM7+PkO1P0M78eZOvVmput8BP9R44ARpgHY4V0qSCdUt4rD32n
wfjlGbh8p5ua5wIDAQABAmAm+uUQpQPTu7kg95wqVqw2sxLsa9giT6M8MtxQH7Uo
1TF0eAO0TQ4KOxgY1S9OT5sGPVKnag258m3qX7o5imawcuyStb68DQgAUg6xv7Af
AqAEDfYN5HW6xK+X81jfOUECMQDr7XAS4PERATvgb1B3vRu5UEbuXcenHDYgdoyT
3qJFViTbep4qeaflF0uF9eFveMcCMQDic10rJ8fopGD7/a45O4VJb0+lRXVdqZxJ
QzAp+zVKWqDqPfX7L93SQLzOGhdd7OECMQDeQyD7WBkjSQNMy/GF7I1qxrscIxNN
VqGTcbu8Lti285Hjhx/sqhHHHGwU9vB7oM8CMQDKTS3Kw/s/xrot5O+kiZwFgr+w
cmDrj/7jJHb+ykFNb7GaEkiSYqzUjKkfpweBDYECMFJUyzuuFJAjq3BXmGJlyykQ
TweUw+zMVdSXjO+FCPcYNi6CP1t1KoESzGKBVoqA/g==
-----END RSA PRIVATE KEY-----`;


describe("net", "mail", "SES Transport Tests", function () {
    this.timeout(50 * 1000);

    const { net: { mail }, std: { path } } = adone;

    it("should return MessageId", (done) => {
        const transport = mail.createTransport({
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setImmediate(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    });
                }
            }
        });

        const messageObject = {
            from: "Andris Reinman <andris.reinman@gmail.com>",
            to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
            cc: "info@nodemailer.com",
            subject: "Awesome!",
            messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
            html: {
                path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
            },
            text: "hello world",
            attachments: [{
                filename: "image.png",
                path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
            }]
        };

        transport.sendMail(messageObject, (err, info) => {
            expect(err).to.not.exist();
            expect(info).to.exist();
            expect(info).to.deep.equal({
                envelope: {
                    from: "andris.reinman@gmail.com",
                    to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                },
                messageId: "<testtest@eu-west-1.amazonses.com>",
                response: "testtest"
            });
            done();
        });
    });

    it("should sign message with DKIM", (done) => {
        const transport = mail.createTransport({
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    expect(message.RawMessage.Data.toString()).to.include("h=from:subject:to:cc:mime-version:content-type;");
                    setImmediate(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    });
                }
            },
            dkim: {
                domainName: "node.ee",
                keySelector: "dkim",
                privateKey
            }
        });

        const messageObject = {
            from: "Andris Reinman <andris.reinman@gmail.com>",
            to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
            cc: "info@nodemailer.com",
            subject: "Awesome!",
            messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
            html: {
                path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
            },
            text: "hello world",
            attachments: [{
                filename: "image.png",
                path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
            }]
        };

        transport.sendMail(messageObject, (err, info) => {
            expect(err).to.not.exist();
            expect(info).to.exist();
            expect(info).to.deep.equal({
                envelope: {
                    from: "andris.reinman@gmail.com",
                    to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                },
                messageId: "<testtest@eu-west-1.amazonses.com>",
                response: "testtest"
            });
            done();
        });
    });

    it("should limit parallel connections", (done) => {
        const transport = mail.createTransport({
            maxConnections: 2,
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setTimeout(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    }, 100);
                }
            }
        });

        const total = 100;
        let finished = 0;
        const start = Date.now();

        for (let i = 0; i < total; i++) {

            const messageObject = {
                from: "Andris Reinman <andris.reinman@gmail.com>",
                to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
                cc: "info@nodemailer.com",
                subject: "Awesome!",
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
                html: {
                    path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
                },
                text: "hello world",
                attachments: [{
                    filename: "image.png",
                    path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
                }]
            };

            transport.sendMail(messageObject, (err, info) => {
                finished++;
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.deep.equal({
                    envelope: {
                        from: "andris.reinman@gmail.com",
                        to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                    },
                    messageId: "<testtest@eu-west-1.amazonses.com>",
                    response: "testtest"
                });

                if (total === finished) {
                    expect(Date.now() - start).to.be.gte(5000);
                    expect(Date.now() - start).to.be.lte(10000);
                    return done();
                }
            });
        }
    });

    it("should rate limit messages", (done) => {
        const transport = mail.createTransport({
            sendingRate: 10,
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setTimeout(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    }, 100);
                }
            }
        });

        const total = 100;
        let finished = 0;
        const start = Date.now();

        for (let i = 0; i < total; i++) {

            const messageObject = {
                from: "Andris Reinman <andris.reinman@gmail.com>",
                to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
                cc: "info@nodemailer.com",
                subject: "Awesome!",
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
                html: {
                    path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
                },
                text: "hello world",
                attachments: [{
                    filename: "image.png",
                    path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
                }]
            };

            transport.sendMail(messageObject, (err, info) => {
                finished++;
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.deep.equal({
                    envelope: {
                        from: "andris.reinman@gmail.com",
                        to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                    },
                    messageId: "<testtest@eu-west-1.amazonses.com>",
                    response: "testtest"
                });

                if (total === finished) {
                    expect(Date.now() - start).to.be.gte(10000);
                    expect(Date.now() - start).to.be.lte(15000);
                    return done();
                }
            });
        }
    });

    it("should rate limit long messages", (done) => {
        const transport = mail.createTransport({
            sendingRate: 30,
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setTimeout(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    }, 3000);
                }
            }
        });

        const total = 100;
        let finished = 0;
        const start = Date.now();

        for (let i = 0; i < total; i++) {

            const messageObject = {
                from: "Andris Reinman <andris.reinman@gmail.com>",
                to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
                cc: "info@nodemailer.com",
                subject: "Awesome!",
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
                html: {
                    path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
                },
                text: "hello world",
                attachments: [{
                    filename: "image.png",
                    path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
                }]
            };

            transport.sendMail(messageObject, (err, info) => {
                finished++;
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.deep.equal({
                    envelope: {
                        from: "andris.reinman@gmail.com",
                        to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                    },
                    messageId: "<testtest@eu-west-1.amazonses.com>",
                    response: "testtest"
                });

                if (total === finished) {
                    expect(Date.now() - start).to.be.gte(12000);
                    expect(Date.now() - start).to.be.lte(15000);
                    return done();
                }
            });
        }
    });

    it("should rate limit messages and connections", (done) => {
        const transport = mail.createTransport({
            sendingRate: 100,
            maxConnections: 1,
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setTimeout(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    }, 100);
                }
            }
        });

        const total = 100;
        let finished = 0;
        const start = Date.now();

        for (let i = 0; i < total; i++) {

            const messageObject = {
                from: "Andris Reinman <andris.reinman@gmail.com>",
                to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
                cc: "info@nodemailer.com",
                subject: "Awesome!",
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
                html: {
                    path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
                },
                text: "hello world",
                attachments: [{
                    filename: "image.png",
                    path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
                }]
            };

            transport.sendMail(messageObject, (err, info) => {
                finished++;
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.deep.equal({
                    envelope: {
                        from: "andris.reinman@gmail.com",
                        to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                    },
                    messageId: "<testtest@eu-west-1.amazonses.com>",
                    response: "testtest"
                });

                if (total === finished) {
                    expect(Date.now() - start).to.be.gte(10000);
                    expect(Date.now() - start).to.be.lte(15000);
                    return done();
                }
            });
        }
    });

    it("detect sending slots on idle events", (done) => {
        const transport = mail.createTransport({
            sendingRate: 100,
            maxConnections: 1,
            SES: {
                config: {
                    region: "eu-west-1"
                },
                sendRawEmail: (message, cb) => {
                    setTimeout(() => {
                        cb(null, {
                            MessageId: "testtest"
                        });
                    }, 100);
                }
            }
        });

        const total = 100;
        let finished = 0;
        const start = Date.now();
        let sent = 0;

        const sendNext = () => {
            const messageObject = {
                from: "Andris Reinman <andris.reinman@gmail.com>",
                to: "Andris Kreata <andris@kreata.ee>, andris@nodemailer.com",
                cc: "info@nodemailer.com",
                subject: "Awesome!",
                messageId: "<fede478a-aab9-af02-789c-ad93a76a3548@gmail.com>",
                html: {
                    path: path.resolve(__dirname, "json_transport", "fixtures", "body.html")
                },
                text: "hello world",
                attachments: [{
                    filename: "image.png",
                    path: path.resolve(__dirname, "json_transport", "fixtures", "image.png")
                }]
            };

            transport.sendMail(messageObject, (err, info) => {
                finished++;
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.deep.equal({
                    envelope: {
                        from: "andris.reinman@gmail.com",
                        to: ["andris@kreata.ee", "andris@nodemailer.com", "info@nodemailer.com"]
                    },
                    messageId: "<testtest@eu-west-1.amazonses.com>",
                    response: "testtest"
                });

                if (total === finished) {
                    expect(Date.now() - start).to.be.gte(10000);
                    expect(Date.now() - start).to.be.lte(15000);
                    return done();
                }
            });
        };

        transport.on("idle", () => {
            while (transport.isIdle() && sent < total) {
                sent++;
                sendNext();
            }
        });
    });

});
