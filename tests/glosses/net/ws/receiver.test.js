const crypto = adone.std.crypto;
const PerMessageDeflate = adone.net.ws.PerMessageDeflate;
const Receiver = adone.net.ws.Receiver;
const util = require("./hybi-util");

describe("Receiver", () => {
    it("can parse unmasked text message", (done) => {
        const p = new Receiver();

        p.ontext = function (data) {
            assert.strictEqual(data, "Hello");
            done();
        };

        p.add(Buffer.from("810548656c6c6f", "hex"));
    });

    it("can parse close message", (done) => {
        const p = new Receiver();

        p.onclose = function (code, data) {
            assert.strictEqual(code, 1000);
            assert.strictEqual(data, "");
            done();
        };

        p.add(Buffer.from("8800", "hex"));
    });

    it("can parse masked text message", (done) => {
        const p = new Receiver();

        p.ontext = function (data) {
            assert.strictEqual(data, "5:::{\"name\":\"echo\"}");
            done();
        };

        p.add(Buffer.from("81933483a86801b992524fa1c60959e68a5216e6cb005ba1d5", "hex"));
    });

    it("can parse a masked text message longer than 125 B", (done) => {
        const p = new Receiver();
        const msg = "A".repeat(200);

        const mask = "3483a868";
        const frame = `81FE${util.pack(4, msg.length)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.ontext = function (data) {
            assert.strictEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a really long masked text message", (done) => {
        const p = new Receiver();
        const msg = "A".repeat(64 * 1024);

        const mask = "3483a868";
        const frame = `81FF${util.pack(16, msg.length)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.ontext = function (data) {
            assert.strictEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a fragmented masked text message of 300 B", (done) => {
        const p = new Receiver();
        const msg = "A".repeat(300);

        const fragment1 = msg.substr(0, 150);
        const fragment2 = msg.substr(150);

        const mask = "3483a868";
        const frame1 = `01FE${util.pack(4, fragment1.length)}${mask
            }${util.mask(fragment1, mask).toString("hex")}`;
        const frame2 = `80FE${util.pack(4, fragment2.length)}${mask
            }${util.mask(fragment2, mask).toString("hex")}`;

        p.ontext = function (data) {
            assert.strictEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame1, "hex"));
        p.add(Buffer.from(frame2, "hex"));
    });

    it("can parse a ping message", (done) => {
        const p = new Receiver();
        const msg = "Hello";

        const mask = "3483a868";
        const frame = `89${util.getHybiLengthAsHexString(msg.length, true)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.onping = function (data) {
            assert.strictEqual(data.toString(), msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a ping with no data", (done) => {
        const p = new Receiver();

        p.onping = function (data) {
            assert.strictEqual(data, null);
            done();
        };

        p.add(Buffer.from("8900", "hex"));
    });

    it("can parse a fragmented masked text message of 300 B with a ping in the middle (1/2)", (done) => {
        const p = new Receiver();
        const msg = "A".repeat(300);
        const pingMessage = "Hello";

        const fragment1 = msg.substr(0, 150);
        const fragment2 = msg.substr(150);

        const mask = "3483a868";
        const frame1 = `01FE${util.pack(4, fragment1.length)}${mask
            }${util.mask(fragment1, mask).toString("hex")}`;
        const frame2 = `89${util.getHybiLengthAsHexString(pingMessage.length, true)}${mask
            }${util.mask(pingMessage, mask).toString("hex")}`;
        const frame3 = `80FE${util.pack(4, fragment2.length)}${mask
            }${util.mask(fragment2, mask).toString("hex")}`;

        let gotPing = false;

        p.ontext = function (data) {
            assert.strictEqual(data, msg);
            assert.ok(gotPing);
            done();
        };
        p.onping = function (data) {
            gotPing = true;
            assert.strictEqual(data.toString(), pingMessage);
        };

        p.add(Buffer.from(frame1, "hex"));
        p.add(Buffer.from(frame2, "hex"));
        p.add(Buffer.from(frame3, "hex"));
    });

    it("can parse a fragmented masked text message of 300 B with a ping in the middle (2/2)", (done) => {
        const p = new Receiver();
        const msg = "A".repeat(300);
        const pingMessage = "Hello";

        const fragment1 = msg.substr(0, 150);
        const fragment2 = msg.substr(150);

        const mask = "3483a868";
        const frame1 = `01FE${util.pack(4, fragment1.length)}${mask
            }${util.mask(fragment1, mask).toString("hex")}`;
        const frame2 = `89${util.getHybiLengthAsHexString(pingMessage.length, true)}${mask
            }${util.mask(pingMessage, mask).toString("hex")}`;
        const frame3 = `80FE${util.pack(4, fragment2.length)}${mask
            }${util.mask(fragment2, mask).toString("hex")}`;

        let buffers = [];

        buffers = buffers.concat(util.splitBuffer(Buffer.from(frame1, "hex")));
        buffers = buffers.concat(util.splitBuffer(Buffer.from(frame2, "hex")));
        buffers = buffers.concat(util.splitBuffer(Buffer.from(frame3, "hex")));

        let gotPing = false;

        p.ontext = function (data) {
            assert.strictEqual(data, msg);
            assert.ok(gotPing);
            done();
        };
        p.onping = function (data) {
            gotPing = true;
            assert.strictEqual(data.toString(), pingMessage);
        };

        for (let i = 0; i < buffers.length; ++i) {
            p.add(buffers[i]);
        }
    });

    it("can parse a 100 B long masked binary message", (done) => {
        const p = new Receiver();
        const msg = crypto.randomBytes(100);

        const mask = "3483a868";
        const frame = `82${util.getHybiLengthAsHexString(msg.length, true)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.onbinary = function (data) {
            assert.deepEqual(data.toString("hex"), msg.toString("hex"));
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a 256 B long masked binary message", (done) => {
        const p = new Receiver();
        const msg = crypto.randomBytes(256);

        const mask = "3483a868";
        const frame = `82${util.getHybiLengthAsHexString(msg.length, true)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.onbinary = function (data) {
            assert.deepEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a 200 KiB long masked binary message", (done) => {
        const p = new Receiver();
        const msg = crypto.randomBytes(200 * 1024);

        const mask = "3483a868";
        const frame = `82${util.getHybiLengthAsHexString(msg.length, true)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.onbinary = function (data) {
            assert.deepEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse a 200 KiB long unmasked binary message", (done) => {
        const p = new Receiver();
        const msg = crypto.randomBytes(200 * 1024);

        const frame = `82${util.getHybiLengthAsHexString(msg.length, false)
            }${msg.toString("hex")}`;

        p.onbinary = function (data) {
            assert.deepEqual(data, msg);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("can parse compressed message", (done) => {
        const perMessageDeflate = new PerMessageDeflate();
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate });
        const buf = Buffer.from("Hello");

        p.ontext = function (data) {
            assert.strictEqual(data, "Hello");
            done();
        };

        perMessageDeflate.compress(buf, true, (err, compressed) => {
            if (err) {
                return done(err);
            }

            p.add(Buffer.from([0xc1, compressed.length]));
            p.add(compressed);
        });
    });

    it("can parse compressed fragments", (done) => {
        const perMessageDeflate = new PerMessageDeflate();
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate });
        const buf1 = Buffer.from("foo");
        const buf2 = Buffer.from("bar");

        p.ontext = function (data) {
            assert.strictEqual(data, "foobar");
            done();
        };

        perMessageDeflate.compress(buf1, false, (err, compressed1) => {
            if (err) {
                return done(err);
            }

            p.add(Buffer.from([0x41, compressed1.length]));
            p.add(compressed1);

            perMessageDeflate.compress(buf2, true, (err, compressed2) => {
                if (err) {
                    return done(err);
                }

                p.add(Buffer.from([0x80, compressed2.length]));
                p.add(compressed2);
            });
        });
    });

    it("resets `currentPayloadLength` only on final frame (unfragmented)", () => {
        const p = new Receiver({}, 10);

        assert.strictEqual(p.currentPayloadLength, 0);
        p.add(Buffer.from("810548656c6c6f", "hex"));
        assert.strictEqual(p.currentPayloadLength, 0);
    });

    it("resets `currentPayloadLength` only on final frame (fragmented)", () => {
        const p = new Receiver({}, 10);

        const frame1 = "01024865";
        const frame2 = "80036c6c6f";

        assert.strictEqual(p.currentPayloadLength, 0);
        p.add(Buffer.from(frame1, "hex"));
        assert.strictEqual(p.currentPayloadLength, 2);
        p.add(Buffer.from(frame2, "hex"));
        assert.strictEqual(p.currentPayloadLength, 0);
    });

    it("resets `currentPayloadLength` only on final frame (fragmented + ping)", () => {
        const p = new Receiver({}, 10);

        const frame1 = "01024865";
        const frame2 = "8900";
        const frame3 = "80036c6c6f";

        assert.strictEqual(p.currentPayloadLength, 0);
        p.add(Buffer.from(frame1, "hex"));
        assert.strictEqual(p.currentPayloadLength, 2);
        p.add(Buffer.from(frame2, "hex"));
        assert.strictEqual(p.currentPayloadLength, 2);
        p.add(Buffer.from(frame3, "hex"));
        assert.strictEqual(p.currentPayloadLength, 0);
    });

    it("will raise an error on a 200 KiB long masked binary message when maxpayload is 20 KiB", (done) => {
        const p = new Receiver({}, 20 * 1024);
        const msg = crypto.randomBytes(200 * 1024);

        const mask = "3483a868";
        const frame = `82${util.getHybiLengthAsHexString(msg.length, true)}${mask
            }${util.mask(msg, mask).toString("hex")}`;

        p.error = function (reason, code) {
            assert.strictEqual(code, 1009);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("will raise an error on a 200 KiB long unmasked binary message when maxpayload is 20 KiB", (done) => {
        const p = new Receiver({}, 20 * 1024);
        const msg = crypto.randomBytes(200 * 1024);

        const frame = `82${util.getHybiLengthAsHexString(msg.length, false)
            }${msg.toString("hex")}`;

        p.error = function (reason, code) {
            assert.strictEqual(code, 1009);
            done();
        };

        p.add(Buffer.from(frame, "hex"));
    });

    it("will raise an error on a compressed message that exceeds maxpayload of 3 B", (done) => {
        const perMessageDeflate = new PerMessageDeflate({}, false, 3);
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate }, 3);
        const buf = Buffer.from("Hellooooooooooooooooooooooooooooooooooooooo");

        p.onerror = function (reason, code) {
            assert.strictEqual(code, 1009);
            done();
        };

        perMessageDeflate.compress(buf, true, (err, compressed) => {
            if (err) {
                return done(err);
            }

            p.add(Buffer.from([0xc1, compressed.length]));
            p.add(compressed);
        });
    });

    it("will raise an error on a compressed fragment that exceeds maxpayload of 2 B", (done) => {
        const perMessageDeflate = new PerMessageDeflate({}, false, 2);
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate }, 2);
        const buf1 = Buffer.from("foooooooooooooooooooooooooooooooooooooooooooooo");
        const buf2 = Buffer.from("baaaarrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

        p.onerror = function (reason, code) {
            assert.strictEqual(code, 1009);
            done();
        };

        perMessageDeflate.compress(buf1, false, (err, compressed1) => {
            if (err) {
                return done(err);
            }

            p.add(Buffer.from([0x41, compressed1.length]));
            p.add(compressed1);

            perMessageDeflate.compress(buf2, true, (err, compressed2) => {
                if (err) {
                    return done(err);
                }

                p.add(Buffer.from([0x80, compressed2.length]));
                p.add(compressed2);
            });
        });
    });

    it("will not crash if another message is received after receiving a message that exceeds maxpayload", (done) => {
        const perMessageDeflate = new PerMessageDeflate({}, false, 2);
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate }, 2);
        const buf1 = Buffer.from("foooooooooooooooooooooooooooooooooooooooooooooo");
        const buf2 = Buffer.from("baaaarrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");

        let gotError = false;

        p.onerror = function (reason, code) {
            gotError = true;
            assert.strictEqual(code, 1009);
        };

        perMessageDeflate.compress(buf1, false, (err, compressed1) => {
            if (err) {
                return done(err);
            }

            p.add(Buffer.from([0x41, compressed1.length]));
            p.add(compressed1);

            assert.ok(gotError);
            assert.strictEqual(p.onerror, null);

            perMessageDeflate.compress(buf2, true, (err, compressed2) => {
                if (err) {
                    return done(err);
                }

                p.add(Buffer.from([0x80, compressed2.length]));
                p.add(compressed2);
                done();
            });
        });
    });

    it("can cleanup when consuming data", (done) => {
        const perMessageDeflate = new PerMessageDeflate();
        perMessageDeflate.accept([{}]);

        const p = new Receiver({ "permessage-deflate": perMessageDeflate });
        const buf = Buffer.from("Hello");

        perMessageDeflate.compress(buf, true, (err, compressed) => {
            if (err) {
                return done(err);
            }

            const data = Buffer.concat([Buffer.from([0xc1, compressed.length]), compressed]);
            p.add(data);
            p.add(data);
            p.add(data);
            p.cleanup();
            setTimeout(done, 1000);
        });
    });
});
