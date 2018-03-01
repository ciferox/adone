const series = require("async/series");
const parallel = require("async/parallel");

const {
    is,
    stream: { pull },
    datastore: { Key },
    std: { crypto }
} = adone;

const check = (s) => {
    if (is.nil(s)) {
        throw new Error("missing store");
    }
    return s;
};

module.exports = (test) => {
    const cleanup = async (store) => {
        await check(store).close();
        await test.teardown();
    };

    describe("put", () => {
        let store;

        beforeEach(async () => {
            store = await test.setup();
        });

        afterEach(async () => {
            await cleanup(store);
        });

        it("simple", async () => {
            const k = new Key("/z/one");
            await check(store).put(k, Buffer.from("one"));
        });

        it("parallel", async () => {
            const data = [];
            let i;
            for (i = 0; i < 100; i++) {
                data.push([new Key(`/z/key${i}`), Buffer.from(`data${i}`)]);
            }

            i = 0;
            const promises = [];
            for (const d of data) {
                promises.push(check(store).put(d[0], d[1]));
            }

            await Promise.all(promises);

            for (const d of data) {
                const res = await check(store).get(d[0]); // eslint-disable-line
                expect(res).to.be.eql(data[i][1]);
                i++;
            }
        });
    });

    describe("get", () => {
        let store;

        beforeEach(async () => {
            store = await test.setup();
        });

        afterEach(async () => {
            await cleanup(store);
        });

        it("simple", async () => {
            const k = new Key("/z/one");
            await check(store).put(k, Buffer.from("hello"));
            const res = await check(store).get(k);
            expect(res).to.be.eql(Buffer.from("hello"));
        });
    });

    describe("delete", () => {
        let store;

        beforeEach(async () => {
            store = await test.setup();
        });

        afterEach(async () => {
            await cleanup(store);
        });

        it("simple", async () => {
            const k = new Key("/z/one");

            await check(store).put(k, Buffer.from("hello"));

            const res = await check(store).get(k);
            expect(res).to.be.eql(Buffer.from("hello"));

            await check(store).delete(k);

            const exists = await check(store).has(k);
            expect(exists).to.be.eql(false);
        });

        it("parallel", async () => {
            const data = [];
            for (let i = 0; i < 100; i++) {
                data.push([new Key(`/a/key${i}`), Buffer.from(`data${i}`)]);
            }

            const promises = [];
            for (const d of data) {
                promises.push(check(store).put(d[0], d[1]));
            }
            await Promise.all(promises);

            const checkExisting = async (val) => {
                promises.length = 0;
                for (const d of data) {
                    promises.push(check(store).has(d[0]));
                }

                const results = await Promise.all(promises);
                for (const res of results) {
                    expect(res).to.be.eql(val);
                }
            };

            await checkExisting(true);

            promises.length = 0;
            for (const d of data) {
                promises.push(check(store).delete(d[0]));
            }
            await Promise.all(promises);

            await checkExisting(false);
        });
    });

    describe("batch", () => {
        let store;

        beforeEach(async () => {
            store = await test.setup();
        });

        afterEach(async () => {
            await cleanup(store);
        });

        it("simple", async () => {
            const b = check(store).batch();

            await check(store).put(new Key("/z/old"), Buffer.from("old"));

            b.put(new Key("/a/one"), Buffer.from("1"));
            b.put(new Key("/q/two"), Buffer.from("2"));
            b.put(new Key("/q/three"), Buffer.from("3"));
            b.delete(new Key("/z/old"));
            await b.commit();

            const results = [];
            for (const k of ["/a/one", "/q/two", "/q/three", "/z/old"]) {
                results.push(await check(store).has(new Key(k))); // eslint-disable-line
            }

            expect(results).to.be.eql([true, true, true, false]);
        });

        it("many (3 * 400)", async function (done) {
            this.timeout(60 * 1000);
            const b = check(store).batch();
            const count = 400;
            for (let i = 0; i < count; i++) {
                b.put(new Key(`/a/hello${i}`), crypto.randomBytes(32));
                b.put(new Key(`/q/hello${i}`), crypto.randomBytes(64));
                b.put(new Key(`/z/hello${i}`), crypto.randomBytes(128));
            }

            await b.commit();

            series([
                (cb) => parallel([
                    (cb) => check(store).query({ prefix: "/a" }).then((src) => pull(src, pull.collect(cb))),
                    (cb) => check(store).query({ prefix: "/z" }).then((src) => pull(src, pull.collect(cb))),
                    (cb) => check(store).query({ prefix: "/q" }).then((src) => pull(src, pull.collect(cb)))
                ], (err, res) => {
                    assert.notExists(err);
                    expect(res[0]).to.have.length(count);
                    expect(res[1]).to.have.length(count);
                    expect(res[2]).to.have.length(count);
                    cb();
                })
            ], done);
        });
    });

    describe("query", () => {
        let store;
        const hello = { key: new Key("/q/1hello"), value: Buffer.from("1") };
        const world = { key: new Key("/z/2world"), value: Buffer.from("2") };
        const hello2 = { key: new Key("/z/3hello2"), value: Buffer.from("3") };
        const filter1 = (entry, cb) => {
            cb(null, !entry.key.toString().endsWith("hello"));
        };

        const filter2 = (entry, cb) => {
            cb(null, entry.key.toString().endsWith("hello2"));
        };

        const order1 = (res, cb) => {
            cb(null, res.sort((a, b) => {
                if (a.value.toString() < b.value.toString()) {
                    return -1;
                }
                return 1;
            }));
        };

        const order2 = (res, cb) => {
            const out = res.sort((a, b) => {
                if (a.value.toString() < b.value.toString()) {
                    return 1;
                }
                if (a.value.toString() > b.value.toString()) {
                    return -1;
                }
                return 0;
            });

            cb(null, out);
        };

        const tests = [
            ["empty", {}, [hello, world, hello2]],
            ["prefix", { prefix: "/z" }, [world, hello2]],
            ["1 filter", { filters: [filter1] }, [world, hello2]],
            ["2 filters", { filters: [filter1, filter2] }, [hello2]],
            ["limit", { limit: 1 }, 1],
            ["offset", { offset: 1 }, 2],
            ["keysOnly", { keysOnly: true }, [{ key: hello.key }, { key: world.key }, { key: hello2.key }]],
            ["1 order (1)", { orders: [order1] }, [hello, world, hello2]],
            ["1 order (reverse 1)", { orders: [order2] }, [hello2, world, hello]]
        ];

        before(async () => {
            store = await test.setup();
            const b = check(store).batch();

            b.put(hello.key, hello.value);
            b.put(world.key, world.value);
            b.put(hello2.key, hello2.value);

            await b.commit();
        });

        after(async () => {
            await cleanup(store);
        });

        tests.forEach((t) => it(t[0], async (done) => {
            pull(
                await check(store).query(t[1]),
                pull.collect((err, res) => {
                    assert.notExists(err);
                    const expected = t[2];
                    if (is.array(expected)) {
                        if (is.nil(t[1].orders)) {
                            expect(res).to.have.length(expected.length);
                            const s = (a, b) => {
                                if (a.key.toString() < b.key.toString()) {
                                    return 1;
                                }
                                return -1;
                            };
                            res = res.sort(s);
                            const exp = expected.sort(s);

                            res.forEach((r, i) => {
                                expect(r.key.toString()).to.be.eql(exp[i].key.toString());

                                if (is.nil(r.value)) {
                                    assert.notExists(exp[i].value);
                                } else {
                                    expect(r.value.equals(exp[i].value)).to.be.eql(true);
                                }
                            });
                        } else {
                            expect(res).to.be.eql(t[2]);
                        }
                    } else if (is.number(expected)) {
                        expect(res).to.have.length(expected);
                    }
                    done();
                })
            );
        }));
    });

    describe("lifecycle", () => {
        let store;
        before(async () => {
            store = await test.setup();
        });

        after(async () => {
            await cleanup(store);
        });

        it("close and open", async () => {
            await check(store).close();
            await check(store).open();
            await check(store).close();
            await check(store).open();
        });
    });
};
