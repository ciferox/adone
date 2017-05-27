describe("glosses", "net", "mail", "MimeNode Tests", () => {
    const { net: { mail: { __: { MimeNode } } }, std: { http, stream: { Transform, PassThrough }, path } } = adone;

    it("should create MimeNode object", () => {
        expect(new MimeNode()).to.exist;
    });

    describe("#createChild", () => {
        it("should create child", () => {
            const mb = new MimeNode("multipart/mixed");

            const child = mb.createChild("multipart/mixed");
            expect(child.parentNode).to.equal(mb);
            expect(child.rootNode).to.equal(mb);

            const subchild1 = child.createChild("text/html");
            expect(subchild1.parentNode).to.equal(child);
            expect(subchild1.rootNode).to.equal(mb);

            const subchild2 = child.createChild("text/html");
            expect(subchild2.parentNode).to.equal(child);
            expect(subchild2.rootNode).to.equal(mb);
        });
    });

    describe("#appendChild", () => {
        it("should append child node", () => {
            const mb = new MimeNode("multipart/mixed");

            const child = new MimeNode("text/plain");
            mb.appendChild(child);
            expect(child.parentNode).to.equal(mb);
            expect(child.rootNode).to.equal(mb);
            expect(mb.childNodes.length).to.equal(1);
            expect(mb.childNodes[0]).to.equal(child);
        });
    });

    describe("#replace", () => {
        it("should replace node", () => {
            let mb = new MimeNode(),
                child = mb.createChild("text/plain"),
                replacement = new MimeNode("image/png");

            child.replace(replacement);

            expect(mb.childNodes.length).to.equal(1);
            expect(mb.childNodes[0]).to.equal(replacement);
        });
    });

    describe("#remove", () => {
        it("should remove node", () => {
            let mb = new MimeNode(),
                child = mb.createChild("text/plain");

            child.remove();
            expect(mb.childNodes.length).to.equal(0);
            expect(child.parenNode).to.not.exist;
        });
    });

    describe("#setHeader", () => {
        it("should set header", () => {
            const mb = new MimeNode();

            mb.setHeader("key", "value");
            mb.setHeader("key", "value1");
            expect(mb.getHeader("Key")).to.equal("value1");

            mb.setHeader([{
                key: "key",
                value: "value2"
            }, {
                key: "key2",
                value: "value3"
            }]);

            expect(mb._headers).to.deep.equal([{
                key: "Key",
                value: "value2"
            }, {
                key: "Key2",
                value: "value3"
            }]);

            mb.setHeader({
                key: "value4",
                key2: "value5"
            });

            expect(mb._headers).to.deep.equal([{
                key: "Key",
                value: "value4"
            }, {
                key: "Key2",
                value: "value5"
            }]);
        });

        it("should set multiple headers with the same key", () => {
            const mb = new MimeNode();

            mb.setHeader("key", ["value1", "value2", "value3"]);
            expect(mb._headers).to.deep.equal([{
                key: "Key",
                value: ["value1", "value2", "value3"]
            }]);
        });
    });

    describe("#addHeader", () => {
        it("should add header", () => {
            const mb = new MimeNode();

            mb.addHeader("key", "value1");
            mb.addHeader("key", "value2");

            mb.addHeader([{
                key: "key",
                value: "value2"
            }, {
                key: "key2",
                value: "value3"
            }]);

            mb.addHeader({
                key: "value4",
                key2: "value5"
            });

            expect(mb._headers).to.deep.equal([{
                key: "Key",
                value: "value1"
            }, {
                key: "Key",
                value: "value2"
            }, {
                key: "Key",
                value: "value2"
            }, {
                key: "Key2",
                value: "value3"
            }, {
                key: "Key",
                value: "value4"
            }, {
                key: "Key2",
                value: "value5"
            }]);
        });

        it("should set multiple headers with the same key", () => {
            const mb = new MimeNode();
            mb.addHeader("key", ["value1", "value2", "value3"]);
            expect(mb._headers).to.deep.equal([{
                key: "Key",
                value: "value1"
            }, {
                key: "Key",
                value: "value2"
            }, {
                key: "Key",
                value: "value3"
            }]);
        });
    });

    describe("#getHeader", () => {
        it("should return first matching header value", () => {
            const mb = new MimeNode();
            mb._headers = [{
                key: "Key",
                value: "value4"
            }, {
                key: "Key2",
                value: "value5"
            }];

            expect(mb.getHeader("KEY")).to.equal("value4");
        });
    });

    describe("#setContent", () => {
        it("should set the contents for a node", () => {
            const mb = new MimeNode();
            mb.setContent("abc");
            expect(mb.content).to.equal("abc");
        });
    });


    describe("#build", () => {

        it("should build root node", (done) => {
            let mb = new MimeNode("text/plain").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: text/plain\r\n" +
                "Date: 12345\r\n" +
                "Message-ID: <67890>\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "Hello world!\r\n";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should build child node", (done) => {
            let mb = new MimeNode("multipart/mixed"),
                childNode = mb.createChild("text/plain").
            setContent("Hello world!"),

                expected = "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "Hello world!\r\n";

            childNode.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should build multipart node", (done) => {
            let mb = new MimeNode("multipart/mixed", {
                    baseBoundary: "test"
                }).setHeader({
                    date: "12345",
                    "message-id": "67890"
                }),

                expected = 'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                "Date: 12345\r\n" +
                "Message-ID: <67890>\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "----_NmP-test-Part_1\r\n" +
                "Content-Type: text/plain\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "\r\n" +
                "Hello world!\r\n" +
                "----_NmP-test-Part_1--\r\n";

            mb.createChild("text/plain").setContent("Hello world!");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should build root with generated headers", (done) => {
            const mb = new MimeNode("text/plain");
            mb.hostname = "abc";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Date:\s/m.test(msg)).to.be.true;
                expect(/^Message\-ID:\s/m.test(msg)).to.be.true;
                expect(/^MIME-Version: 1\.0$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should not include bcc missing in output, but in envelope", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                from: "sender@example.com",
                to: "receiver@example.com",
                bcc: "bcc@example.com"
            });
            const envelope = mb.getEnvelope();

            expect(envelope).to.deep.equal({
                from: "sender@example.com",
                to: ["receiver@example.com", "bcc@example.com"]
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^From: sender@example.com$/m.test(msg)).to.be.true;
                expect(/^To: receiver@example.com$/m.test(msg)).to.be.true;
                expect(!/^Bcc:/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should include bcc missing in output and in envelope", (done) => {
            const mb = new MimeNode(
                "text/plain", {
                    keepBcc: true
                }).
            setHeader({
                from: "sender@example.com",
                to: "receiver@example.com",
                bcc: "bcc@example.com"
            });
            const envelope = mb.getEnvelope();

            expect(envelope).to.deep.equal({
                from: "sender@example.com",
                to: ["receiver@example.com", "bcc@example.com"]
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^From: sender@example.com$/m.test(msg)).to.be.true;
                expect(/^To: receiver@example.com$/m.test(msg)).to.be.true;
                expect(/^Bcc: bcc@example.com$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should use set envelope", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                from: "sender@example.com",
                to: "receiver@example.com",
                bcc: "bcc@example.com"
            }).setEnvelope({
                from: "U Name, A Name <a@a.a>",
                to: "B Name <b@b.b>, c@c.c",
                bcc: "P P P, <u@u.u>",
                fooField: {
                    barValue: "foobar"
                }
            });
            const envelope = mb.getEnvelope();

            expect(envelope).to.deep.equal({
                from: "a@a.a",
                to: ["b@b.b", "c@c.c", "u@u.u"],
                fooField: {
                    barValue: "foobar"
                }
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^From: sender@example.com$/m.test(msg)).to.be.true;
                expect(/^To: receiver@example.com$/m.test(msg)).to.be.true;
                expect(!/^Bcc:/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should have unicode subject", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                subject: "jõgeval istus kägu metsas"
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Subject: =\?UTF\-8\?Q\?j=C3=B5geval_istus_k=C3=A4gu\?= metsas$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should have unicode subject with strange characters", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                subject: "ˆ¸ÁÌÓıÏˇÁÛ^¸\\ÁıˆÌÁÛØ^\\˜Û˝™ˇıÓ¸^\\˜ﬁ^\\·\\˜Ø^£˜#ﬁ^\\£ﬁ^\\£ﬁ^\\"
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg.match(/\bSubject: [^\r]*\r\n( [^\r]*\r\n)*/)[0]).to.equal("Subject: =?UTF-8?B?y4bCuMOBw4zDk8Sxw4/Lh8OBw5tewrhcw4HEscuG?=\r\n =?UTF-8?B?w4zDgcObw5heXMucw5vLneKEosuHxLHDk8K4Xlw=?=\r\n =?UTF-8?B?y5zvrIFeXMK3XMucw5hewqPLnCPvrIFeXMKj76yB?=\r\n =?UTF-8?B?XlzCo++sgV5c?=\r\n");
                done();
            });
        });

        it("should keep 7bit text as is", (done) => {
            const mb = new MimeNode("text/plain").
            setContent("tere tere");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/\r\n\r\ntere tere\r\n$/.test(msg)).to.be.true;
                expect(/^Content-Type: text\/plain$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: 7bit$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should prefer base64", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                subject: "õõõõ"
            }).
            setContent("õõõõõõõõ");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();

                expect(/^Content-Type: text\/plain; charset=utf-8$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: base64$/m.test(msg)).to.be.true;
                expect(/^Subject: =\?UTF-8\?B\?w7XDtcO1w7U=\?=$/m.test(msg)).to.be.true;
                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("w7XDtcO1w7XDtcO1w7XDtQ==\r\n");
                done();
            });
        });

        it("should force quoted-printable", (done) => {
            const mb = new MimeNode("text/plain", {
                textEncoding: "quoted-printable"
            }).setHeader({
                subject: "õõõõ"
            }).
            setContent("õõõõõõõõ");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();

                expect(/^Content-Type: text\/plain; charset=utf-8$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;
                expect(/^Subject: =\?UTF-8\?Q\?=C3=B5=C3=B5=C3=B5=C3=B5\?=$/m.test(msg)).to.be.true;

                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("=C3=B5=C3=B5=C3=B5=C3=B5=C3=B5=C3=B5=C3=B5=C3=B5\r\n");
                done();
            });
        });

        it("should prefer quoted-printable", (done) => {
            const mb = new MimeNode("text/plain").
            setContent("ooooooooõ");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();

                expect(/^Content-Type: text\/plain; charset=utf-8$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;

                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("oooooooo=C3=B5\r\n");
                done();
            });
        });

        it("should not flow text", (done) => {
            const mb = new MimeNode("text/plain").
            setContent("a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0 a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();

                expect(/^Content-Type: text\/plain$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;

                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0 a b c d=\r\n e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 =\r\n0\r\n");
                done();
            });
        });

        it("should not flow html", (done) => {
            const mb = new MimeNode("text/html").
            setContent("a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0 a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Content-Type: text\/html$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;

                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("a b c d e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 0 a b c d=\r\n e f g h i j k l m o p q r s t u w x y z 1 2 3 4 5 6 7 8 9 =\r\n0\r\n");
                done();
            });
        });

        it("should use 7bit for html", (done) => {
            const mb = new MimeNode("text/html").
            setContent("a b c d e f g h i j k l m o p\r\nq r s t u w x y z 1 2 3 4 5 6\r\n7 8 9 0 a b c d e f g h i j k\r\nl m o p q r s t u w x y z\r\n1 2 3 4 5 6 7 8 9 0");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Content-Type: text\/html$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: 7bit$/m.test(msg)).to.be.true;

                msg = msg.split("\r\n\r\n");
                msg.shift();
                msg = msg.join("\r\n\r\n");

                expect(msg).to.equal("a b c d e f g h i j k l m o p\r\nq r s t u w x y z 1 2 3 4 5 6\r\n7 8 9 0 a b c d e f g h i j k\r\nl m o p q r s t u w x y z\r\n1 2 3 4 5 6 7 8 9 0\r\n");
                done();
            });
        });

        it("should fetch ascii filename", (done) => {
            const mb = new MimeNode("text/plain", {
                filename: "jogeva.txt"
            }).
            setContent("jogeva");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/\r\n\r\njogeva\r\n$/.test(msg)).to.be.true;
                expect(/^Content-Type: text\/plain; name=jogeva.txt$/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: 7bit$/m.test(msg)).to.be.true;
                expect(/^Content-Disposition: attachment; filename=jogeva.txt$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should set unicode filename", (done) => {
            const mb = new MimeNode("text/plain", {
                filename: "jõgeva.txt"
            }).
            setContent("jõgeva");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Content-Type: text\/plain; charset=utf-8;/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;
                expect(/^Content-Disposition: attachment; filename\*0\*=utf-8''j%C3%B5geva.txt$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should set dashed filename", (done) => {
            const mb = new MimeNode("text/plain", {
                filename: "Ɣ------Ɣ------Ɣ------Ɣ------Ɣ------Ɣ------Ɣ------.pdf"
            }).
            setContent("jõgeva");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg.indexOf("Content-Disposition: attachment;\r\n" +
                    " filename*0*=utf-8''%C6%94------%C6%94------%C6%94------%C6%94;\r\n" +
                    " filename*1*=------%C6%94------%C6%94------%C6%94------.pdf")).to.be.gte(0);
                done();
            });
        });

        it("should encode filename with a space", (done) => {
            const mb = new MimeNode("text/plain", {
                filename: "document a.test.pdf"
            }).
            setContent("jõgeva");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Content-Type: text\/plain; charset=utf-8;/m.test(msg)).to.be.true;
                expect(/^Content-Transfer-Encoding: quoted-printable$/m.test(msg)).to.be.true;
                expect(/^Content-Disposition: attachment; filename="document a.test.pdf"$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should detect content type from filename", (done) => {
            const mb = new MimeNode(false, {
                filename: "jogeva.zip"
            }).
            setContent("jogeva");

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Content-Type: application\/zip;/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should convert address objects", (done) => {
            const mb = new MimeNode(false).
            setHeader({
                from: [{
                    name: "the safewithme õ testuser",
                    address: "safewithme.testuser@jõgeva.com"
                }],
                cc: [{
                    name: "the safewithme testuser",
                    address: "safewithme.testuser@jõgeva.com"
                }]
            });

            expect(mb.getEnvelope()).to.deep.equal({
                from: "safewithme.testuser@xn--jgeva-dua.com",
                to: [
                    "safewithme.testuser@xn--jgeva-dua.com"
                ]
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^From: =\?UTF\-8\?Q\?the_safewithme_=C3=B5_testuser\?=$/m.test(msg)).to.be.true;
                expect(/^\s+<safewithme.testuser@xn\-\-jgeva-dua.com>$/m.test(msg)).to.be.true;
                expect(/^Cc: the safewithme testuser <safewithme.testuser@xn\-\-jgeva-dua.com>$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should skip empty header", (done) => {
            let mb = new MimeNode("text/plain").
            setHeader({
                a: "b",
                cc: "",
                dd: [],
                o: false,
                date: "zzz",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: text/plain\r\n" +
                "A: b\r\n" +
                "Date: zzz\r\n" +
                "Message-ID: <67890>\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "Hello world!\r\n";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should not process prepared headers", (done) => {
            let mb = new MimeNode("text/plain").
            setHeader({
                unprepared: {
                    value: new Array(100).join("a b")
                },
                prepared: {
                    value: new Array(100).join("a b"),
                    prepared: true
                },
                unicode: {
                    value: "õäöü",
                    prepared: true
                },
                date: "zzz",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: text/plain\r\n" +

                // long folded value
                "Unprepared: a ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba\r\n" +
                " ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba\r\n" +
                " ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba\r\n" +
                " ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba\r\n" +
                " ba ba ba b\r\n" +

                // long unfolded value
                "Prepared: a ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba ba b\r\n" +

                // non-ascii value
                "Unicode: õäöü\r\n" +

                "Date: zzz\r\n" +
                "Message-ID: <67890>\r\n" +
                "Content-Transfer-Encoding: 7bit\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "Hello world!\r\n";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should set default transfer encoding for application content", (done) => {
            let mb = new MimeNode("application/x-my-stuff").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: application/x-my-stuff\r\n" +
                "Date: 12345\r\n" +
                "Message-ID: <67890>\r\n" +
                "Content-Transfer-Encoding: base64\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "SGVsbG8gd29ybGQh\r\n";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should not set transfer encoding for multipart content", (done) => {
            let mb = new MimeNode("multipart/global").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: multipart/global; boundary=abc\r\n" +
                "Date: 12345\r\n" +
                "Message-ID: <67890>\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "Hello world!\r\n" +
                "--abc--" +
                "\r\n";

            mb.boundary = "abc";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should not set transfer encoding for message/ content", (done) => {
            let mb = new MimeNode("message/rfc822").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!"),

                expected = "Content-Type: message/rfc822\r\n" +
                "Date: 12345\r\n" +
                "Message-ID: <67890>\r\n" +
                "MIME-Version: 1.0\r\n" +
                "\r\n" +
                "Hello world!\r\n";

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should use from domain for message-id", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                from: "test@example.com"
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Message-ID: <[0-9a-f\-]+@example\.com>$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should fallback to hostname for message-id", (done) => {
            const mb = new MimeNode("text/plain");
            mb.hostname = "abc";
            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^Message-ID: <[0-9a-f\-]+@abc>$/m.test(msg)).to.be.true;
                done();
            });
        });
    });

    describe("#getEnvelope", () => {
        it("should get envelope", () => {
            expect(new MimeNode().addHeader({
                from: "From <from@example.com>",
                sender: "Sender <sender@example.com>",
                to: "receiver1@example.com"
            }).addHeader({
                to: "receiver2@example.com",
                cc: "receiver1@example.com, receiver3@example.com",
                bcc: "receiver4@example.com, Rec5 <receiver5@example.com>"
            }).getEnvelope()).to.deep.equal({
                from: "from@example.com",
                to: ["receiver1@example.com", "receiver2@example.com", "receiver3@example.com", "receiver4@example.com", "receiver5@example.com"]
            });

            expect(new MimeNode().addHeader({
                sender: "Sender <sender@example.com>",
                to: "receiver1@example.com"
            }).addHeader({
                to: "receiver2@example.com",
                cc: "receiver1@example.com, receiver3@example.com",
                bcc: "receiver4@example.com, Rec5 <receiver5@example.com>"
            }).getEnvelope()).to.deep.equal({
                from: "sender@example.com",
                to: ["receiver1@example.com", "receiver2@example.com", "receiver3@example.com", "receiver4@example.com", "receiver5@example.com"]
            });
        });
    });

    describe("#messageId", () => {
        it("should create and return message-Id", () => {
            const mail = new MimeNode().addHeader({
                from: "From <from@example.com>"
            });

            const messageId = mail.messageId();
            expect(/^<[\w\-]+@example\.com>$/.test(messageId)).to.be.true;
            expect(messageId).to.equal(mail.messageId());
        });
    });

    describe("#getAddresses", () => {
        it("should get address object", () => {
            expect(new MimeNode().addHeader({
                from: "From <from@example.com>",
                sender: "Sender <sender@example.com>",
                to: "receiver1@example.com"
            }).addHeader({
                to: "receiver2@example.com",
                cc: "receiver1@example.com, receiver3@example.com",
                bcc: "receiver4@example.com, Rec5 <receiver5@example.com>"
            }).getAddresses()).to.deep.equal({
                from: [{
                    address: "from@example.com",
                    name: "From"
                }],
                sender: [{
                    address: "sender@example.com",
                    name: "Sender"
                }],
                to: [{
                    address: "receiver1@example.com",
                    name: ""
                }, {
                    address: "receiver2@example.com",
                    name: ""
                }],
                cc: [{
                    address: "receiver1@example.com",
                    name: ""
                }, {
                    address: "receiver3@example.com",
                    name: ""
                }],
                bcc: [{
                    address: "receiver4@example.com",
                    name: ""
                }, {
                    address: "receiver5@example.com",
                    name: "Rec5"
                }]
            });

            expect(new MimeNode().addHeader({
                sender: "Sender <sender@example.com>",
                to: "receiver1@example.com"
            }).addHeader({
                to: "receiver2@example.com",
                cc: "receiver1@example.com, receiver1@example.com",
                bcc: "receiver4@example.com, Rec5 <receiver5@example.com>"
            }).getAddresses()).to.deep.equal({
                sender: [{
                    address: "sender@example.com",
                    name: "Sender"
                }],
                to: [{
                    address: "receiver1@example.com",
                    name: ""
                }, {
                    address: "receiver2@example.com",
                    name: ""
                }],
                cc: [{
                    address: "receiver1@example.com",
                    name: ""
                }],
                bcc: [{
                    address: "receiver4@example.com",
                    name: ""
                }, {
                    address: "receiver5@example.com",
                    name: "Rec5"
                }]
            });
        });
    });

    describe("#_parseAddresses", () => {
        it("should normalize header key", () => {
            const mb = new MimeNode();

            expect(mb._parseAddresses("test address@example.com")).to.deep.equal([{
                address: "address@example.com",
                name: "test"
            }]);

            expect(mb._parseAddresses(["test address@example.com"])).to.deep.equal([{
                address: "address@example.com",
                name: "test"
            }]);

            expect(mb._parseAddresses([
                ["test address@example.com"]
            ])).to.deep.equal([{
                address: "address@example.com",
                name: "test"
            }]);

            expect(mb._parseAddresses([{
                address: "address@example.com",
                name: "test"
            }])).to.deep.equal([{
                address: "address@example.com",
                name: "test"
            }]);
        });
    });

    describe("#_normalizeHeaderKey", () => {
        it("should normalize header key", () => {
            const mb = new MimeNode();

            expect(mb._normalizeHeaderKey("key")).to.equal("Key");
            expect(mb._normalizeHeaderKey("mime-vERSION")).to.equal("MIME-Version");
            expect(mb._normalizeHeaderKey("-a-long-name")).to.equal("-A-Long-Name");
            expect(mb._normalizeHeaderKey("some-spf")).to.equal("Some-SPF");
            expect(mb._normalizeHeaderKey("dkim-some")).to.equal("DKIM-Some");
            expect(mb._normalizeHeaderKey("x-smtpapi")).to.equal("X-SMTPAPI");
            expect(mb._normalizeHeaderKey("message-id")).to.equal("Message-ID");
            expect(mb._normalizeHeaderKey("CONTENT-FEATUres")).to.equal("Content-features");
        });
    });

    describe("#_handleContentType", () => {
        it("should do nothing on non multipart", () => {
            const mb = new MimeNode();
            expect(mb.boundary).to.not.exist;
            mb._handleContentType({
                value: "text/plain"
            });
            expect(mb.boundary).to.be.false;
            expect(mb.multipart).to.be.false;
        });

        it("should use provided boundary", () => {
            const mb = new MimeNode();
            expect(mb.boundary).to.not.exist;
            mb._handleContentType({
                value: "multipart/mixed",
                params: {
                    boundary: "abc"
                }
            });
            expect(mb.boundary).to.equal("abc");
            expect(mb.multipart).to.equal("mixed");
        });

        it("should generate boundary", () => {
            const mb = new MimeNode();
            stub(mb, "_generateBoundary").returns("def");

            expect(mb.boundary).to.not.exist;
            mb._handleContentType({
                value: "multipart/mixed",
                params: {}
            });
            expect(mb.boundary).to.equal("def");
            expect(mb.multipart).to.equal("mixed");

            mb._generateBoundary.restore();
        });
    });

    describe("#_generateBoundary ", () => {
        it("should genereate boundary string", () => {
            const mb = new MimeNode();
            mb._nodeId = "abc";
            mb.rootNode.baseBoundary = "def";
            expect(mb._generateBoundary()).to.equal("--_NmP-def-Part_abc");
        });
    });

    describe("#_encodeHeaderValue", () => {
        it("should do noting if possible", () => {
            const mb = new MimeNode();
            expect(mb._encodeHeaderValue("x-my", "test value")).to.equal("test value");
        });

        it("should encode non ascii characters", () => {
            const mb = new MimeNode();
            expect(mb._encodeHeaderValue("x-my", "test jõgeva value")).to.equal("test =?UTF-8?Q?j=C3=B5geva?= value");
        });

        it("should format references", () => {
            const mb = new MimeNode();
            expect(mb._encodeHeaderValue("references", "abc def")).to.equal("<abc> <def>");
            expect(mb._encodeHeaderValue("references", ["abc", "def"])).to.equal("<abc> <def>");
        });

        it("should format message-id", () => {
            const mb = new MimeNode();
            expect(mb._encodeHeaderValue("message-id", "abc")).to.equal("<abc>");
        });

        it("should format addresses", () => {
            const mb = new MimeNode();
            expect(mb._encodeHeaderValue("from", {
                name: "the safewithme testuser",
                address: "safewithme.testuser@jõgeva.com"
            })).to.equal("the safewithme testuser <safewithme.testuser@xn--jgeva-dua.com>");
        });
    });

    describe("#_convertAddresses", () => {
        it("should convert address object to a string", () => {
            const mb = new MimeNode();
            expect(mb._convertAddresses([{
                name: "Jõgeva Ants",
                address: "ants@jõgeva.ee"
            }, {
                name: "Composers",
                group: [{
                    address: "sebu@example.com",
                    name: "Bach, Sebastian"
                }, {
                    address: "mozart@example.com",
                    name: "Mozzie"
                }]
            }])).to.equal('=?UTF-8?Q?J=C3=B5geva_Ants?= <ants@xn--jgeva-dua.ee>, Composers:"Bach, Sebastian" <sebu@example.com>, Mozzie <mozart@example.com>;');
        });

        it("should keep ascii name as is", () => {
            const mb = new MimeNode();
            expect(mb._convertAddresses([{
                name: "O'Vigala Sass",
                address: "a@b.c"
            }])).to.equal("O'Vigala Sass <a@b.c>");
        });

        it("should include name in quotes for special symbols", () => {
            const mb = new MimeNode();
            expect(mb._convertAddresses([{
                name: "Sass, Vigala",
                address: "a@b.c"
            }])).to.equal('"Sass, Vigala" <a@b.c>');
        });

        it("should escape quotes", () => {
            const mb = new MimeNode();
            expect(mb._convertAddresses([{
                name: '"Vigala Sass"',
                address: "a@b.c"
            }])).to.equal('"\\"Vigala Sass\\"" <a@b.c>');
        });

        it("should mime encode unicode names", () => {
            const mb = new MimeNode();
            expect(mb._convertAddresses([{
                name: '"Jõgeva Sass"',
                address: "a@b.c"
            }])).to.equal("=?UTF-8?Q?=22J=C3=B5geva_Sass=22?= <a@b.c>");
        });
    });

    describe("#_generateMessageId", () => {
        it("should generate uuid-looking message-id", () => {
            const mb = new MimeNode();
            const mid = mb._generateMessageId();
            expect(/^<[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}@.*>/.test(mid)).to.be.true;
        });
    });

    describe("Attachment streaming", () => {
        const port = 10337;
        let server;

        beforeEach((done) => {
            server = http.createServer((req, res) => {
                res.writeHead(200, {
                    "Content-Type": "text/plain"
                });
                const data = new Buffer(new Array(1024 + 1).join("ä"), "utf-8");
                let i = 0;
                const sendByte = function () {
                    if (i >= data.length) {
                        return res.end();
                    }
                    res.write(new Buffer([data[i++]]));
                    setImmediate(sendByte);
                };

                sendByte();
            });

            server.listen(port, done);
        });

        afterEach((done) => {
            server.close(done);
        });

        it("should pipe URL as an attachment", (done) => {
            const mb = new MimeNode("text/plain").
            setContent({
                href: `http://localhost:${port}`
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^=C3=A4/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should reject URL attachment", (done) => {
            const mb = new MimeNode("text/plain", {
                disableUrlAccess: true
            }).
            setContent({
                href: `http://localhost:${port}`
            });

            mb.build((err, msg) => {
                expect(err).to.exist;
                expect(msg).to.not.exist;
                done();
            });
        });

        it("should return an error on invalid url", (done) => {
            const mb = new MimeNode("text/plain").
            setContent({
                href: "http://__should_not_exist:58888"
            });

            mb.build((err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("should pipe file as an attachment", (done) => {
            const mb = new MimeNode("application/octet-stream").
            setContent({
                path: path.resolve(__dirname, "fixtures", "attachment.bin")
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(/^w7VrdmEK$/m.test(msg)).to.be.true;
                done();
            });
        });

        it("should reject file as an attachment", (done) => {
            const mb = new MimeNode("application/octet-stream", {
                disableFileAccess: true
            }).
            setContent({
                path: path.resolve(__dirname, "fixtures", "attachment.bin")
            });

            mb.build((err, msg) => {
                expect(err).to.exist;
                expect(msg).to.not.exist;
                done();
            });
        });

        it("should return an error on invalid file path", (done) => {
            const mb = new MimeNode("text/plain").
            setContent({
                href: "/ASfsdfsdf/Sdgsgdfg/SDFgdfgdfg"
            });

            mb.build((err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("should return a error for an errored stream", (done) => {
            const s = new PassThrough();
            const mb = new MimeNode("text/plain").
            setContent(s);

            s.write("abc");
            s.emit("error", new Error("Stream error"));

            setTimeout(() => {
                mb.build((err) => {
                    expect(err).to.exist;
                    done();
                });
            }, 100);
        });

        it("should return a stream error", (done) => {
            const s = new PassThrough();
            const mb = new MimeNode("text/plain").
            setContent(s);

            mb.build((err) => {
                expect(err).to.exist;
                done();
            });

            s.write("abc");
            setTimeout(() => {
                s.emit("error", new Error("Stream error"));
            }, 100);
        });
    });

    describe("#transform", () => {
        it("should pipe through provided stream", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!");

            const expected = "Content-Type:\ttext/plain\r\n" +
                "Date:\t12345\r\n" +
                "Message-ID:\t<67890>\r\n" +
                "Content-Transfer-Encoding:\t7bit\r\n" +
                "MIME-Version:\t1.0\r\n" +
                "\r\n" +
                "Hello\tworld!\r\n";

            // Transform stream that replaces all spaces with tabs
            const transform = new Transform();
            transform._transform = function (chunk, encoding, done) {
                if (encoding !== "buffer") {
                    chunk = new Buffer(chunk, encoding);
                }
                for (let i = 0, len = chunk.length; i < len; i++) {
                    if (chunk[i] === 0x20) {
                        chunk[i] = 0x09;
                    }
                }
                this.push(chunk);
                done();
            };

            mb.transform(transform);

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });
    });

    describe("#processFunc", () => {
        it("should pipe through provided process function", (done) => {
            const mb = new MimeNode("text/plain").
            setHeader({
                date: "12345",
                "message-id": "67890"
            }).
            setContent("Hello world!");

            const expected = "Content-Type:\ttext/plain\r\n" +
                "Date:\t12345\r\n" +
                "Message-ID:\t<67890>\r\n" +
                "Content-Transfer-Encoding:\t7bit\r\n" +
                "MIME-Version:\t1.0\r\n" +
                "\r\n" +
                "Hello\tworld!\r\n";

            // Transform stream that replaces all spaces with tabs
            const transform = new Transform();
            transform._transform = function (chunk, encoding, done) {
                if (encoding !== "buffer") {
                    chunk = new Buffer(chunk, encoding);
                }
                for (let i = 0, len = chunk.length; i < len; i++) {
                    if (chunk[i] === 0x20) {
                        chunk[i] = 0x09;
                    }
                }
                this.push(chunk);
                done();
            };

            mb.processFunc((input) => {
                setImmediate(() => input.pipe(transform));
                return transform;
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });
    });


    describe("Raw content", () => {
        it("should return pregenerated content", (done) => {
            const expected = new Array(100).join("Test\n");
            const mb = new MimeNode("text/plain").setRaw(expected);

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should return pregenerated content for a child node", (done) => {
            const expected = new Array(100).join("Test\n");
            const mb = new MimeNode("multipart/mixed", {
                baseBoundary: "test"
            }).setHeader({
                date: "12345",
                "message-id": "67890"
            });
            const child = mb.createChild();
            child.setRaw(expected);

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(`${'Content-Type: multipart/mixed; boundary="--_NmP-test-Part_1"\r\n' +
                    "Date: 12345\r\n" +
                    "Message-ID: <67890>\r\n" +
                    "MIME-Version: 1.0\r\n" +
                    "\r\n" +
                    "----_NmP-test-Part_1\r\n"}${
                    expected
                    }\r\n` +
                    "----_NmP-test-Part_1--\r\n");
                done();
            });
        });

        it("should return pregenerated content from a stream", (done) => {
            const expected = new Array(100).join("Test\n");
            const raw = new PassThrough();
            const mb = new MimeNode("text/plain").setRaw(raw);

            setImmediate(() => {
                raw.end(expected);
            });

            mb.build((err, msg) => {
                expect(err).to.not.exist;
                msg = msg.toString();
                expect(msg).to.equal(expected);
                done();
            });
        });

        it("should catch error from a raw stream 1", (done) => {
            const raw = new PassThrough();
            const mb = new MimeNode("text/plain").setRaw(raw);

            raw.emit("error", new Error("Stream error"));

            mb.build((err) => {
                expect(err).to.exist;
                done();
            });
        });

        it("should catch error from a raw stream 2", (done) => {
            const raw = new PassThrough();
            const mb = new MimeNode("text/plain").setRaw(raw);

            mb.build((err) => {
                expect(err).to.exist;
                done();
            });

            setImmediate(() => {
                raw.emit("error", new Error("Stream error"));
            });
        });
    });
});