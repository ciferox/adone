const through2 = require("through2");

const {
    is,
    database: { level: { streamFromIterator, backend: { LevelDB } } },
    std: { path }
} = adone;

describe("streamFromIterator", () => {
    let db;
    const data = [
        { type: "put", key: "foobatch1", value: "bar1" },
        { type: "put", key: "foobatch2", value: "bar2" },
        { type: "put", key: "foobatch3", value: "bar3" }
    ];

    const monitor = function (iterator, stream, onClose) {
        const order = [];
        ["_next", "_end"].forEach((method) => {
            const original = iterator[method];

            iterator[method] = function () {
                order.push(method);
                original.apply(this, arguments);
            };
        });
        ["data", "end", "error", "close"].forEach((event) => {
            stream.on(event, (err) => {
                if (event === "error") {
                    order.push(`error: ${err.message}`);
                } else {
                    order.push(event);
                }
            });
        });

        if (onClose) {
            stream.on("close", onClose);
        }

        return order;
    };

    const withoutDataEvents = (event) => event !== "_next" && event !== "data";


    it("setup", (done) => {
        db = new LevelDB(path.join(__dirname, "db-test"));
        db.open((err) => {
            assert.notExists(err, "no error");
            db.batch(data, (err) => {
                assert.notExists(err, "no error");
                done();
            });
        });
    });

    it("keys and values", (done) => {
        let idx = 0;
        const stream = streamFromIterator(db.iterator());
        stream.pipe(through2.obj((kv, _, done) => {
            assert.ok(is.buffer(kv.key));
            assert.ok(is.buffer(kv.value));
            assert.equal(kv.key.toString(), data[idx].key);
            assert.equal(kv.value.toString(), data[idx].value);
            idx++;
            done();
        }, () => {
            assert.equal(idx, data.length);
            stream.on("close", () => {
                done();
            });
        }));
    });

    it("normal event order", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order.filter(withoutDataEvents), ["_end", "end", "close"]);
            done();
        });
    });

    it("error from iterator.next", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "error: next", "close"], "event order");
            done();
        });

        iterator.next = function (cb) {
            process.nextTick(cb, new Error("next"));
        };
    });

    it("error from iterator end", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);
        const _end = iterator._end;

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order.filter(withoutDataEvents), ["_end", "end", "error: end", "close"]);
            done();
        });

        iterator._end = function (cb) {
            order.push("_end");
            _end.call(this, (err) => {
                assert.notExists(err);
                cb(new Error("end"));
            });
        };
    });

    it(".destroy", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "close"]);
            done();
        });

        stream.destroy();
    });

    it(".destroy(err)", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "error: user", "close"]);
            done();
        });

        stream.destroy(new Error("user"));
    });

    it(".destroy(err, callback)", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "callback", "close"]);
            done();
        });

        stream.destroy(new Error("user"), (err) => {
            order.push("callback");
            assert.equal(err.message, "user", "got error");
        });
    });

    it(".destroy(null, callback)", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "callback", "close"]);
            done();
        });

        stream.destroy(null, (err) => {
            order.push("callback");
            assert.notExists(err, "no error");
        });
    });

    it(".destroy() during iterator.next", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "close"], "event order");
            done();
        });

        iterator.next = function () {
            stream.destroy();
        };
    });

    it(".destroy(err) during iterator.next", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "error: user", "close"], "event order");
            done();
        });

        iterator.next = function (cb) {
            stream.destroy(new Error("user"));
        };
    });

    it(".destroy(err, callback) during iterator.next", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "callback", "close"], "event order");
            done();
        });

        iterator.next = function (cb) {
            stream.destroy(new Error("user"), (err) => {
                order.push("callback");
                assert.equal(err.message, "user", "got error");
            });
        };
    });

    it(".destroy(null, callback) during iterator.next", (done) => {
        const iterator = db.iterator();
        const stream = streamFromIterator(iterator);

        const order = monitor(iterator, stream, () => {
            assert.sameMembers(order, ["_end", "callback", "close"], "event order");
            done();
        });

        iterator.next = function (cb) {
            stream.destroy(null, (err) => {
                order.push("callback");
                assert.notExists(err, "no error");
            });
        };
    });

    it(".destroy during iterator.next 1", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        let stream;
        const iterator = db.iterator();
        const next = iterator.next.bind(iterator);
        iterator.next = function (cb) {
            done();
            next(cb);
            stream.destroy();
        };
        stream = streamFromIterator(iterator);
        stream.on("data", (data) => {
            assert.fail("should not be called");
        });
        stream.on("close", () => done());
    });

    it(".destroy during iterator.next 2", (dn) => {
        let stream;
        const iterator = db.iterator();
        const next = iterator.next.bind(iterator);
        let count = 0;

        let counter = 0;
        const done = () => {
            if (++counter === 3) {
                dn();
            }
        };

        iterator.next = function (cb) {
            done();
            next(cb);
            if (++count === 2) {
                stream.destroy();
            }
        };
        stream = streamFromIterator(iterator);
        stream.on("data", (data) => {
            done();
        });
        stream.on("close", () => done());
    });

    it(".destroy after iterator.next 1", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        let stream;
        const iterator = db.iterator();
        const next = iterator.next.bind(iterator);
        iterator.next = function (cb) {
            next((err, key, value) => {
                stream.destroy();
                cb(err, key, value);
                done();
            });
        };
        stream = streamFromIterator(iterator);
        stream.on("data", (data) => {
            assert.fail("should not be called");
        });
        stream.on("close", () => done());
    });

    it(".destroy after iterator.next 2", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 3) {
                dn();
            }
        };

        let stream;
        const iterator = db.iterator();
        const next = iterator.next.bind(iterator);
        let count = 0;
        iterator.next = function (cb) {
            next((err, key, value) => {
                if (++count === 2) {
                    stream.destroy();
                }
                cb(err, key, value);
                done();
            });
        };
        stream = streamFromIterator(iterator);
        stream.on("data", (data) => {
            done();
        });
        stream.on("close", () => done());
    });

    it("keys=false", (done) => {
        const stream = streamFromIterator(db.iterator(), { keys: false });
        stream.once("data", (value) => {
            stream.destroy();
            assert.equal(value.toString(), "bar1");
            done();
        });
    });

    it("values=false", (done) => {
        const stream = streamFromIterator(db.iterator(), { values: false });
        stream.once("data", (key) => {
            stream.destroy();
            assert.equal(key.toString(), "foobatch1");
            done();
        });
    });
});
