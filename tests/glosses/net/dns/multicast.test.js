const {
    net: { dns: { multicast } },
    std: { dgram }
} = adone;

describe("dns", "multicast", () => {
    const port = function (cb) {
        const s = dgram.createSocket("udp4");
        s.bind(0, () => {
            const port = s.address().port;
            s.on("close", () => {
                cb(port);
            });
            s.close();
        });
    };

    const configs = [
        { ip: "127.0.0.1", multicast: false }
        // {'interface': '127.0.0.1', multicast: true}
    ];

    const tests = configs.map((config) => {
        return function (name, fn) {
            it(name, (done) => {
                port((p) => {
                    config.port = p;
                    const dns = multicast(config);
                    dns.on("warning", (e) => {
                        assert.error(e);
                    });
                    fn(dns, done);
                });
            });
        };
    });

    tests.forEach((test) => {
        test("works", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.type, "query");
                dns.destroy(() => {
                    assert.ok(true, "destroys");
                    done();
                });
            });

            dns.query("hello-world", () => {
                assert.ok(true, "flushed");
            });
        });

        test("ANY query", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 1, "one question");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "ANY", class: 1 });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("hello-world", "ANY");
        });

        test("A record", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 1, "one question");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "A", class: 1 });
                dns.respond([{ type: "A", name: "hello-world", ttl: 120, data: "127.0.0.1" }]);
            });

            dns.once("response", (packet) => {
                assert.equal(packet.answers.length, 1, "one answer");
                assert.deepEqual(packet.answers[0], { type: "A", name: "hello-world", ttl: 120, data: "127.0.0.1", class: 1, flush: false });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("hello-world", "A");
        });

        test("A record (two questions)", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 2, "two questions");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "A", class: 1 });
                assert.deepEqual(packet.questions[1], { name: "hej.verden", type: "A", class: 1 });
                dns.respond([{ type: "A", name: "hello-world", ttl: 120, data: "127.0.0.1" }, {
                    type: "A",
                    name: "hej.verden",
                    ttl: 120,
                    data: "127.0.0.2"
                }]);
            });

            dns.once("response", (packet) => {
                assert.equal(packet.answers.length, 2, "one answers");
                assert.deepEqual(packet.answers[0], { type: "A", name: "hello-world", ttl: 120, data: "127.0.0.1", class: 1, flush: false });
                assert.deepEqual(packet.answers[1], { type: "A", name: "hej.verden", ttl: 120, data: "127.0.0.2", class: 1, flush: false });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query([{ name: "hello-world", type: "A" }, { name: "hej.verden", type: "A" }]);
        });

        test("AAAA record", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 1, "one question");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "AAAA", class: 1 });
                dns.respond([{ type: "AAAA", name: "hello-world", ttl: 120, data: "fe80::5ef9:38ff:fe8c:ceaa" }]);
            });

            dns.once("response", (packet) => {
                assert.equal(packet.answers.length, 1, "one answer");
                assert.deepEqual(packet.answers[0], {
                    type: "AAAA",
                    name: "hello-world",
                    ttl: 120,
                    data: "fe80::5ef9:38ff:fe8c:ceaa",
                    class: 1,
                    flush: false
                });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("hello-world", "AAAA");
        });

        test("SRV record", (dns, done) => {
            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 1, "one question");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "SRV", class: 1 });
                dns.respond([{
                    type: "SRV",
                    name: "hello-world",
                    ttl: 120,
                    data: { port: 11111, target: "hello.world.com", priority: 10, weight: 12 }
                }]);
            });

            dns.once("response", (packet) => {
                assert.equal(packet.answers.length, 1, "one answer");
                assert.deepEqual(packet.answers[0], {
                    type: "SRV",
                    name: "hello-world",
                    ttl: 120,
                    data: { port: 11111, target: "hello.world.com", priority: 10, weight: 12 },
                    class: 1,
                    flush: false
                });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("hello-world", "SRV");
        });

        test("TXT record", (dns, done) => {
            const data = Buffer.from("black box");

            dns.once("query", (packet) => {
                assert.equal(packet.questions.length, 1, "one question");
                assert.deepEqual(packet.questions[0], { name: "hello-world", type: "TXT", class: 1 });
                dns.respond([{ type: "TXT", name: "hello-world", ttl: 120, data }]);
            });

            dns.once("response", (packet) => {
                assert.equal(packet.answers.length, 1, "one answer");
                assert.deepEqual(packet.answers[0], { type: "TXT", name: "hello-world", ttl: 120, data, class: 1, flush: false });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("hello-world", "TXT");
        });

        test("QU question bit", (dns, done) => {
            dns.once("query", (packet) => {
                assert.deepEqual(packet.questions, [
                    { type: "A", name: "foo", class: 1 },
                    { type: "A", name: "bar", class: 1 }
                ]);
                dns.destroy(() => {
                    done();
                });
            });

            dns.query([
                { type: "A", name: "foo", class: 32769 },
                { type: "A", name: "bar", class: 1 }
            ]);
        });

        test("cache flush bit", (dns, done) => {
            dns.once("query", (packet) => {
                dns.respond({
                    answers: [
                        { type: "A", name: "foo", ttl: 120, data: "127.0.0.1", class: 1, flush: true },
                        { type: "A", name: "foo", ttl: 120, data: "127.0.0.2", class: 1, flush: false }
                    ],
                    additionals: [
                        { type: "A", name: "foo", ttl: 120, data: "127.0.0.3", class: 1, flush: true }
                    ]
                });
            });

            dns.once("response", (packet) => {
                assert.deepEqual(packet.answers, [
                    { type: "A", name: "foo", ttl: 120, data: "127.0.0.1", class: 1, flush: true },
                    { type: "A", name: "foo", ttl: 120, data: "127.0.0.2", class: 1, flush: false }
                ]);
                assert.deepEqual(packet.additionals[0], { type: "A", name: "foo", ttl: 120, data: "127.0.0.3", class: 1, flush: true });
                dns.destroy(() => {
                    done();
                });
            });

            dns.query("foo", "A");
        });
    });
});
