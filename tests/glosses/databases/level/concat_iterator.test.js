const {
    database: { level: { concatIterator } }
} = adone;

describe("concatIterator", () => {
    it("calls back with error if iterator.next errors", () => {
        const iterator = {
            next(cb) {
                process.nextTick(cb, new Error("iterator.next"));
            },
            end(cb) {
                process.nextTick(cb);
            }
        };

        concatIterator(iterator, (err) => {
            assert.equal(err.message, "iterator.next", "correct error");
        });
    });

    it("happy path calls back with an array", () => {
        let i = 0;
        const data = [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" }
        ];

        const iterator = {
            next(cb) {
                if (i < data.length) {
                    process.nextTick(cb, null, data[i].key, data[i].value);
                    ++i;
                } else {
                    process.nextTick(cb);
                }
            },
            end(cb) {
                process.nextTick(cb);
            }
        };

        concatIterator(iterator, (err, result) => {
            assert.notExists(err, "no error");
            assert.deepEqual(result, data);
        });
    });

    it("calls back with error and data if iterator.end errors", () => {
        let i = 0;
        const data = [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" }
        ];

        const iterator = {
            next(cb) {
                if (i < data.length) {
                    process.nextTick(cb, null, data[i].key, data[i].value);
                    ++i;
                } else {
                    process.nextTick(cb);
                }
            },
            end(cb) {
                process.nextTick(cb, new Error("iterator.end"));
            }
        };

        concatIterator(iterator, (err, result) => {
            assert.equal(err.message, "iterator.end", "correct error");
            assert.deepEqual(result, data);
        });
    });

    it("calls back with error and partial data if iterator.end errors", () => {
        let i = 0;
        const data = [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" }
        ];

        const iterator = {
            next(cb) {
                if (i === 0) {
                    process.nextTick(cb, null, data[i].key, data[i].value);
                    i++;
                } else {
                    process.nextTick(cb);
                }
            },
            end(cb) {
                process.nextTick(cb, new Error("foo"));
            }
        };

        concatIterator(iterator, (err, result) => {
            assert.equal(err.message, "foo", "correct error");
            assert.deepEqual(result, [].concat(data[0]));
        });
    });
});
