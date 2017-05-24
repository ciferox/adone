describe("glosses", "net", "mail", "MailComposer unit tests", () => {
    const { net: { mail: { __: { MailComposer } } }, std: { path } } = adone;

    it("should create new MailComposer", () => {
        expect(new MailComposer({})).to.exist;
    });

    describe("#compile", () => {
        it("should use Mixed structure with text and attachment", () => {
            const data = {
                text: "abc",
                attachments: [{
                    content: "abc"
                }]
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createMixed");
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it("should use Mixed structure with multiple attachments", () => {
            const data = {
                attachments: [{
                    content: "abc"
                }, {
                    content: "def"
                }]
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createMixed");
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it("should create Alternative structure with text and html", () => {
            const data = {
                text: "abc",
                html: "def"
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createAlternative");
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);

            expect(compiler._alternatives.length).to.equal(2);
            expect(compiler._alternatives[0].contentType).to.equal("text/plain");
            expect(compiler._alternatives[1].contentType).to.equal("text/html");

            compiler._createAlternative.restore();
        });

        it("should create Alternative structure with text, watchHtml and html", () => {
            const data = {
                text: "abc",
                html: "def",
                watchHtml: "ghi"
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createAlternative");
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            expect(compiler._alternatives.length).to.equal(3);
            expect(compiler._alternatives[0].contentType).to.equal("text/plain");
            expect(compiler._alternatives[1].contentType).to.equal("text/watch-html");
            expect(compiler._alternatives[2].contentType).to.equal("text/html");
            compiler._createAlternative.restore();
        });

        it("should create Alternative structure with text, icalEvent and html", () => {
            const data = {
                text: "abc",
                html: "def",
                icalEvent: "ghi"
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createAlternative");
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            expect(compiler._alternatives.length).to.equal(3);
            expect(compiler._alternatives[0].contentType).to.equal("text/plain");
            expect(compiler._alternatives[1].contentType).to.equal("text/html");
            expect(compiler._alternatives[2].contentType).to.equal('text/calendar; charset="utf-8"; method=PUBLISH');
            compiler._createAlternative.restore();
        });

        it("should create Alternative structure using encoded icalEvent", (done) => {
            const data = {
                text: "abc",
                html: "def",
                icalEvent: {
                    method: "publish",
                    content: "dGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZQ==",
                    encoding: "base64"
                }
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createAlternative");
            compiler.compile().build((err, message) => {
                expect(err).to.not.exist;
                const msg = message.toString();
                expect(msg.indexOf("\r\ntere tere tere tere tere tere tere tere tere tere tere tere tere tere tere =\r\ntere tere tere tere tere tere tere\r\n")).to.be.gte(0);
                expect(msg.indexOf("\r\ndGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRl\r\ncmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZSB0ZXJlIHRlcmUgdGVyZQ==\r\n")).to.be.gte(0);
                done();
            });
        });

        it("should create Alternative structure with text, html and cid attachment", () => {
            const data = {
                text: "abc",
                html: "def",
                attachments: [{
                    content: "abc",
                    cid: "aaa"
                }, {
                    content: "def",
                    cid: "bbb"
                }]
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createAlternative");
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            compiler._createAlternative.restore();
        });

        it("should create Related structure with html and cid attachment", () => {
            const data = {
                html: "def",
                attachments: [{
                    content: "abc",
                    cid: "aaa"
                }, {
                    content: "def",
                    cid: "bbb"
                }]
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createRelated");
            compiler.compile();
            expect(compiler._createRelated.callCount).to.equal(1);
            compiler._createRelated.restore();
        });

        it("should create content node with only text", () => {
            const data = {
                text: "def"
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createContentNode");
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it("should create content node with only an attachment", () => {
            const data = {
                attachments: [{
                    content: "abc",
                    cid: "aaa"
                }]
            };

            const compiler = new MailComposer(data);
            spy(compiler, "_createContentNode");
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it("should create content node with encoded buffer", () => {
            const str = "tere tere";
            const data = {
                text: {
                    content: new Buffer(str).toString("base64"),
                    encoding: "base64"
                }
            };

            const compiler = new MailComposer(data);
            compiler.compile();
            expect(compiler.message.content).to.deep.equal(new Buffer(str));
        });

        it("should create content node from data url", () => {
            const str = "tere tere";
            const data = {
                attachments: [{
                    href: "data:image/png,tere%20tere"
                }]
            };

            const compiler = new MailComposer(data);
            const mail = compiler.compile();
            expect(mail.messageId()).to.exist;
            expect(compiler.mail.attachments[0].content).to.deep.equal(new Buffer(str));
            expect(compiler.mail.attachments[0].contentType).to.equal("image/png");
        });

        it("should create the same output", (done) => {
            const data = {
                text: "abc",
                html: "def",
                baseBoundary: "test",
                messageId: "<zzzzzz>",
                headers: {
                    "x-processed": "a really long header or value with non-ascii characters 👮",
                    "x-unprocessed": {
                        prepared: true,
                        value: "a really long header or value with non-ascii characters 👮"
                    }
                },
                date: "Sat, 21 Jun 2014 10:52:44 +0000"
            };

            const expected = "" +
                'Content-Type: multipart/alternative; boundary="--_NmP-test-Part_1"\r\n' +
                "X-Processed: a really long header or value with non-ascii characters\r\n" +
                " =?UTF-8?Q?=F0=9F=91=AE?=\r\n" +
                "X-Unprocessed: a really long header or value with non-ascii characters 👮\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "abc\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/html\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "def\r\n" +
                "----_NmP-test-Part_1--\r\n";

            const mail = new MailComposer(data).compile();
            expect(mail.messageId()).to.equal("<zzzzzz>");
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should use raw input for the message", (done) => {
            const data = {
                raw: "test test test\r\n",
                envelope: {
                    from: "Daemon <deamon@kreata.ee>",
                    to: "mailer@kreata.ee, Mailer <mailer2@kreata.ee>"
                }
            };

            const expected = "test test test\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(mail.getEnvelope()).to.deep.equal({
                    from: "deamon@kreata.ee",
                    to: ["mailer@kreata.ee", "mailer2@kreata.ee"]
                });
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should use raw input for different parts", (done) => {
            const data = {
                from: "test1@example.com",
                to: "test2@example.com",
                bcc: "test3@example.com",
                text: {
                    raw: "rawtext"
                },
                html: {
                    raw: "rawhtml"
                },
                watchHtml: {
                    raw: "rawwatch"
                },
                messageId: "rawtest",
                icalEvent: {
                    raw: "rawcalendar"
                },
                attachments: [{
                    raw: "rawattachment"
                }],
                alternatives: [{
                    raw: "rawalternative"
                }],
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                baseBoundary: "test"
            };

            const expected = 'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                "From: test1@example.com\r\n" +
                "To: test2@example.com\r\n" +
                "Message-ID: <rawtest>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                'Content-Type: multipart/alternative; boundary="--_NmP-test-Part_2"\r\n' +
                "\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "rawtext\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "rawwatch\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "rawhtml\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "rawalternative\r\n" +
                "----_NmP-test-Part_2--\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "rawattachment\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "rawcalendar\r\n" +
                "----_NmP-test-Part_1--\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should discard BCC", (done) => {
            const data = {
                from: "test1@example.com",
                to: "test2@example.com",
                bcc: "test3@example.com",
                text: "def",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000"
            };

            const expected = "" +
                "Content-Type: text/plain\r\n" +
                "From: test1@example.com\r\n" +
                "To: test2@example.com\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "def\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should autodetect text encoding", (done) => {
            const data = {
                from: "ÄÄÄÄ test1@example.com",
                to: "AAAÄ test2@example.com",
                subject: "def ÄÄÄÄ foo AAAÄ",
                text: "def ÄÄÄÄ foo AAAÄ",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000"
            };

            const expected = "" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "From: =?UTF-8?B?w4TDhMOEw4Q=?= <test1@example.com>\r\n" +
                "To: =?UTF-8?Q?AAA=C3=84?= <test2@example.com>\r\n" +
                "Subject: def =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84_foo_AAA=C3=84?=\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "Content-Transfer-Encoding: quoted-printable\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "def =C3=84=C3=84=C3=84=C3=84 foo AAA=C3=84\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should use quoted-printable text encoding", (done) => {
            const data = {
                from: "ÄÄÄÄ test1@example.com",
                to: "AAAÄ test2@example.com",
                subject: "def ÄÄÄÄ foo AAAÄ",
                text: "def ÄÄÄÄ foo AAAÄ",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                textEncoding: "quoted-printable"
            };

            const expected = "" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "From: =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84?= <test1@example.com>\r\n" +
                "To: =?UTF-8?Q?AAA=C3=84?= <test2@example.com>\r\n" +
                "Subject: def =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84_foo_AAA=C3=84?=\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "Content-Transfer-Encoding: quoted-printable\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "def =C3=84=C3=84=C3=84=C3=84 foo AAA=C3=84\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should use base64 text encoding", (done) => {
            const data = {
                from: "ÄÄÄÄ test1@example.com",
                to: "AAAÄ test2@example.com",
                subject: "def ÄÄÄÄ foo AAAÄ",
                text: "def ÄÄÄÄ foo AAAÄ",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                textEncoding: "base64"
            };

            const expected = "" +
                "Content-Type: text/plain; charset=utf-8\r\n" +
                "From: =?UTF-8?B?w4TDhMOEw4Q=?= <test1@example.com>\r\n" +
                "To: =?UTF-8?B?QUFBw4Q=?= <test2@example.com>\r\n" +
                "Subject: def =?UTF-8?B?w4TDhMOEw4QgZm9vIEFBQcOE?=\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "Content-Transfer-Encoding: base64\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "ZGVmIMOEw4TDhMOEIGZvbyBBQUHDhA==\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should keep BCC", (done) => {
            const data = {
                from: "test1@example.com",
                to: "test2@example.com",
                bcc: "test3@example.com",
                text: "def",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000"
            };

            const expected = "" +
                "Content-Type: text/plain\r\n" +
                "From: test1@example.com\r\n" +
                "To: test2@example.com\r\n" +
                "Bcc: test3@example.com\r\n" +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "def\r\n";

            const mail = new MailComposer(data).compile();
            mail.keepBcc = true;
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should set headers for attachment", (done) => {
            const data = {
                text: "abc",
                baseBoundary: "test",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                attachments: [{
                    headers: {
                        "X-Test-1": 12345,
                        "X-Test-2": "ÕÄÖÜ",
                        "X-Test-3": ["foo", "bar"]
                    },
                    content: "test",
                    filename: "test.txt"
                }]
            };

            const expected = "" +
                'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "abc\r\n-" +
                "---_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain; name=test.txt\r\n" +
                "X-Test-1: 12345\r\n" +
                "X-Test-2: =?UTF-8?B?w5XDhMOWw5w=?=\r\n" +
                "X-Test-3: foo\r\n" +
                "X-Test-3: bar\r\n" +
                "Content-Disposition: attachment; filename=test.txt\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "test\r\n" +
                "----_NmP-test-Part_1--\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should ignore attachment filename", (done) => {
            const data = {
                text: "abc",
                baseBoundary: "test",
                messageId: "zzzzzz",
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                attachments: [{
                    content: "test",
                    filename: "test.txt"
                }, {
                    content: "test2",
                    filename: false
                }]
            };

            const expected = "" +
                'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                "Message-ID: <zzzzzz>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "abc\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain; name=test.txt\r\n" +
                "Content-Disposition: attachment; filename=test.txt\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "test\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: application/octet-stream\r\n" +
                "Content-Disposition: attachment\r\n" +
                "Content-Transfer-Encoding: base64\r\n" +
                "\r\n" +
                "dGVzdDI=\r\n" +
                "----_NmP-test-Part_1--\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should add ical alternative", (done) => {
            const data = {
                from: "test1@example.com",
                to: "test2@example.com",
                bcc: "test3@example.com",
                text: "def",
                messageId: "icaltest",
                icalEvent: {
                    method: "request",
                    content: new Buffer("test").toString("hex"),
                    encoding: "hex"
                },
                date: "Sat, 21 Jun 2014 10:52:44 +0000",
                baseBoundary: "test"
            };

            const expected = "" +
                'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                "From: test1@example.com\r\n" +
                "To: test2@example.com\r\n" +
                "Message-ID: <icaltest>\r\n" +
                "Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                'Content-Type: multipart/alternative; boundary="--_NmP-test-Part_2"\r\n' +
                "\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "def\r\n" +
                "----_NmP-test-Part_2\r\n" +
                "Content-Type: text/calendar; charset=utf-8; method=REQUEST\r\n" +
                "Content-Transfer-Encoding: quoted-printable\r\n" +
                "\r\n" +
                "test\r\n" +
                "----_NmP-test-Part_2--\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: application/ics; name=invite.ics\r\n" +
                "Content-Disposition: attachment; filename=invite.ics\r\n" +
                "Content-Transfer-Encoding: base64\r\n" +
                "\r\n" +
                "dGVzdA==\r\n" +
                "----_NmP-test-Part_1--\r\n";

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it("should use load attachment from file", (done) => {
            const data = {
                text: "abc",
                attachments: [{
                    path: path.resolve(__dirname, "fixtures", "attachment.bin")
                }]
            };

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.not.exist;
                expect(message.toString()).to.include("w7VrdmEK");
                done();
            });
        });

        it("should not load attachment from file", (done) => {
            const data = {
                text: "abc",
                attachments: [{
                    path: path.resolve(__dirname, "fixtures", "attachment.bin")
                }],
                disableFileAccess: true
            };

            const mail = new MailComposer(data).compile();
            mail.build((err, message) => {
                expect(err).to.exist;
                expect(message).to.not.exist;
                done();
            });
        });
    });
});
