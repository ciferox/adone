describe("collection", "LRU", () => {
    const { collection: { LRU } } = adone;

    describe("basic", () => {
        it("basic", () => {
            const cache = new LRU({ max: 10 });
            cache.set("key", "value");
            assert.equal(cache.get("key"), "value");
            assert.equal(cache.get("nada"), undefined);
            assert.equal(cache.length, 1);
            assert.equal(cache.max, 10);
        });

        it("least recently set", () => {
            const cache = new LRU(2);
            cache.set("a", "A");
            cache.set("b", "B");
            cache.set("c", "C");
            assert.equal(cache.get("c"), "C");
            assert.equal(cache.get("b"), "B");
            assert.equal(cache.get("a"), undefined);
        });

        it("lru recently gotten", () => {
            const cache = new LRU(2);
            cache.set("a", "A");
            cache.set("b", "B");
            cache.get("a");
            cache.set("c", "C");
            assert.equal(cache.get("c"), "C");
            assert.equal(cache.get("b"), undefined);
            assert.equal(cache.get("a"), "A");
        });

        it("del", () => {
            const cache = new LRU(2);
            cache.set("a", "A");
            cache.del("a");
            assert.equal(cache.get("a"), undefined);
        });

        it("max", () => {
            const cache = new LRU(3);

            // test changing the max, verify that the LRU items get dropped.
            cache.max = 100;
            let i;
            for (i = 0; i < 100; i++) {
                cache.set(i, i);
            }
            assert.equal(cache.length, 100);
            for (i = 0; i < 100; i++) {
                assert.equal(cache.get(i), i);
            }
            cache.max = 3;
            assert.equal(cache.length, 3);
            for (i = 0; i < 97; i++) {
                assert.equal(cache.get(i), undefined);
            }
            for (i = 98; i < 100; i++) {
                assert.equal(cache.get(i), i);
            }

            // now remove the max restriction, and try again.
            cache.max = "hello";
            for (i = 0; i < 100; i++) {
                cache.set(i, i);
            }
            assert.equal(cache.length, 100);
            for (i = 0; i < 100; i++) {
                assert.equal(cache.get(i), i);
            }
            // should trigger an immediate resize
            cache.max = 3;
            assert.equal(cache.length, 3);
            for (i = 0; i < 97; i++) {
                assert.equal(cache.get(i), undefined);
            }
            for (i = 98; i < 100; i++) {
                assert.equal(cache.get(i), i);
            }
        });

        it("reset", () => {
            const cache = new LRU(10);
            cache.set("a", "A");
            cache.set("b", "B");
            cache.reset();
            assert.equal(cache.length, 0);
            assert.equal(cache.max, 10);
            assert.equal(cache.get("a"), undefined);
            assert.equal(cache.get("b"), undefined);
        });

        it("basic with weighed length", () => {
            const cache = new LRU({
                max: 100,
                length(item, key) {
                    assert.typeOf(key, "string");
                    return item.size;
                }
            });
            cache.set("key", { val: "value", size: 50 });
            assert.equal(cache.get("key").val, "value");
            assert.equal(cache.get("nada"), undefined);
            assert.equal(cache.lengthCalculator(cache.get("key"), "key"), 50);
            assert.equal(cache.length, 50);
            assert.equal(cache.max, 100);
        });

        it("weighed length item too large", () => {
            const cache = new LRU({
                max: 10,
                length(item) {
                    return item.size;
                }
            });
            assert.equal(cache.max, 10);

            // should fall out immediately
            cache.set("key", { val: "value", size: 50 });

            assert.equal(cache.length, 0);
            assert.equal(cache.get("key"), undefined);
        });

        it("least recently set with weighed length", () => {
            const cache = new LRU({
                max: 8,
                length(item) {
                    return item.length;
                }
            });
            cache.set("a", "A");
            cache.set("b", "BB");
            cache.set("c", "CCC");
            cache.set("d", "DDDD");
            assert.equal(cache.get("d"), "DDDD");
            assert.equal(cache.get("c"), "CCC");
            assert.equal(cache.get("b"), undefined);
            assert.equal(cache.get("a"), undefined);
        });

        it("lru recently gotten with weighed length", () => {
            const cache = new LRU({
                max: 8,
                length(item) {
                    return item.length;
                }
            });
            cache.set("a", "A");
            cache.set("b", "BB");
            cache.set("c", "CCC");
            cache.get("a");
            cache.get("b");
            cache.set("d", "DDDD");
            assert.equal(cache.get("c"), undefined);
            assert.equal(cache.get("d"), "DDDD");
            assert.equal(cache.get("b"), "BB");
            assert.equal(cache.get("a"), "A");
        });

        it("lru recently updated with weighed length", () => {
            const cache = new LRU({
                max: 8,
                length(item) {
                    return item.length;
                }
            });
            cache.set("a", "A");
            cache.set("b", "BB");
            cache.set("c", "CCC");
            assert.equal(cache.length, 6); // CCC BB A
            cache.set("a", "+A");
            assert.equal(cache.length, 7); // +A CCC BB
            cache.set("b", "++BB");
            assert.equal(cache.length, 6); // ++BB +A
            assert.equal(cache.get("c"), undefined);

            cache.set("c", "oversized");
            assert.equal(cache.length, 6); // ++BB +A
            assert.equal(cache.get("c"), undefined);

            cache.set("a", "oversized");
            assert.equal(cache.length, 4); // ++BB
            assert.equal(cache.get("a"), undefined);
            assert.equal(cache.get("b"), "++BB");
        });

        it("set returns proper booleans", () => {
            const cache = new LRU({
                max: 5,
                length(item) {
                    return item.length;
                }
            });

            assert.equal(cache.set("a", "A"), true);

            // should return false for max exceeded
            assert.equal(cache.set("b", "donuts"), false);

            assert.equal(cache.set("b", "B"), true);
            assert.equal(cache.set("c", "CCCC"), true);
        });

        it("drop the old items", (done) => {
            const cache = new LRU({
                max: 5,
                maxAge: 50
            });

            cache.set("a", "A");

            setTimeout(() => {
                cache.set("b", "b");
                assert.equal(cache.get("a"), "A");
            }, 25);

            setTimeout(() => {
                cache.set("c", "C");
                // timed out
                assert.isNotOk(cache.get("a"));
            }, 60 + 25);

            setTimeout(() => {
                assert.isNotOk(cache.get("b"));
                assert.equal(cache.get("c"), "C");
            }, 90);

            setTimeout(() => {
                assert.isNotOk(cache.get("c"));
                done();
            }, 155);
        });

        it("manual pruning", (done) => {
            const cache = new LRU({
                max: 5,
                maxAge: 50
            });

            cache.set("a", "A");
            cache.set("b", "b");
            cache.set("c", "C");

            setTimeout(() => {
                cache.prune();

                assert.isNotOk(cache.get("a"));
                assert.isNotOk(cache.get("b"));
                assert.isNotOk(cache.get("c"));

                done();
            }, 100);
        });

        it("individual item can have its own maxAge", (done) => {
            const cache = new LRU({
                max: 5,
                maxAge: 50
            });

            cache.set("a", "A", 20);
            setTimeout(() => {
                assert.isNotOk(cache.get("a"));
                done();
            }, 25);
        });

        it("individual item can have its own maxAge > cache", (done) => {
            const cache = new LRU({
                max: 5,
                maxAge: 20
            });

            cache.set("a", "A", 50);
            setTimeout(() => {
                assert.equal(cache.get("a"), "A");
                done();
            }, 25);
        });

        it("disposal function", () => {
            let disposed = false;
            const cache = new LRU({
                max: 1,
                dispose(k, n) {
                    disposed = n;
                }
            });

            cache.set(1, 1);
            cache.set(2, 2);
            assert.equal(disposed, 1);
            cache.set(2, 10);
            assert.equal(disposed, 2);
            cache.set(3, 3);
            assert.equal(disposed, 10);
            cache.reset();
            assert.equal(disposed, 3);
        });

        it("disposal function on too big of item", () => {
            let disposed = false;
            const cache = new LRU({
                max: 1,
                length(k) {
                    return k.length;
                },
                dispose(k, n) {
                    disposed = n;
                }
            });
            const obj = [1, 2];

            assert.equal(disposed, false);
            cache.set("obj", obj);
            assert.equal(disposed, obj);
        });

        it("has()", (done) => {
            const cache = new LRU({
                max: 1,
                maxAge: 10
            });

            cache.set("foo", "bar");
            assert.equal(cache.has("foo"), true);
            cache.set("blu", "baz");
            assert.equal(cache.has("foo"), false);
            assert.equal(cache.has("blu"), true);
            setTimeout(() => {
                assert.equal(cache.has("blu"), false);
                done();
            }, 15);
        });

        it("stale", (done) => {
            const cache = new LRU({
                maxAge: 10,
                stale: true
            });

            assert.equal(cache.allowStale, true);

            cache.set("foo", "bar");
            assert.equal(cache.get("foo"), "bar");
            assert.equal(cache.has("foo"), true);
            setTimeout(() => {
                assert.equal(cache.has("foo"), false);
                assert.equal(cache.get("foo"), "bar");
                assert.equal(cache.get("foo"), undefined);
                done();
            }, 15);
        });

        it("lru update via set", () => {
            const cache = new LRU({ max: 2 });

            cache.set("foo", 1);
            cache.set("bar", 2);
            cache.del("bar");
            cache.set("baz", 3);
            cache.set("qux", 4);

            assert.equal(cache.get("foo"), undefined);
            assert.equal(cache.get("bar"), undefined);
            assert.equal(cache.get("baz"), 3);
            assert.equal(cache.get("qux"), 4);
        });

        it("least recently set w/ peek", () => {
            const cache = new LRU(2);
            cache.set("a", "A");
            cache.set("b", "B");
            assert.equal(cache.peek("a"), "A");
            cache.set("c", "C");
            assert.equal(cache.get("c"), "C");
            assert.equal(cache.get("b"), "B");
            assert.equal(cache.get("a"), undefined);
        });

        it("pop the least used item", () => {
            const cache = new LRU(3);
            let last;

            cache.set("a", "A");
            cache.set("b", "B");
            cache.set("c", "C");

            assert.equal(cache.length, 3);
            assert.equal(cache.max, 3);

            // Ensure we pop a, c, b
            cache.get("b", "B");

            last = cache.pop();
            assert.equal(last.key, "a");
            assert.equal(last.value, "A");
            assert.equal(cache.length, 2);
            assert.equal(cache.max, 3);

            last = cache.pop();
            assert.equal(last.key, "c");
            assert.equal(last.value, "C");
            assert.equal(cache.length, 1);
            assert.equal(cache.max, 3);

            last = cache.pop();
            assert.equal(last.key, "b");
            assert.equal(last.value, "B");
            assert.equal(cache.length, 0);
            assert.equal(cache.max, 3);

            last = cache.pop();
            assert.equal(last, null);
            assert.equal(cache.length, 0);
            assert.equal(cache.max, 3);
        });

        it("get and set only accepts strings and numbers as keys", () => {
            const cache = new LRU();

            cache.set("key", "value");
            cache.set(123, 456);

            assert.equal(cache.get("key"), "value");
            assert.equal(cache.get(123), 456);
        });

        it("peek with wierd keys", () => {
            const cache = new LRU();

            cache.set("key", "value");
            cache.set(123, 456);

            assert.equal(cache.peek("key"), "value");
            assert.equal(cache.peek(123), 456);

            assert.equal(cache.peek({
                toString() {
                    return "key";
                }
            }), undefined);
        });

        it("invalid length calc results in basic length", () => {
            const l = new LRU({ length: true });
            assert.typeOf(l.lengthCalculator, "function");
            l.lengthCalculator = "not a function";
            assert.typeOf(l.lengthCalculator, "function");
        });

        it("change length calculator recalculates", () => {
            const l = new LRU({ max: 3 });
            l.set(2, 2);
            l.set(1, 1);
            l.lengthCalculator = function (key, val) {
                return key + val;
            };
            assert.equal(l.itemCount, 1);
            assert.equal(l.get(2), undefined);
            assert.equal(l.get(1), 1);
            l.set(0, 1);
            assert.equal(l.itemCount, 2);
            l.lengthCalculator = (key) => key;
            assert.equal(l.lengthCalculator(1, 10), 1);
            assert.equal(l.lengthCalculator(10, 1), 10);
            l.lengthCalculator = { not: "a function" };
            assert.equal(l.lengthCalculator(1, 10), 1);
            assert.equal(l.lengthCalculator(10, 1), 1);
        });

        it("delete non-existent item has no effect", () => {
            const l = new LRU({ max: 2 });
            l.set("foo", 1);
            l.set("bar", 2);
            l.del("baz");
            assert.sameMembers(l.dumpLru().toArray().map((hit) => {
                return hit.key;
            }), ["bar", "foo"]);
        });

        it("maxAge on list, cleared in forEach", () => {
            const l = new LRU({ stale: true });
            l.set("foo", 1);

            // hacky.  make it seem older.
            l.dumpLru().head.value.now = Date.now() - 100000;

            // setting maxAge to invalid values does nothing.
            assert.equal(l.maxAge, 0);
            l.maxAge = -100;
            assert.equal(l.maxAge, 0);
            l.maxAge = {};
            assert.equal(l.maxAge, 0);

            l.maxAge = 1;

            let saw = false;
            l.forEach((val, key) => {
                saw = true;
                assert.equal(key, "foo");
            });
            assert.isOk(saw);
            assert.equal(l.length, 0);
        });
    });

    describe("forEach", () => {
        it("forEach", () => {
            const l = new LRU(5);
            let i;
            for (i = 0; i < 10; i++) {
                l.set(i, i.toString(2));
            }

            i = 9;
            l.forEach((val, key, cache) => {
                assert.equal(cache, l);
                assert.equal(key, i);
                assert.equal(val, i.toString(2));
                i -= 1;
            });

            // get in order of most recently used
            l.get(6);
            l.get(8);

            const order = [8, 6, 9, 7, 5];
            i = 0;

            l.forEach((val, key, cache) => {
                const j = order[i++];
                assert.equal(cache, l);
                assert.equal(key, j);
                assert.equal(val, j.toString(2));
            });
            assert.equal(i, order.length);

            i = 0;
            order.reverse();
            l.rforEach((val, key, cache) => {
                const j = order[i++];
                assert.equal(cache, l);
                assert.equal(key, j);
                assert.equal(val, j.toString(2));
            });
            assert.equal(i, order.length);
        });

        it("keys() and values()", () => {
            const l = new LRU(5);
            let i;
            for (i = 0; i < 10; i++) {
                l.set(i, i.toString(2));
            }

            assert.sameMembers(l.keys(), [9, 8, 7, 6, 5]);
            assert.sameMembers(l.values(), ["1001", "1000", "111", "110", "101"]);

            // get in order of most recently used
            l.get(6);
            l.get(8);

            assert.sameMembers(l.keys(), [8, 6, 9, 7, 5]);
            assert.sameMembers(l.values(), ["1000", "110", "1001", "111", "101"]);
        });

        it("all entries are iterated over", () => {
            const l = new LRU(5);
            let i;
            for (i = 0; i < 10; i++) {
                l.set(i.toString(), i.toString(2));
            }

            i = 0;
            l.forEach((val, key, cache) => {
                if (i > 0) {
                    cache.del(key);
                }
                i += 1;
            });

            assert.equal(i, 5);
            assert.equal(l.keys().length, 1);
        });

        it("all stale entries are removed", () => {
            const l = new LRU({ max: 5, maxAge: -5, stale: true });
            let i;
            for (i = 0; i < 10; i++) {
                l.set(i.toString(), i.toString(2));
            }

            i = 0;
            l.forEach(() => {
                i += 1;
            });

            assert.equal(i, 5);
            assert.equal(l.keys().length, 0);
        });

        it("expires", (done) => {
            const l = new LRU({
                max: 10,
                maxAge: 50
            });
            let i;
            for (i = 0; i < 10; i++) {
                l.set(i.toString(), i.toString(2), ((i % 2) ? 25 : undefined));
            }

            i = 0;
            const order = [8, 6, 4, 2, 0];
            setTimeout(() => {
                l.forEach((val, key, cache) => {
                    const j = order[i++];
                    assert.equal(cache, l);
                    assert.equal(key, j.toString());
                    assert.equal(val, j.toString(2));
                });
                assert.equal(i, order.length);

                setTimeout(() => {
                    let count = 0;
                    l.forEach(() => {
                        count++;
                    });
                    assert.equal(0, count);
                    done();
                }, 25);
            }, 26);
        });
    });

    it("inspect", () => {
        const l = new LRU();

        const inspect = (str) => {
            assert.equal(adone.std.util.inspect(l), str);
            assert.equal(l.inspect(), str);
        };

        inspect("LRUCache {}");

        l.max = 10;
        inspect("LRUCache {\n  max: 10\n}");

        l.maxAge = 50;
        inspect("LRUCache {\n  max: 10,\n  maxAge: 50\n}");

        l.set({ foo: "bar" }, "baz");
        inspect("LRUCache {\n  max: 10,\n  maxAge: 50,\n\n  { foo: 'bar' } => { value: 'baz' }\n}");

        l.maxAge = 0;
        l.set(1, { a: { b: { c: { d: { e: { f: {} } } } } } });
        inspect("LRUCache {\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50 }\n}");

        l.allowStale = true;
        inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50 }\n}");

        setTimeout(() => {
            inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } },\n  { foo: 'bar' } => { value: 'baz', maxAge: 50, stale: true }\n}");

            // prune stale items
            l.forEach(() => { });
            inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n\n  1 => { value: { a: { b: [Object] } } }\n}");

            l.lengthCalculator = function () {
                return 5;
            };
            inspect("LRUCache {\n  allowStale: true,\n  max: 10,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}");

            l.max = 0;
            inspect("LRUCache {\n  allowStale: true,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}");

            l.maxAge = 100;
            inspect("LRUCache {\n  allowStale: true,\n  maxAge: 100,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } },\n    maxAge: 0,\n    length: 5,\n    stale: true }\n}");
            l.allowStale = false;
            inspect("LRUCache {\n  maxAge: 100,\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } },\n    maxAge: 0,\n    length: 5,\n    stale: true }\n}");

            l.maxAge = 0;
            inspect("LRUCache {\n  length: 5,\n\n  1 => { value: { a: { b: [Object] } }, length: 5 }\n}");

            l.lengthCalculator = null;
            inspect("LRUCache {\n  1 => { value: { a: { b: [Object] } } }\n}");
        }, 100);
    });

    describe("serialize", () => {
        it("dump", () => {
            const cache = new LRU();

            assert.equal(cache.dump().length, 0, "nothing in dump for empty cache");

            cache.set("a", "A");
            cache.set("b", "B");
            assert.deepEqual(cache.dump(), [
                { k: "b", v: "B", e: 0 },
                { k: "a", v: "A", e: 0 }
            ]);

            cache.set(123, 456);
            assert.deepEqual(cache.dump(), [
                { k: 123, v: 456, e: 0 },
                { k: "b", v: "B", e: 0 },
                { k: "a", v: "A", e: 0 }
            ]);
            cache.del(123);

            cache.set("a", "A");
            assert.deepEqual(cache.dump(), [
                { k: "a", v: "A", e: 0 },
                { k: "b", v: "B", e: 0 }
            ]);

            cache.get("b");
            assert.deepEqual(cache.dump(), [
                { k: "b", v: "B", e: 0 },
                { k: "a", v: "A", e: 0 }
            ]);

            cache.del("a");
            assert.deepEqual(cache.dump(), [
                { k: "b", v: "B", e: 0 }
            ]);
        });

        it("do not dump stale items", (done) => {
            const cache = new LRU({
                max: 5,
                maxAge: 50
            });

            // expires at 50
            cache.set("a", "A");

            setTimeout(() => {
                // expires at 75
                cache.set("b", "B");
                const s = cache.dump();
                assert.equal(s.length, 2);
                assert.equal(s[0].k, "b");
                assert.equal(s[1].k, "a");
            }, 25);

            setTimeout(() => {
                // expires at 110
                cache.set("c", "C");
                const s = cache.dump();
                assert.equal(s.length, 2);
                assert.equal(s[0].k, "c");
                assert.equal(s[1].k, "b");
            }, 60);

            setTimeout(() => {
                // expires at 130
                cache.set("d", "D", 40);
                const s = cache.dump();
                assert.equal(s.length, 2);
                assert.equal(s[0].k, "d");
                assert.equal(s[1].k, "c");
            }, 90);

            setTimeout(() => {
                const s = cache.dump();
                assert.equal(s.length, 1);
                assert.equal(s[0].k, "d");
            }, 120);

            setTimeout(() => {
                const s = cache.dump();
                assert.deepEqual(s, []);
                done();
            }, 155);
        });

        it("load basic cache", () => {
            const cache = new LRU();
            const copy = new LRU();

            cache.set("a", "A");
            cache.set("b", "B");
            cache.set(123, 456);

            copy.load(cache.dump());
            assert.deepEqual(cache.dump(), copy.dump());
        });

        it("load staled cache", (done) => {
            const cache = new LRU({ maxAge: 500 });
            const copy = new LRU({ maxAge: 500 });
            let arr;

            // expires at 500
            cache.set("a", "A");
            setTimeout(() => {
                // expires at 800
                cache.set("b", "B");
                arr = cache.dump();
                assert.equal(arr.length, 2);
            }, 300);

            setTimeout(() => {
                copy.load(arr);
                assert.equal(copy.get("a"), undefined);
                assert.equal(copy.get("b"), "B");
            }, 600);

            setTimeout(() => {
                assert.equal(copy.get("b"), undefined);
                done();
            }, 900);
        });

        it("load to other size cache", () => {
            const cache = new LRU({ max: 2 });
            const copy = new LRU({ max: 1 });

            cache.set("a", "A");
            cache.set("b", "B");

            copy.load(cache.dump());
            assert.equal(copy.get("a"), undefined);
            assert.equal(copy.get("b"), "B");

            // update the last read from original cache
            cache.get("a");
            copy.load(cache.dump());
            assert.equal(copy.get("a"), "A");
            assert.equal(copy.get("b"), undefined);
        });

        it("load to other age cache", (done) => {
            const cache = new LRU({ maxAge: 250 });
            const aged = new LRU({ maxAge: 500 });
            const simple = new LRU();
            let arr;

            // created at 0
            // a would be valid till 0 + 250
            cache.set("a", "A");
            setTimeout(() => {
                // created at 20
                // b would be valid till 100 + 250
                cache.set("b", "B");
                // b would be valid till 100 + 350
                cache.set("c", "C", 350);
                arr = cache.dump();
                assert.equal(arr.length, 3);
            }, 100);

            setTimeout(() => {
                assert.equal(cache.get("a"), undefined);
                assert.equal(cache.get("b"), "B");
                assert.equal(cache.get("c"), "C");

                aged.load(arr);
                assert.equal(aged.get("a"), undefined);
                assert.equal(aged.get("b"), "B");
                assert.equal(aged.get("c"), "C");

                simple.load(arr);
                assert.equal(simple.get("a"), undefined);
                assert.equal(simple.get("b"), "B");
                assert.equal(simple.get("c"), "C");
            }, 300);

            setTimeout(() => {
                assert.equal(cache.get("a"), undefined);
                assert.equal(cache.get("b"), undefined);
                assert.equal(cache.get("c"), "C");

                aged.load(arr);
                assert.equal(aged.get("a"), undefined);
                assert.equal(aged.get("b"), undefined);
                assert.equal(aged.get("c"), "C");

                simple.load(arr);
                assert.equal(simple.get("a"), undefined);
                assert.equal(simple.get("b"), undefined);
                assert.equal(simple.get("c"), "C");
            }, 400);

            setTimeout(() => {
                assert.equal(cache.get("a"), undefined);
                assert.equal(cache.get("b"), undefined);
                assert.equal(cache.get("c"), undefined);

                aged.load(arr);
                assert.equal(aged.get("a"), undefined);
                assert.equal(aged.get("b"), undefined);
                assert.equal(aged.get("c"), undefined);

                simple.load(arr);
                assert.equal(simple.get("a"), undefined);
                assert.equal(simple.get("b"), undefined);
                assert.equal(simple.get("c"), undefined);
                done();
            }, 500);
        });

        it("dumpLru", () => {
            const l = new LRU();
            assert.instanceOf(l.dumpLru(), adone.collection.LinkedList);
        });
    });
});
