import { getCollection, dropCollection } from "./support";

describe("database", "mongo", "QueryBuilder", () => {
    const { database: { mongo }, is, promise } = adone;

    const { buildQuery } = mongo;

    let col;

    before(async () => {
        // get the env specific collection interface
        col = await getCollection();
    });

    after(async () => {
        await dropCollection();
    });

    const noDistinct = (type) => {
        it("cannot be used with distinct()", async () => {
            await assert.throws(async () => {
                await buildQuery().distinct("name")[type](4);
            }, new RegExp(`${type} cannot be used with distinct`));
        });
    };

    const no = (method, type) => {
        it(`cannot be used with ${method}()`, async () => {
            await assert.throws(async () => {
                await buildQuery()[method]()[type](4);
            }, new RegExp(`${type} cannot be used with ${method}`));
        });
    };

    describe("defaults", () => {
        it("are set", () => {
            const m = buildQuery();
            assert.strictEqual(undefined, m.op);
            assert.deepEqual({}, m.options);
        });
    });

    describe("criteria", () => {
        it("if collection-like is used as collection", () => {
            const m = buildQuery(col);
            assert.equal(col, m._collection.collection);
        });
        it("non-collection-like is used as criteria", () => {
            const m = buildQuery({ works: true });
            assert.ok(!m._collection);
            assert.deepEqual({ works: true }, m._conditions);
        });
    });
    describe("options", () => {
        it("are merged when passed", () => {
            let m = buildQuery(col, { safe: true });
            assert.deepEqual({ safe: true }, m.options);
            m = buildQuery({ name: "mquery" }, { safe: true });
            assert.deepEqual({ safe: true }, m.options);
        });
    });

    describe("toConstructor", () => {
        it("creates subclasses of mquery", () => {
            const opts = { safe: { w: "majority" }, readPreference: "p" };
            const match = { name: "test", count: { $gt: 101 } };
            const select = { name: 1, count: 0 };
            const update = { $set: { x: true } };
            const path = "street";

            const q = buildQuery().setOptions(opts);
            q.where(match);
            q.select(select);
            q.update(update);
            q.where(path);
            q.find();

            const M = q.toConstructor();
            const m = new M();

            assert.ok(m instanceof mongo.QueryBuilder);
            assert.deepEqual(opts, m.options);
            assert.deepEqual(match, m._conditions);
            assert.deepEqual(select, m._fields);
            assert.deepEqual(update, m._update);
            assert.equal(path, m._path);
            assert.equal("find", m.op);
        });
    });

    describe("setOptions", () => {
        it("calls associated methods", () => {
            const m = buildQuery();
            assert.equal(m._collection, null);
            m.setOptions({ collection: col });
            assert.equal(m._collection.collection, col);
        });
        it("directly sets option when no method exists", () => {
            const m = buildQuery();
            assert.equal(m.options.woot, null);
            m.setOptions({ woot: "yay" });
            assert.equal(m.options.woot, "yay");
        });
        it("is chainable", () => {
            const m = buildQuery();
            var n = m.setOptions();
            assert.equal(m, n);
            var n = m.setOptions({ x: 1 });
            assert.equal(m, n);
        });
    });

    describe("collection", () => {
        it("sets the _collection", () => {
            const m = buildQuery();
            m.collection(col);
            assert.equal(m._collection.collection, col);
        });
        it("is chainable", () => {
            const m = buildQuery();
            const n = m.collection(col);
            assert.equal(m, n);
        });
    });

    describe("$where", () => {
        it("sets the $where condition", () => {
            const m = buildQuery();
            function go() { }
            m.$where(go);
            assert.ok(go === m._conditions.$where);
        });
        it("is chainable", () => {
            const m = buildQuery();
            const n = m.$where("x");
            assert.equal(m, n);
        });
    });

    describe("where", () => {
        it("without arguments", () => {
            const m = buildQuery();
            m.where();
            assert.deepEqual({}, m._conditions);
        });
        it("with non-string/object argument", () => {
            const m = buildQuery();

            assert.throws(() => {
                m.where([]);
            }, /path must be a string or object/);
        });
        describe("with one argument", () => {
            it("that is an object", () => {
                const m = buildQuery();
                m.where({ name: "flawed" });
                assert.strictEqual(m._conditions.name, "flawed");
            });
            it("that is a query", () => {
                const m = buildQuery({ name: "first" });
                const n = buildQuery({ name: "changed" });
                m.where(n);
                assert.strictEqual(m._conditions.name, "changed");
            });
            it("that is a string", () => {
                const m = buildQuery();
                m.where("name");
                assert.equal("name", m._path);
                assert.strictEqual(m._conditions.name, undefined);
            });
        });
        it("with two arguments", () => {
            const m = buildQuery();
            m.where("name", "The Great Pumpkin");
            assert.equal("name", m._path);
            assert.strictEqual(m._conditions.name, "The Great Pumpkin");
        });
        it("is chainable", () => {
            const m = buildQuery();
            var n = m.where("x", "y");
            assert.equal(m, n);
            var n = m.where();
            assert.equal(m, n);
        });
    });

    describe("equals", () => {
        it("must be called after where()", () => {
            const m = buildQuery();
            assert.throws(() => {
                m.equals();
            }, /must be used after where/);
        });
        it("sets value of path set with where()", () => {
            const m = buildQuery();
            m.where("age").equals(1000);
            assert.deepEqual({ age: 1000 }, m._conditions);
        });
        it("is chainable", () => {
            const m = buildQuery();
            const n = m.where("x").equals(3);
            assert.equal(m, n);
        });
    });

    describe("eq", () => {
        it("is alias of equals", () => {
            const m = buildQuery();
            m.where("age").eq(1000);
            assert.deepEqual({ age: 1000 }, m._conditions);
        });
    });

    describe("or", () => {
        it("pushes onto the internal $or condition", () => {
            const m = buildQuery();
            m.or({ "Nightmare Before Christmas": true });
            assert.deepEqual([{ "Nightmare Before Christmas": true }], m._conditions.$or);
        });
        it("allows passing arrays", () => {
            const m = buildQuery();
            const arg = [{ "Nightmare Before Christmas": true }, { x: 1 }];
            m.or(arg);
            assert.deepEqual(arg, m._conditions.$or);
        });
        it("allows calling multiple times", () => {
            const m = buildQuery();
            const arg = [{ looper: true }, { x: 1 }];
            m.or(arg);
            m.or({ y: 1 });
            m.or([{ w: "oo" }, { z: "oo" }]);
            assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: "oo" }, { z: "oo" }], m._conditions.$or);
        });
        it("is chainable", () => {
            const m = buildQuery();
            m.or({ o: "k" }).where("name", "table");
            assert.deepEqual({ name: "table", $or: [{ o: "k" }] }, m._conditions);
        });
    });

    describe("nor", () => {
        it("pushes onto the internal $nor condition", () => {
            const m = buildQuery();
            m.nor({ "Nightmare Before Christmas": true });
            assert.deepEqual([{ "Nightmare Before Christmas": true }], m._conditions.$nor);
        });
        it("allows passing arrays", () => {
            const m = buildQuery();
            const arg = [{ "Nightmare Before Christmas": true }, { x: 1 }];
            m.nor(arg);
            assert.deepEqual(arg, m._conditions.$nor);
        });
        it("allows calling multiple times", () => {
            const m = buildQuery();
            const arg = [{ looper: true }, { x: 1 }];
            m.nor(arg);
            m.nor({ y: 1 });
            m.nor([{ w: "oo" }, { z: "oo" }]);
            assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: "oo" }, { z: "oo" }], m._conditions.$nor);
        });
        it("is chainable", () => {
            const m = buildQuery();
            m.nor({ o: "k" }).where("name", "table");
            assert.deepEqual({ name: "table", $nor: [{ o: "k" }] }, m._conditions);
        });
    });

    describe("and", () => {
        it("pushes onto the internal $and condition", () => {
            const m = buildQuery();
            m.and({ "Nightmare Before Christmas": true });
            assert.deepEqual([{ "Nightmare Before Christmas": true }], m._conditions.$and);
        });
        it("allows passing arrays", () => {
            const m = buildQuery();
            const arg = [{ "Nightmare Before Christmas": true }, { x: 1 }];
            m.and(arg);
            assert.deepEqual(arg, m._conditions.$and);
        });
        it("allows calling multiple times", () => {
            const m = buildQuery();
            const arg = [{ looper: true }, { x: 1 }];
            m.and(arg);
            m.and({ y: 1 });
            m.and([{ w: "oo" }, { z: "oo" }]);
            assert.deepEqual([{ looper: true }, { x: 1 }, { y: 1 }, { w: "oo" }, { z: "oo" }], m._conditions.$and);
        });
        it("is chainable", () => {
            const m = buildQuery();
            m.and({ o: "k" }).where("name", "table");
            assert.deepEqual({ name: "table", $and: [{ o: "k" }] }, m._conditions);
        });
    });

    const generalCondition = (type) => {
        return () => {
            it("accepts 2 args", () => {
                const m = buildQuery()[type]("count", 3);
                const check = {};
                check[`$${type}`] = 3;
                assert.deepEqual(m._conditions.count, check);
            });
            it("uses previously set `where` path if 1 arg passed", () => {
                const m = buildQuery().where("count")[type](3);
                const check = {};
                check[`$${type}`] = 3;
                assert.deepEqual(m._conditions.count, check);
            });
            it("throws if 1 arg was passed but no previous `where` was used", () => {
                assert.throws(() => {
                    buildQuery()[type](3);
                }, /must be used after where/);
            });
            it("is chainable", () => {
                const m = buildQuery().where("count")[type](3).where("x", 8);
                const check = { x: 8, count: {} };
                check.count[`$${type}`] = 3;
                assert.deepEqual(m._conditions, check);
            });
            it("overwrites previous value", () => {
                const m = buildQuery().where("count")[type](3)[type](8);
                const check = {};
                check[`$${type}`] = 8;
                assert.deepEqual(m._conditions.count, check);
            });
        };
    };

    "gt gte lt lte ne in nin regex size maxDistance minDistance".split(" ").forEach((type) => {
        describe(type, generalCondition(type));
    });

    describe("mod", () => {
        describe("with 1 argument", () => {
            it("requires a previous where()", () => {
                assert.throws(() => {
                    buildQuery().mod([30, 10]);
                }, /must be used after where/);
            });
            it("works", () => {
                const m = buildQuery().where("madmen").mod([10, 20]);
                assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
            });
        });

        describe("with 2 arguments and second is non-Array", () => {
            it("requires a previous where()", () => {
                assert.throws(() => {
                    buildQuery().mod("x", 10);
                }, /must be used after where/);
            });
            it("works", () => {
                const m = buildQuery().where("madmen").mod(10, 20);
                assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
            });
        });

        it("with 2 arguments and second is an array", () => {
            const m = buildQuery().mod("madmen", [10, 20]);
            assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
        });

        it("with 3 arguments", () => {
            const m = buildQuery().mod("madmen", 10, 20);
            assert.deepEqual(m._conditions, { madmen: { $mod: [10, 20] } });
        });

        it("is chainable", () => {
            const m = buildQuery().mod("madmen", 10, 20).where("x", 8);
            const check = { madmen: { $mod: [10, 20] }, x: 8 };
            assert.deepEqual(m._conditions, check);
        });
    });

    describe("exists", () => {
        describe("with 0 args", () => {
            it("throws if not used after where()", () => {
                assert.throws(() => {
                    buildQuery().exists();
                }, /must be used after where/);
            });
            it("works", () => {
                const m = buildQuery().where("name").exists();
                const check = { name: { $exists: true } };
                assert.deepEqual(m._conditions, check);
            });
        });

        describe("with 1 arg", () => {
            describe("that is boolean", () => {
                it("throws if not used after where()", () => {
                    assert.throws(() => {
                        buildQuery().exists();
                    }, /must be used after where/);
                });
                it("works", () => {
                    const m = buildQuery().exists("name", false);
                    const check = { name: { $exists: false } };
                    assert.deepEqual(m._conditions, check);
                });
            });
            describe("that is not boolean", () => {
                it("sets the value to `true`", () => {
                    const m = buildQuery().where("name").exists("yummy");
                    const check = { yummy: { $exists: true } };
                    assert.deepEqual(m._conditions, check);
                });
            });
        });

        describe("with 2 args", () => {
            it("works", () => {
                const m = buildQuery().exists("yummy", false);
                const check = { yummy: { $exists: false } };
                assert.deepEqual(m._conditions, check);
            });
        });

        it("is chainable", () => {
            const m = buildQuery().where("name").exists().find({ x: 1 });
            const check = { name: { $exists: true }, x: 1 };
            assert.deepEqual(m._conditions, check);
        });
    });

    describe("elemMatch", () => {
        describe("with null/undefined first argument", () => {
            assert.throws(() => {
                buildQuery().elemMatch();
            }, /Invalid argument/);
            assert.throws(() => {
                buildQuery().elemMatch(null);
            }, /Invalid argument/);
            assert.doesNotThrow(() => {
                buildQuery().elemMatch("", {});
            });
        });

        describe("with 1 argument", () => {
            it("throws if not a function or object", () => {
                assert.throws(() => {
                    buildQuery().elemMatch([]);
                }, /Invalid argument/);
            });

            describe("that is an object", () => {
                it("throws if no previous `where` was used", () => {
                    assert.throws(() => {
                        buildQuery().elemMatch({});
                    }, /must be used after where/);
                });
                it("works", () => {
                    const m = buildQuery().where("comment").elemMatch({ author: "joe", votes: { $gte: 3 } });
                    assert.deepEqual({ comment: { $elemMatch: { author: "joe", votes: { $gte: 3 } } } }, m._conditions);
                });
            });
            describe("that is a function", () => {
                it("throws if no previous `where` was used", () => {
                    assert.throws(() => {
                        buildQuery().elemMatch(() => { });
                    }, /must be used after where/);
                });
                it("works", () => {
                    const m = buildQuery().where("comment").elemMatch((query) => {
                        query.where({ author: "joe", votes: { $gte: 3 } });
                    });
                    assert.deepEqual({ comment: { $elemMatch: { author: "joe", votes: { $gte: 3 } } } }, m._conditions);
                });
            });
        });

        describe("with 2 arguments", () => {
            describe("and the 2nd is an object", () => {
                it("works", () => {
                    const m = buildQuery().elemMatch("comment", { author: "joe", votes: { $gte: 3 } });
                    assert.deepEqual({ comment: { $elemMatch: { author: "joe", votes: { $gte: 3 } } } }, m._conditions);
                });
            });
            describe("and the 2nd is a function", () => {
                it("works", () => {
                    const m = buildQuery().elemMatch("comment", (query) => {
                        query.where({ author: "joe", votes: { $gte: 3 } });
                    });
                    assert.deepEqual({ comment: { $elemMatch: { author: "joe", votes: { $gte: 3 } } } }, m._conditions);
                });
            });
            it("and the 2nd is not a function or object", () => {
                assert.throws(() => {
                    buildQuery().elemMatch("comment", []);
                }, /Invalid argument/);
            });
        });
    });

    describe("within", () => {
        it("is chainable", () => {
            const m = buildQuery();
            assert.equal(m.where("a").within(), m);
        });
        describe("when called with arguments", () => {
            it("must follow where()", () => {
                assert.throws(() => {
                    buildQuery().within([]);
                }, /must be used after where/);
            });

            describe("of length 1", () => {
                it("throws if not a recognized shape", () => {
                    assert.throws(() => {
                        buildQuery().where("loc").within({});
                    }, /Invalid argument/);
                    assert.throws(() => {
                        buildQuery().where("loc").within(null);
                    }, /Invalid argument/);
                });
                it("delegates to circle when center exists", () => {
                    const m = buildQuery().where("loc").within({ center: [10, 10], radius: 3 });
                    assert.deepEqual({ $geoWithin: { $center: [[10, 10], 3] } }, m._conditions.loc);
                });
                it("delegates to box when exists", () => {
                    const m = buildQuery().where("loc").within({ box: [[10, 10], [11, 14]] });
                    assert.deepEqual({ $geoWithin: { $box: [[10, 10], [11, 14]] } }, m._conditions.loc);
                });
                it("delegates to polygon when exists", () => {
                    const m = buildQuery().where("loc").within({ polygon: [[10, 10], [11, 14], [10, 9]] });
                    assert.deepEqual({ $geoWithin: { $polygon: [[10, 10], [11, 14], [10, 9]] } }, m._conditions.loc);
                });
                it("delegates to geometry when exists", () => {
                    const m = buildQuery().where("loc").within({ type: "Polygon", coordinates: [[10, 10], [11, 14], [10, 9]] });
                    assert.deepEqual({ $geoWithin: { $geometry: { type: "Polygon", coordinates: [[10, 10], [11, 14], [10, 9]] } } }, m._conditions.loc);
                });
            });

            describe("of length 2", () => {
                it("delegates to box()", () => {
                    const m = buildQuery().where("loc").within([1, 2], [2, 5]);
                    assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [2, 5]] } });
                });
            });

            describe("of length > 2", () => {
                it("delegates to polygon()", () => {
                    const m = buildQuery().where("loc").within([1, 2], [2, 5], [2, 4], [1, 3]);
                    assert.deepEqual(m._conditions.loc, { $geoWithin: { $polygon: [[1, 2], [2, 5], [2, 4], [1, 3]] } });
                });
            });
        });
    });

    describe("geoWithin", () => {
        before(() => {
            mongo.QueryBuilder.use$geoWithin = false;
        });
        after(() => {
            mongo.QueryBuilder.use$geoWithin = true;
        });
        describe("when called with arguments", () => {
            describe("of length 1", () => {
                it("delegates to circle when center exists", () => {
                    const m = buildQuery().where("loc").within({ center: [10, 10], radius: 3 });
                    assert.deepEqual({ $within: { $center: [[10, 10], 3] } }, m._conditions.loc);
                });
                it("delegates to box when exists", () => {
                    const m = buildQuery().where("loc").within({ box: [[10, 10], [11, 14]] });
                    assert.deepEqual({ $within: { $box: [[10, 10], [11, 14]] } }, m._conditions.loc);
                });
                it("delegates to polygon when exists", () => {
                    const m = buildQuery().where("loc").within({ polygon: [[10, 10], [11, 14], [10, 9]] });
                    assert.deepEqual({ $within: { $polygon: [[10, 10], [11, 14], [10, 9]] } }, m._conditions.loc);
                });
                it("delegates to geometry when exists", () => {
                    const m = buildQuery().where("loc").within({ type: "Polygon", coordinates: [[10, 10], [11, 14], [10, 9]] });
                    assert.deepEqual({ $within: { $geometry: { type: "Polygon", coordinates: [[10, 10], [11, 14], [10, 9]] } } }, m._conditions.loc);
                });
            });

            describe("of length 2", () => {
                it("delegates to box()", () => {
                    const m = buildQuery().where("loc").within([1, 2], [2, 5]);
                    assert.deepEqual(m._conditions.loc, { $within: { $box: [[1, 2], [2, 5]] } });
                });
            });

            describe("of length > 2", () => {
                it("delegates to polygon()", () => {
                    const m = buildQuery().where("loc").within([1, 2], [2, 5], [2, 4], [1, 3]);
                    assert.deepEqual(m._conditions.loc, { $within: { $polygon: [[1, 2], [2, 5], [2, 4], [1, 3]] } });
                });
            });
        });
    });

    describe("box", () => {
        describe("with 1 argument", () => {
            it("throws", () => {
                assert.throws(() => {
                    buildQuery().box("sometihng");
                }, /Invalid argument/);
            });
        });
        describe("with > 3 arguments", () => {
            it("throws", () => {
                assert.throws(() => {
                    buildQuery().box(1, 2, 3, 4);
                }, /Invalid argument/);
            });
        });

        describe("with 2 arguments", () => {
            it("throws if not used after where()", () => {
                assert.throws(() => {
                    buildQuery().box([], []);
                }, /must be used after where/);
            });
            it("works", () => {
                const m = buildQuery().where("loc").box([1, 2], [3, 4]);
                assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [3, 4]] } });
            });
        });

        describe("with 3 arguments", () => {
            it("works", () => {
                const m = buildQuery().box("loc", [1, 2], [3, 4]);
                assert.deepEqual(m._conditions.loc, { $geoWithin: { $box: [[1, 2], [3, 4]] } });
            });
        });
    });

    describe("polygon", () => {
        describe("when first argument is not a string", () => {
            it("throws if not used after where()", () => {
                assert.throws(() => {
                    buildQuery().polygon({});
                }, /must be used after where/);

                assert.doesNotThrow(() => {
                    buildQuery().where("loc").polygon([1, 2], [2, 3], [3, 6]);
                });
            });

            it("assigns arguments to within polygon condition", () => {
                const m = buildQuery().where("loc").polygon([1, 2], [2, 3], [3, 6]);
                assert.deepEqual(m._conditions, { loc: { $geoWithin: { $polygon: [[1, 2], [2, 3], [3, 6]] } } });
            });
        });

        describe("when first arg is a string", () => {
            it("assigns remaining arguments to within polygon condition", () => {
                const m = buildQuery().polygon("loc", [1, 2], [2, 3], [3, 6]);
                assert.deepEqual(m._conditions, { loc: { $geoWithin: { $polygon: [[1, 2], [2, 3], [3, 6]] } } });
            });
        });
    });

    describe("circle", () => {
        describe("with one arg", () => {
            it("must follow where()", () => {
                assert.throws(() => {
                    buildQuery().circle("x");
                }, /must be used after where/);
                assert.doesNotThrow(() => {
                    buildQuery().where("loc").circle({ center: [0, 0], radius: 3 });
                });
            });
            it("works", () => {
                const m = buildQuery().where("loc").circle({ center: [0, 0], radius: 3 });
                assert.deepEqual(m._conditions, { loc: { $geoWithin: { $center: [[0, 0], 3] } } });
            });
        });
        describe("with 3 args", () => {
            it("throws", () => {
                assert.throws(() => {
                    buildQuery().where("loc").circle(1, 2, 3);
                }, /Invalid argument/);
            });
        });
        describe("requires radius and center", () => {
            assert.throws(() => {
                buildQuery().circle("loc", { center: 1 });
            }, /center and radius are required/);
            assert.throws(() => {
                buildQuery().circle("loc", { radius: 1 });
            }, /center and radius are required/);
            assert.doesNotThrow(() => {
                buildQuery().circle("loc", { center: [1, 2], radius: 1 });
            });
        });
    });

    describe("geometry", () => {
        // within + intersects
        const point = { type: "Point", coordinates: [[0, 0], [1, 1]] };

        it("must be called after within or intersects", (done) => {
            assert.throws(() => {
                buildQuery().where("a").geometry(point);
            }, /must come after/);

            assert.doesNotThrow(() => {
                buildQuery().where("a").within().geometry(point);
            });

            assert.doesNotThrow(() => {
                buildQuery().where("a").intersects().geometry(point);
            });

            done();
        });

        describe("when called with one argument", () => {
            describe("after within()", () => {
                it("and arg quacks like geoJSON", (done) => {
                    const m = buildQuery().where("a").within().geometry(point);
                    assert.deepEqual({ a: { $geoWithin: { $geometry: point } } }, m._conditions);
                    done();
                });
            });

            describe("after intersects()", () => {
                it("and arg quacks like geoJSON", (done) => {
                    const m = buildQuery().where("a").intersects().geometry(point);
                    assert.deepEqual({ a: { $geoIntersects: { $geometry: point } } }, m._conditions);
                    done();
                });
            });

            it("and arg does not quack like geoJSON", (done) => {
                assert.throws(() => {
                    buildQuery().where("b").within().geometry({ type: 1, coordinates: 2 });
                }, /Invalid argument/);
                done();
            });
        });

        describe("when called with zero arguments", () => {
            it("throws", (done) => {
                assert.throws(() => {
                    buildQuery().where("a").within().geometry();
                }, /Invalid argument/);

                done();
            });
        });

        describe("when called with more than one arguments", () => {
            it("throws", (done) => {
                assert.throws(() => {
                    buildQuery().where("a").within().geometry({ type: "a", coordinates: [] }, 2);
                }, /Invalid argument/);
                done();
            });
        });
    });

    describe("intersects", () => {
        it("must be used after where()", (done) => {
            const m = buildQuery();
            assert.throws(() => {
                m.intersects();
            }, /must be used after where/);
            done();
        });

        it('sets geo comparison to "$intersects"', (done) => {
            const n = buildQuery().where("a").intersects();
            assert.equal("$geoIntersects", n._geoComparison);
            done();
        });

        it("is chainable", () => {
            const m = buildQuery();
            assert.equal(m.where("a").intersects(), m);
        });

        it("calls geometry if argument quacks like geojson", (done) => {
            const m = buildQuery();
            const o = { type: "LineString", coordinates: [[0, 1], [3, 40]] };
            let ran = false;

            m.geometry = function (arg) {
                ran = true;
                assert.deepEqual(o, arg);
            };

            m.where("a").intersects(o);
            assert.ok(ran);

            done();
        });

        it("throws if argument is not geometry-like", (done) => {
            const m = buildQuery().where("a");

            assert.throws(() => {
                m.intersects(null);
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects(undefined);
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects(false);
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects({});
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects([]);
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects(() => { });
            }, /Invalid argument/);

            assert.throws(() => {
                m.intersects(NaN);
            }, /Invalid argument/);

            done();
        });
    });

    describe("near", () => {
        // near nearSphere
        describe("with 0 args", () => {
            it("is compatible with geometry()", (done) => {
                const q = buildQuery().where("x").near().geometry({ type: "Point", coordinates: [180, 11] });
                assert.deepEqual({ $near: { $geometry: { type: "Point", coordinates: [180, 11] } } }, q._conditions.x);
                done();
            });
        });

        describe("with 1 arg", () => {
            it("throws if not used after where()", () => {
                assert.throws(() => {
                    buildQuery().near(1);
                }, /must be used after where/);
            });
            it("does not throw if used after where()", () => {
                assert.doesNotThrow(() => {
                    buildQuery().where("loc").near({ center: [1, 1] });
                });
            });
        });
        describe("with > 2 args", () => {
            it("throws", () => {
                assert.throws(() => {
                    buildQuery().near(1, 2, 3);
                }, /Invalid argument/);
            });
        });

        it("creates $geometry args for GeoJSON", () => {
            const m = buildQuery().where("loc").near({ center: { type: "Point", coordinates: [10, 10] } });
            assert.deepEqual({ $near: { $geometry: { type: "Point", coordinates: [10, 10] } } }, m._conditions.loc);
        });

        it("expects `center`", () => {
            assert.throws(() => {
                buildQuery().near("loc", { maxDistance: 3 });
            }, /center is required/);
            assert.doesNotThrow(() => {
                buildQuery().near("loc", { center: [3, 4] });
            });
        });

        it("accepts spherical conditions", () => {
            const m = buildQuery().where("loc").near({ center: [1, 2], spherical: true });
            assert.deepEqual(m._conditions, { loc: { $nearSphere: [1, 2] } });
        });

        it("is non-spherical by default", () => {
            const m = buildQuery().where("loc").near({ center: [1, 2] });
            assert.deepEqual(m._conditions, { loc: { $near: [1, 2] } });
        });

        it("supports maxDistance", () => {
            const m = buildQuery().where("loc").near({ center: [1, 2], maxDistance: 4 });
            assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $maxDistance: 4 } });
        });

        it("supports minDistance", () => {
            const m = buildQuery().where("loc").near({ center: [1, 2], minDistance: 4 });
            assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $minDistance: 4 } });
        });

        it("is chainable", () => {
            const m = buildQuery().where("loc").near({ center: [1, 2], maxDistance: 4 }).find({ x: 1 });
            assert.deepEqual(m._conditions, { loc: { $near: [1, 2], $maxDistance: 4 }, x: 1 });
        });

        describe("supports passing GeoJSON, gh-13", () => {
            it("with center", () => {
                const m = buildQuery().where("loc").near({
                    center: { type: "Point", coordinates: [1, 1] },
                    maxDistance: 2
                });

                const expect = {
                    loc: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [1, 1]
                            },
                            $maxDistance: 2
                        }
                    }
                };

                assert.deepEqual(m._conditions, expect);
            });
        });
    });

    // fields

    describe("select", () => {
        describe("with 0 args", () => {
            it("is chainable", () => {
                const m = buildQuery();
                assert.equal(m, m.select());
            });
        });

        it("accepts an object", () => {
            const o = { x: 1, y: 1 };
            const m = buildQuery().select(o);
            assert.deepEqual(m._fields, o);
        });

        it("accepts a string", () => {
            const o = "x -y";
            const m = buildQuery().select(o);
            assert.deepEqual(m._fields, { x: 1, y: 0 });
        });

        it("does accept an array", () => {
            const o = ["x", "-y"];
            const m = buildQuery().select(o);
            assert.deepEqual(m._fields, { x: 1, y: 0 });
        });

        it("merges previous arguments", () => {
            const o = { x: 1, y: 0, a: 1 };
            const m = buildQuery().select(o);
            m.select("z -u w").select({ x: 0 });
            assert.deepEqual(m._fields, {
                x: 0,
                y: 0,
                z: 1,
                u: 0,
                w: 1,
                a: 1
            });
        });

        it("rejects non-string, object, arrays", () => {
            assert.throws(() => {
                buildQuery().select(() => { });
            }, /Invalid select\(\) argument/);
        });

        noDistinct("select");
    });

    describe("selected", () => {
        it("returns true when fields have been selected", (done) => {
            var m = buildQuery().select({ name: 1 });
            assert.ok(m.selected());

            var m = buildQuery().select("name");
            assert.ok(m.selected());

            done();
        });

        it("returns false when no fields have been selected", (done) => {
            const m = buildQuery();
            assert.strictEqual(false, m.selected());
            done();
        });
    });

    describe("selectedInclusively", () => {
        describe("returns false", () => {
            it("when no fields have been selected", (done) => {
                assert.strictEqual(false, buildQuery().selectedInclusively());
                assert.equal(false, buildQuery().select({}).selectedInclusively());
                done();
            });
            it("when any fields have been excluded", (done) => {
                assert.strictEqual(false, buildQuery().select("-name").selectedInclusively());
                assert.strictEqual(false, buildQuery().select({ name: 0 }).selectedInclusively());
                assert.strictEqual(false, buildQuery().select("name bio -_id").selectedInclusively());
                assert.strictEqual(false, buildQuery().select({ name: 1, _id: 0 }).selectedInclusively());
                done();
            });
            it("when using $meta", (done) => {
                assert.strictEqual(false, buildQuery().select({ name: { $meta: "textScore" } }).selectedInclusively());
                done();
            });
        });

        describe("returns true", () => {
            it("when fields have been included", (done) => {
                assert.equal(true, buildQuery().select("name").selectedInclusively());
                assert.equal(true, buildQuery().select({ name: 1 }).selectedInclusively());
                done();
            });
        });
    });

    describe("selectedExclusively", () => {
        describe("returns false", () => {
            it("when no fields have been selected", (done) => {
                assert.equal(false, buildQuery().selectedExclusively());
                assert.equal(false, buildQuery().select({}).selectedExclusively());
                done();
            });
            it("when fields have only been included", (done) => {
                assert.equal(false, buildQuery().select("name").selectedExclusively());
                assert.equal(false, buildQuery().select({ name: 1 }).selectedExclusively());
                done();
            });
        });

        describe("returns true", () => {
            it("when any field has been excluded", (done) => {
                assert.equal(true, buildQuery().select("-name").selectedExclusively());
                assert.equal(true, buildQuery().select({ name: 0 }).selectedExclusively());
                assert.equal(true, buildQuery().select("-_id").selectedExclusively());
                assert.strictEqual(true, buildQuery().select("name bio -_id").selectedExclusively());
                assert.strictEqual(true, buildQuery().select({ name: 1, _id: 0 }).selectedExclusively());
                done();
            });
        });
    });

    describe("slice", () => {
        describe("with 0 args", () => {
            it("is chainable", () => {
                const m = buildQuery();
                assert.equal(m, m.slice());
            });
            it("is a noop", () => {
                const m = buildQuery().slice();
                assert.deepEqual(m._fields, undefined);
            });
        });

        describe("with 1 arg", () => {
            it("throws if not called after where()", () => {
                assert.throws(() => {
                    buildQuery().slice(1);
                }, /must be used after where/);
                assert.doesNotThrow(() => {
                    buildQuery().where("a").slice(1);
                });
            });
            it("that is a number", () => {
                const query = buildQuery();
                query.where("collection").slice(5);
                assert.deepEqual(query._fields, { collection: { $slice: 5 } });
            });
            it("that is an array", () => {
                const query = buildQuery();
                query.where("collection").slice([5, 10]);
                assert.deepEqual(query._fields, { collection: { $slice: [5, 10] } });
            });
            it("that is an object", () => {
                const query = buildQuery();
                query.slice({ collection: [5, 10] });
                assert.deepEqual(query._fields, { collection: { $slice: [5, 10] } });
            });
        });

        describe("with 2 args", () => {
            describe("and first is a number", () => {
                it("throws if not called after where", () => {
                    assert.throws(() => {
                        buildQuery().slice(2, 3);
                    }, /must be used after where/);
                });
                it("does not throw if used after where", () => {
                    const query = buildQuery();
                    query.where("collection").slice(2, 3);
                    assert.deepEqual(query._fields, { collection: { $slice: [2, 3] } });
                });
            });
            it("and first is not a number", () => {
                const query = buildQuery().slice("collection", [-5, 2]);
                assert.deepEqual(query._fields, { collection: { $slice: [-5, 2] } });
            });
        });

        describe("with 3 args", () => {
            it("works", () => {
                const query = buildQuery();
                query.slice("collection", 14, 10);
                assert.deepEqual(query._fields, { collection: { $slice: [14, 10] } });
            });
        });

        noDistinct("slice");
        no("count", "slice");
    });

    // options

    describe("sort", () => {
        describe("with 0 args", () => {
            it("chains", () => {
                const m = buildQuery();
                assert.equal(m, m.sort());
            });
            it("has no affect", () => {
                const m = buildQuery();
                assert.equal(m.options.sort, undefined);
            });
        });

        it("works", () => {
            let query = buildQuery();
            query.sort("a -c b");
            assert.deepEqual(query.options.sort, { a: 1, b: 1, c: -1 });

            query = buildQuery();
            query.sort({ a: 1, c: -1, b: "asc", e: "descending", f: "ascending" });
            assert.deepEqual(query.options.sort, { a: 1, c: -1, b: 1, e: -1, f: 1 });

            query = buildQuery();
            let e = undefined;

            e = undefined;
            try {
                query.sort("a", 1, "c", -1, "b", 1);
            } catch (err) {
                e = err;
            }
            assert.ok(e, "uh oh. no error was thrown");
            assert.equal(e.message, "Invalid sort() argument. Must be a string, object, or array.");
        });

        it("handles $meta sort options", () => {
            const query = buildQuery();
            query.sort({ score: { $meta: "textScore" } });
            assert.deepEqual(query.options.sort, { score: { $meta: "textScore" } });
        });

        it("array syntax", () => {
            const query = buildQuery();
            query.sort([["field", 1], ["test", -1]]);
            assert.deepEqual(query.options.sort, [["field", "1"], ["test", "-1"]]);
        });

        it("throws with mixed array/object syntax", () => {
            const query = buildQuery();
            assert.throws(() => {
                query.sort({ field: 1 }).sort([["test", -1]]);
            }, /Can't mix sort syntaxes/);
            assert.throws(() => {
                query.sort([["field", 1]]).sort({ test: 1 });
            }, /Can't mix sort syntaxes/);
        });

        it("works with maps", () => {
            const query = buildQuery();
            query.sort(new Map().set("field", 1).set("test", -1));
            assert.deepEqual(query.options.sort, new Map().set("field", "1").set("test", "-1"));
        });
    });

    const simpleOption = (type, options) => {
        describe(type, () => {
            it(`sets the ${type} option`, () => {
                const m = buildQuery()[type](2);
                const optionName = options.name || type;
                assert.equal(2, m.options[optionName]);
            });
            it("is chainable", () => {
                const m = buildQuery();
                assert.equal(m[type](3), m);
            });

            if (!options.distinct) {
                noDistinct(type);
            }
            if (!options.count) {
                no("count", type);
            }
        });
    };

    const negated = {
        limit: { distinct: false, count: true },
        skip: { distinct: false, count: true },
        maxScan: { distinct: false, count: false },
        batchSize: { distinct: false, count: false },
        maxTime: { distinct: true, count: true, name: "maxTimeMS" },
        comment: { distinct: false, count: false }
    };
    Object.keys(negated).forEach((key) => {
        simpleOption(key, negated[key]);
    });

    describe("snapshot", () => {
        it("works", () => {
            var query = buildQuery();
            query.snapshot();
            assert.equal(true, query.options.snapshot);

            var query = buildQuery();
            query.snapshot(true);
            assert.equal(true, query.options.snapshot);

            var query = buildQuery();
            query.snapshot(false);
            assert.equal(false, query.options.snapshot);
        });
        noDistinct("snapshot");
        no("count", "snapshot");
    });

    describe("hint", () => {
        it("accepts an object", () => {
            const query2 = buildQuery();
            query2.hint({ a: 1, b: -1 });
            assert.deepEqual(query2.options.hint, { a: 1, b: -1 });
        });

        it("accepts a string", () => {
            const query2 = buildQuery();
            query2.hint("a");
            assert.deepEqual(query2.options.hint, "a");
        });

        it("rejects everything else", () => {
            assert.throws(() => {
                buildQuery().hint(["c"]);
            }, /Invalid hint./);
            assert.throws(() => {
                buildQuery().hint(1);
            }, /Invalid hint./);
        });

        describe("does not have side affects", () => {
            it("on invalid arg", () => {
                const m = buildQuery();
                try {
                    m.hint(1);
                } catch (err) {
                    // ignore
                }
                assert.equal(undefined, m.options.hint);
            });
            it("on missing arg", () => {
                const m = buildQuery().hint();
                assert.equal(undefined, m.options.hint);
            });
        });

        noDistinct("hint");
    });

    describe("slaveOk", () => {
        it("works", () => {
            var query = buildQuery();
            query.slaveOk();
            assert.equal(true, query.options.slaveOk);

            var query = buildQuery();
            query.slaveOk(true);
            assert.equal(true, query.options.slaveOk);

            var query = buildQuery();
            query.slaveOk(false);
            assert.equal(false, query.options.slaveOk);
        });
    });

    describe("read", () => {
        it("sets associated readPreference option", () => {
            const m = buildQuery();
            m.read("p");
            assert.equal("primary", m.options.readPreference);
        });
        it("is chainable", () => {
            const m = buildQuery();
            assert.equal(m, m.read("sp"));
        });
    });

    describe("tailable", () => {
        it("works", () => {
            var query = buildQuery();
            query.tailable();
            assert.equal(true, query.options.tailable);

            var query = buildQuery();
            query.tailable(true);
            assert.equal(true, query.options.tailable);

            var query = buildQuery();
            query.tailable(false);
            assert.equal(false, query.options.tailable);
        });
        it("is chainable", () => {
            const m = buildQuery();
            assert.equal(m, m.tailable());
        });
        noDistinct("tailable");
        no("count", "tailable");
    });

    // query utilities

    describe("merge", () => {
        describe("with falsy arg", () => {
            it("returns itself", () => {
                const m = buildQuery();
                assert.equal(m, m.merge());
                assert.equal(m, m.merge(null));
                assert.equal(m, m.merge(0));
            });
        });
        describe("with an argument", () => {
            describe("that is not a query or plain object", () => {
                it("throws", () => {
                    assert.throws(() => {
                        buildQuery().merge([]);
                    }, /Invalid argument/);
                    assert.throws(() => {
                        buildQuery().merge("merge");
                    }, /Invalid argument/);
                    assert.doesNotThrow(() => {
                        buildQuery().merge({});
                    }, /Invalid argument/);
                });
            });

            describe("that is a query", () => {
                it("merges conditions, field selection, and options", () => {
                    const m = buildQuery({ x: "hi" }, { select: "x y", another: true });
                    const n = buildQuery().merge(m);
                    assert.deepEqual(n._conditions, m._conditions);
                    assert.deepEqual(n._fields, m._fields);
                    assert.deepEqual(n.options, m.options);
                });
                it("clones update arguments", (done) => {
                    const original = { $set: { iTerm: true } };
                    const m = buildQuery().update(original);
                    const n = buildQuery().merge(m);
                    m.update({ $set: { x: 2 } });
                    assert.notDeepEqual(m._update, n._update);
                    done();
                });
                it("is chainable", () => {
                    const m = buildQuery({ x: "hi" });
                    const n = buildQuery();
                    assert.equal(n, n.merge(m));
                });
            });

            describe("that is an object", () => {
                it("merges", () => {
                    const m = { x: "hi" };
                    const n = buildQuery().merge(m);
                    assert.deepEqual(n._conditions, { x: "hi" });
                });
                it("clones update arguments", (done) => {
                    const original = { $set: { iTerm: true } };
                    const m = buildQuery().update(original);
                    const n = buildQuery().merge(original);
                    m.update({ $set: { x: 2 } });
                    assert.notDeepEqual(m._update, n._update);
                    done();
                });
                it("is chainable", () => {
                    const m = { x: "hi" };
                    const n = buildQuery();
                    assert.equal(n, n.merge(m));
                });
            });
        });
    });

    // queries

    describe("find", () => {
        describe("with no callback", () => {
            it("does not execute", () => {
                const m = buildQuery();
                assert.doesNotThrow(() => {
                    m.find();
                });
                assert.doesNotThrow(() => {
                    m.find({ x: 1 });
                });
            });
        });

        it("is chainable", () => {
            const m = buildQuery().find({ x: 1 }).find().find({ y: 2 });
            assert.deepEqual(m._conditions, { x: 1, y: 2 });
        });

        it("merges other queries", () => {
            const m = buildQuery({ name: "mquery" });
            m.tailable();
            m.select("_id");
            const a = buildQuery().find(m);
            assert.deepEqual(a._conditions, m._conditions);
            assert.deepEqual(a.options, m.options);
            assert.deepEqual(a._fields, m._fields);
        });

        describe("executes", () => {
            before(async () => {
                await col.insert({ name: "mquery" }, { safe: true });
            });

            after(async () => {
                await col.remove({ name: "mquery" });
            });

            it("when criteria is passed", async () => {
                const docs = await buildQuery(col).find({ name: "mquery" });
                assert.equal(1, docs.length);
            });

            it("when no args", async () => {
                const docs = await buildQuery({ name: "mquery" }).collection(col).find();
                assert.equal(1, docs.length);
            });
        });
    });

    describe("findOne", () => {
        describe("with no callback", () => {
            it("does not execute", () => {
                const m = buildQuery();
                assert.doesNotThrow(() => {
                    m.findOne();
                });
                assert.doesNotThrow(() => {
                    m.findOne({ x: 1 });
                });
            });
        });

        it("is chainable", () => {
            const m = buildQuery();
            const n = m.findOne({ x: 1 }).findOne().findOne({ y: 2 });
            assert.equal(m, n);
            assert.deepEqual(m._conditions, { x: 1, y: 2 });
            assert.equal("findOne", m.op);
        });

        it("merges other queries", () => {
            const m = buildQuery({ name: "mquery" });
            m.read("nearest");
            m.select("_id");
            const a = buildQuery().findOne(m);
            assert.deepEqual(a._conditions, m._conditions);
            assert.deepEqual(a.options, m.options);
            assert.deepEqual(a._fields, m._fields);
        });

        describe("executes", () => {
            before(async () => {
                await col.insert({ name: "mquery findone" }, { safe: true });
            });

            after(async () => {
                await col.remove({ name: "mquery findone" });
            });

            it("when criteria is passed with a callback", async () => {
                const doc = await buildQuery(col).findOne({ name: "mquery findone" });
                assert.ok(doc);
                assert.equal("mquery findone", doc.name);
            });

            it("when Query is passed with a callback", async () => {
                const m = buildQuery(col).where({ name: "mquery findone" });
                const doc = await buildQuery(col).findOne(m);
                assert.ok(doc);
                assert.equal("mquery findone", doc.name);
            });

            it("when just a callback is passed", async () => {
                const doc = await buildQuery({ name: "mquery findone" }).collection(col).findOne();
                assert.ok(doc);
                assert.equal("mquery findone", doc.name);
            });
        });
    });

    describe("count", () => {
        describe("with no callback", () => {
            it("does not execute", () => {
                const m = buildQuery();
                assert.doesNotThrow(() => {
                    m.count();
                });
                assert.doesNotThrow(() => {
                    m.count({ x: 1 });
                });
            });
        });

        it("is chainable", () => {
            const m = buildQuery();
            const n = m.count({ x: 1 }).count().count({ y: 2 });
            assert.equal(m, n);
            assert.deepEqual(m._conditions, { x: 1, y: 2 });
            assert.equal("count", m.op);
        });

        it("merges other queries", () => {
            const m = buildQuery({ name: "mquery" });
            m.read("nearest");
            m.select("_id");
            const a = buildQuery().count(m);
            assert.deepEqual(a._conditions, m._conditions);
            assert.deepEqual(a.options, m.options);
            assert.deepEqual(a._fields, m._fields);
        });

        describe("executes", () => {
            before(async () => {
                await col.insert({ name: "mquery count" }, { safe: true });
            });

            after(async () => {
                await col.remove({ name: "mquery count" });
            });

            it("when criteria is passed with a callback", async () => {
                const count = await buildQuery(col).count({ name: "mquery count" });
                assert.ok(count);
                assert.ok(count === 1);
            });

            it("when Query is passed with a callback", async () => {
                const m = buildQuery({ name: "mquery count" });
                const count = await buildQuery(col).count(m);
                assert.ok(count);
                assert.ok(count === 1);
            });

            it("when just a callback is passed", async () => {
                const count = await buildQuery({ name: "mquery count" }).collection(col).count();
                assert.ok(count === 1);
            });
        });

        describe("validates its option", () => {
            it("sort", (done) => {
                assert.doesNotThrow(() => {
                    const m = buildQuery().sort("x").count();
                });
                done();
            });

            it("select", (done) => {
                assert.throws(() => {
                    const m = buildQuery().select("x").count();
                }, /field selection and slice cannot be used with count/);
                done();
            });

            it("slice", (done) => {
                assert.throws(() => {
                    const m = buildQuery().where("x").slice(-3).count();
                }, /field selection and slice cannot be used with count/);
                done();
            });

            it("limit", (done) => {
                assert.doesNotThrow(() => {
                    const m = buildQuery().limit(3).count();
                });
                done();
            });

            it("skip", (done) => {
                assert.doesNotThrow(() => {
                    const m = buildQuery().skip(3).count();
                });
                done();
            });

            it("batchSize", (done) => {
                assert.throws(() => {
                    const m = buildQuery({}, { batchSize: 3 }).count();
                }, /batchSize cannot be used with count/);
                done();
            });

            it("comment", (done) => {
                assert.throws(() => {
                    const m = buildQuery().comment("mquery").count();
                }, /comment cannot be used with count/);
                done();
            });

            it("maxScan", (done) => {
                assert.throws(() => {
                    const m = buildQuery().maxScan(300).count();
                }, /maxScan cannot be used with count/);
                done();
            });

            it("snapshot", (done) => {
                assert.throws(() => {
                    const m = buildQuery().snapshot().count();
                }, /snapshot cannot be used with count/);
                done();
            });

            it("tailable", (done) => {
                assert.throws(() => {
                    const m = buildQuery().tailable().count();
                }, /tailable cannot be used with count/);
                done();
            });
        });
    });

    describe("distinct", () => {
        describe("with no callback", () => {
            it("does not execute", () => {
                const m = buildQuery();
                assert.doesNotThrow(() => {
                    m.distinct();
                });
                assert.doesNotThrow(() => {
                    m.distinct("name");
                });
                assert.doesNotThrow(() => {
                    m.distinct({ name: "mquery distinct" });
                });
                assert.doesNotThrow(() => {
                    m.distinct({ name: "mquery distinct" }, "name");
                });
            });
        });

        it("is chainable", () => {
            const m = buildQuery({ x: 1 }).distinct("name");
            const n = m.distinct({ y: 2 });
            assert.equal(m, n);
            assert.deepEqual(n._conditions, { x: 1, y: 2 });
            assert.equal("name", n._distinct);
            assert.equal("distinct", n.op);
        });

        it("overwrites field", () => {
            const m = buildQuery({ name: "mquery" }).distinct("name");
            m.distinct("rename");
            assert.equal(m._distinct, "rename");
            m.distinct({ x: 1 }, "renamed");
            assert.equal(m._distinct, "renamed");
        });

        it("merges other queries", () => {
            const m = buildQuery().distinct({ name: "mquery" }, "age");
            m.read("nearest");
            const a = buildQuery().distinct(m);
            assert.deepEqual(a._conditions, m._conditions);
            assert.deepEqual(a.options, m.options);
            assert.deepEqual(a._fields, m._fields);
            assert.deepEqual(a._distinct, m._distinct);
        });

        describe("executes", () => {
            before(async () => {
                await col.insert({ name: "mquery distinct", age: 1 }, { safe: true });
            });

            after(async () => {
                await col.remove({ name: "mquery distinct" });
            });

            it("when distinct arg is passed with a callback", async () => {
                const doc = await buildQuery(col).distinct("distinct");
                assert.ok(doc);
            });

            describe("when criteria is passed with a callback", () => {
                it("if distinct arg was declared", async () => {
                    const doc = await buildQuery(col).distinct("age").distinct({ name: "mquery distinct" });
                    assert.ok(doc);
                });

                it("but not if distinct arg was not declared", async () => {
                    await assert.throws(async () => {
                        await buildQuery(col).distinct({ name: "mquery distinct" });
                    }, /No value for `distinct`/);
                });
            });

            describe("when Query is passed with a callback", () => {
                const m = buildQuery({ name: "mquery distinct" });

                it("if distinct arg was declared", async () => {
                    const doc = await buildQuery(col).distinct("age").distinct(m);
                    assert.ok(doc);
                });

                it("but not if distinct arg was not declared", async () => {
                    await assert.throws(async () => {
                        await buildQuery(col).distinct(m);
                    }, /No value for `distinct`/);
                });
            });

            describe("when just a callback is passed", () => {
                it("if distinct arg was declared", async () => {
                    const m = buildQuery({ name: "mquery distinct" });
                    m.collection(col);
                    m.distinct("age");
                    const doc = await m.distinct();
                    assert.ok(doc);
                });

                it("but not if no distinct arg was declared", async () => {
                    const m = buildQuery();
                    m.collection(col);
                    await assert.throws(async () => {
                        await m.distinct();
                    }, /No value for `distinct`/);
                });
            });
        });

        describe("validates its option", () => {
            it("sort", (done) => {
                assert.throws(() => {
                    const m = buildQuery().sort("x").distinct();
                }, /sort cannot be used with distinct/);
                done();
            });

            it("select", (done) => {
                assert.throws(() => {
                    const m = buildQuery().select("x").distinct();
                }, /field selection and slice cannot be used with distinct/);
                done();
            });

            it("slice", (done) => {
                assert.throws(() => {
                    const m = buildQuery().where("x").slice(-3).distinct();
                }, /field selection and slice cannot be used with distinct/);
                done();
            });

            it("limit", (done) => {
                assert.throws(() => {
                    const m = buildQuery().limit(3).distinct();
                }, /limit cannot be used with distinct/);
                done();
            });

            it("skip", (done) => {
                assert.throws(() => {
                    const m = buildQuery().skip(3).distinct();
                }, /skip cannot be used with distinct/);
                done();
            });

            it("batchSize", (done) => {
                assert.throws(() => {
                    const m = buildQuery({}, { batchSize: 3 }).distinct();
                }, /batchSize cannot be used with distinct/);
                done();
            });

            it("comment", (done) => {
                assert.throws(() => {
                    const m = buildQuery().comment("mquery").distinct();
                }, /comment cannot be used with distinct/);
                done();
            });

            it("maxScan", (done) => {
                assert.throws(() => {
                    const m = buildQuery().maxScan(300).distinct();
                }, /maxScan cannot be used with distinct/);
                done();
            });

            it("snapshot", (done) => {
                assert.throws(() => {
                    const m = buildQuery().snapshot().distinct();
                }, /snapshot cannot be used with distinct/);
                done();
            });

            it("hint", (done) => {
                assert.throws(() => {
                    const m = buildQuery().hint({ x: 1 }).distinct();
                }, /hint cannot be used with distinct/);
                done();
            });

            it("tailable", (done) => {
                assert.throws(() => {
                    const m = buildQuery().tailable().distinct();
                }, /tailable cannot be used with distinct/);
                done();
            });
        });
    });

    describe("update", () => {
        describe("with no callback", () => {
            it("does not execute", () => {
                const m = buildQuery();
                assert.doesNotThrow(() => {
                    m.update({ name: "old" }, { name: "updated" }, { multi: true });
                });
                assert.doesNotThrow(() => {
                    m.update({ name: "old" }, { name: "updated" });
                });
                assert.doesNotThrow(() => {
                    m.update({ name: "updated" });
                });
                assert.doesNotThrow(() => {
                    m.update();
                });
            });
        });

        it("is chainable", () => {
            const m = buildQuery({ x: 1 }).update({ y: 2 });
            const n = m.where({ y: 2 });
            assert.equal(m, n);
            assert.deepEqual(n._conditions, { x: 1, y: 2 });
            assert.deepEqual({ y: 2 }, n._update);
            assert.equal("update", n.op);
        });

        it("merges update doc arg", () => {
            const a = [1, 2];
            const m = buildQuery().where({ name: "mquery" }).update({ x: "stuff", a });
            m.update({ z: "stuff" });
            assert.deepEqual(m._update, { z: "stuff", x: "stuff", a });
            assert.deepEqual(m._conditions, { name: "mquery" });
            assert.ok(!m.options.overwrite);
            m.update({}, { z: "renamed" }, { overwrite: true });
            assert.ok(m.options.overwrite === true);
            assert.deepEqual(m._conditions, { name: "mquery" });
            assert.deepEqual(m._update, { z: "renamed", x: "stuff", a });
            a.push(3);
            assert.notDeepEqual(m._update, { z: "renamed", x: "stuff", a });
        });

        it("merges other options", () => {
            const m = buildQuery();
            m.setOptions({ overwrite: true });
            m.update({ age: 77 }, { name: "pagemill" }, { multi: true });
            assert.deepEqual({ age: 77 }, m._conditions);
            assert.deepEqual({ name: "pagemill" }, m._update);
            assert.deepEqual({ overwrite: true, multi: true }, m.options);
        });

        describe("executes", () => {
            let id;

            beforeEach(async () => {
                const res = await col.insert({ name: "mquery update", age: 1 }, { safe: true });
                id = res.insertedIds[0];
            });

            afterEach(async () => {
                await col.remove({ _id: id });
            });

            describe("when conds + doc + opts + callback passed", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    const res = await m.update({}, { name: "Sparky" }, { safe: true });
                    assert.equal(res.result.n, 1);
                    const doc = await m.findOne();
                    assert.equal(doc.name, "Sparky");
                });
            });

            describe("when conds + doc + callback passed", () => {
                it("works", async () => {
                    const m = buildQuery(col).update({ _id: id }, { name: "fairgrounds" });
                    const res = await m;
                    assert.ok(1, res.result.nModified);
                    const doc = await m.findOne();
                    assert.equal(doc.name, "fairgrounds");
                });
            });

            describe("when doc + callback passed", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id }).update({ name: "changed" });
                    const res = await m;
                    expect(res.result.nModified).to.be.equal(1);

                    const doc = await m.findOne();
                    assert.equal(doc.name, "changed");
                });
            });

            describe("when just callback passed", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.setOptions({ safe: true });
                    m.update({ name: "Frankenweenie" });
                    const res = await m.update();
                    assert.equal(res.result.n, 1);
                    const doc = await m.findOne();
                    assert.equal(doc.name, "Frankenweenie");
                });
            });

            describe("without a callback", () => {
                it("when forced by exec()", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.setOptions({ safe: true, multi: true });
                    m.update({ name: "forced" });

                    const update = stub(m._collection, "update").returns(undefined);

                    try {
                        await m.exec();

                        expect(update).to.have.been.calledOnce;

                        const [, doc, opts] = update.getCall(0).args;

                        assert.ok(opts.safe);
                        assert.ok(opts.multi === true);
                        assert.equal("forced", doc.$set.name);
                    } finally {
                        update.restore();
                    }
                });
            });

            describe("except when update doc is empty and missing overwrite flag", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.setOptions({ safe: true });

                    expect(await m.update({})).to.be.null(); // TODO: ok?

                    await promise.delay(300);

                    const doc = await m.findOne();
                    assert.equal(3, Object.keys(doc).length);
                    assert.equal(id, doc._id.toString());
                    assert.equal("mquery update", doc.name);
                });
            });

            describe("when update doc is set with overwrite flag", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.setOptions({ safe: true, overwrite: true });
                    const res = await m.update({ all: "yep", two: 2 });
                    assert.equal(res.result.n, 1);
                    const doc = await m.findOne();
                    assert.equal(3, Object.keys(doc).length);
                    assert.equal("yep", doc.all);
                    assert.equal(2, doc.two);
                    assert.equal(id, doc._id.toString());
                });
            });

            describe("when update doc is empty with overwrite flag", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.setOptions({ safe: true, overwrite: true });
                    const res = await m.update({});
                    assert.equal(res.result.n, 1);
                    const doc = await m.findOne();
                    assert.equal(1, Object.keys(doc).length);
                    assert.equal(id, doc._id.toString());
                });
            });

            describe("when boolean (true) - exec()", () => {
                it("works", async () => {
                    const m = buildQuery(col).where({ _id: id });
                    m.update({ name: "bool" }).update(true);

                    await promise.delay(300); // enough?

                    const doc = await m.findOne();
                    assert.ok(doc);
                    assert.equal("bool", doc.name);
                });
            });
        });
    });

    describe("remove", () => {
        describe("with 0 args", () => {
            const name = "remove: no args test";
            before(async () => {
                await col.insert({ name }, { safe: true });
            });
            after(async () => {
                await col.remove({ name }, { safe: true });
            });

            it("does not execute", async () => {
                const remove = spy(col, "remove");
                try {
                    buildQuery(col).where({ name }).remove();
                    await promise.delay(300);

                    expect(remove).to.have.not.been.called;
                } finally {
                    remove.restore();
                }
            });

            it("chains", () => {
                const m = buildQuery();
                assert.equal(m, m.remove());
            });
        });

        describe("with 1 argument", () => {
            const name = "remove: 1 arg test";
            before(async () => {
                await col.insert({ name }, { safe: true });
            });
            after(async () => {
                await col.remove({ name }, { safe: true });
            });

            describe("that is a", () => {
                it("plain object", () => {
                    const m = buildQuery(col).remove({ name: "Whiskers" });
                    m.remove({ color: "#fff" });
                    assert.deepEqual({ name: "Whiskers", color: "#fff" }, m._conditions);
                });

                it("query", () => {
                    const q = buildQuery({ color: "#fff" });
                    const m = buildQuery(col).remove({ name: "Whiskers" });
                    m.remove(q);
                    assert.deepEqual({ name: "Whiskers", color: "#fff" }, m._conditions);
                });

                it("function", async () => {
                    await buildQuery(col, { safe: true }).where({ name }).remove();
                    const doc = await buildQuery(col).findOne({ name });
                    assert.equal(null, doc);
                });

                it("boolean (true) - execute", async () => {
                    await col.insert({ name }, { safe: true });
                    const doc = await buildQuery(col).findOne({ name });
                    assert.ok(doc);
                    buildQuery(col).remove(true);
                    await promise.delay(300);
                    const docs = await buildQuery(col).find();
                    assert.ok(docs);
                    assert.equal(0, docs.length);
                });
            });
        });

        describe("with 2 arguments", () => {
            const name = "remove: 2 arg test";

            beforeEach(async () => {
                await col.remove({}, { safe: true });
                await col.insert([{ name: "shelly" }, { name }], { safe: true });
            });

            describe("plain object + callback", () => {
                it("works", async () => {
                    await buildQuery(col).remove({ name });
                    const docs = await buildQuery(col).find();
                    assert.ok(docs);
                    assert.equal(1, docs.length);
                    assert.equal("shelly", docs[0].name);
                });
            });

            describe("mquery + callback", () => {
                it("works", async () => {
                    const m = buildQuery({ name });
                    await buildQuery(col).remove(m);
                    const docs = await buildQuery(col).find();
                    assert.ok(docs);
                    assert.equal(1, docs.length);
                    assert.equal("shelly", docs[0].name);
                });
            });
        });
    });

    const validateFindAndModifyOptions = (method) => {
        describe("validates its option", () => {
            it("sort", async () => {
                await assert.doesNotThrow(async () => {
                    await buildQuery(col).sort("x")[method]();
                });
            });

            it("select", async () => {
                await assert.doesNotThrow(async () => {
                    await buildQuery(col).select("x")[method]();
                });
            });

            it("limit", async () => {
                await assert.throws(async () => {
                    await buildQuery().limit(3)[method]();
                }, new RegExp(`limit cannot be used with ${method}`));
            });

            it("skip", async () => {
                await assert.throws(async () => {
                    await buildQuery().skip(3)[method]();
                }, new RegExp(`skip cannot be used with ${method}`));
            });

            it("batchSize", async () => {
                await assert.throws(async () => {
                    await buildQuery({}, { batchSize: 3 })[method]();
                }, new RegExp(`batchSize cannot be used with ${method}`));
            });

            it("maxScan", async () => {
                await assert.throws(async () => {
                    await buildQuery().maxScan(300)[method]();
                }, new RegExp(`maxScan cannot be used with ${method}`));
            });

            it("snapshot", async () => {
                await assert.throws(async () => {
                    await buildQuery().snapshot()[method]();
                }, new RegExp(`snapshot cannot be used with ${method}`));
            });

            it("hint", async () => {
                await assert.throws(async () => {
                    await buildQuery().hint({ x: 1 })[method]();
                }, new RegExp(`hint cannot be used with ${method}`));
            });

            it("tailable", async () => {
                await assert.throws(async () => {
                    await buildQuery().tailable()[method]();
                }, new RegExp(`tailable cannot be used with ${method}`));
            });

            it("comment", async () => {
                await assert.throws(async () => {
                    await buildQuery().comment("mquery")[method]();
                }, new RegExp(`comment cannot be used with ${method}`));
            });
        });
    };

    describe("findOneAndUpdate", () => {
        let name = "findOneAndUpdate + fn";

        validateFindAndModifyOptions("findOneAndUpdate");

        describe("with 0 args", () => {
            it("makes no changes", () => {
                const m = buildQuery();
                const n = m.findOneAndUpdate();
                assert.deepEqual(m, n);
            });
        });

        describe("with 1 arg", () => {
            describe("that is an object", () => {
                it("updates the doc", () => {
                    const m = buildQuery();
                    const n = m.findOneAndUpdate({ $set: { name: "1 arg" } });
                    assert.deepEqual(n._update, { $set: { name: "1 arg" } });
                });
            });

            describe("that is a query", () => {
                it("updates the doc", () => {
                    const m = buildQuery({ name }).update({ x: 1 });
                    const n = buildQuery().findOneAndUpdate(m);
                    assert.deepEqual(n._update, { x: 1 });
                });
            });

            it("that is a function", async () => {
                await col.insert({ name }, { safe: true });
                const m = buildQuery({ name }).collection(col);
                name = "1 arg";
                const n = m.update({ $set: { name } });
                const res = await n.findOneAndUpdate();
                assert.ok(res.value);
                assert.equal(name, res.value.name);
            });
        });

        describe("with 2 args", () => {
            it("conditions + update", () => {
                const m = buildQuery(col);
                m.findOneAndUpdate({ name }, { age: 100 });
                assert.deepEqual({ name }, m._conditions);
                assert.deepEqual({ age: 100 }, m._update);
            });

            it("query + update", () => {
                const n = buildQuery({ name });
                const m = buildQuery(col);
                m.findOneAndUpdate(n, { age: 100 });
                assert.deepEqual({ name }, m._conditions);
                assert.deepEqual({ age: 100 }, m._update);
            });

            it("update + callback", async () => {
                const m = buildQuery(col).where({ name });
                const res = await m.findOneAndUpdate({}, { $inc: { age: 10 } }, { new: true });
                assert.equal(10, res.value.age);
            });
        });

        describe("with 3 args", () => {
            it("conditions + update + options", () => {
                const m = buildQuery();
                const n = m.findOneAndUpdate({ name }, { works: true }, { new: false });
                assert.deepEqual({ name }, n._conditions);
                assert.deepEqual({ works: true }, n._update);
                assert.deepEqual({ new: false }, n.options);
            });

            it("conditions + update + callback", async () => {
                const m = buildQuery(col);
                const res = await m.findOneAndUpdate({ name }, { works: true }, { new: true });
                assert.ok(res.value);
                assert.equal(name, res.value.name);
                assert.ok(res.value.works === true);
            });
        });

        describe("with 4 args", () => {
            it("conditions + update + options + callback", async () => {
                const m = buildQuery(col);
                const res = await m.findOneAndUpdate({ name }, { works: false }, { new: false });
                assert.ok(res.value);
                assert.equal(name, res.value.name);
                assert.ok(res.value.works === true);
            });
        });
    });

    describe("findOneAndRemove", () => {
        let name = "findOneAndRemove";

        validateFindAndModifyOptions("findOneAndRemove");

        describe("with 0 args", () => {
            it("makes no changes", () => {
                const m = buildQuery();
                const n = m.findOneAndRemove();
                assert.deepEqual(m, n);
            });
        });
        describe("with 1 arg", () => {
            describe("that is an object", () => {
                it("updates the doc", () => {
                    const m = buildQuery();
                    const n = m.findOneAndRemove({ name: "1 arg" });
                    assert.deepEqual(n._conditions, { name: "1 arg" });
                });
            });
            describe("that is a query", () => {
                it("updates the doc", () => {
                    const m = buildQuery({ name });
                    const n = m.findOneAndRemove(m);
                    assert.deepEqual(n._conditions, { name });
                });
            });
            it("that is a function", async () => {
                await col.insert({ name }, { safe: true });
                const m = buildQuery({ name }).collection(col);
                const res = await m.findOneAndRemove();
                assert.ok(res.value);
                assert.equal(name, res.value.name);
            });
        });
        describe("with 2 args", () => {
            it("conditions + options", () => {
                const m = buildQuery(col);
                m.findOneAndRemove({ name }, { new: false });
                assert.deepEqual({ name }, m._conditions);
                assert.deepEqual({ new: false }, m.options);
            });

            it("query + options", () => {
                const n = buildQuery({ name });
                const m = buildQuery(col);
                m.findOneAndRemove(n, { sort: { x: 1 } });
                assert.deepEqual({ name }, m._conditions);
                assert.deepEqual({ sort: { x: 1 } }, m.options);
            });

            it("conditions + callback", async () => {
                await col.insert({ name }, { safe: true });
                const m = buildQuery(col);
                const res = await m.findOneAndRemove({ name });
                assert.equal(name, res.value.name);
            });

            it("query + callback", async () => {
                await col.insert({ name }, { safe: true });
                const n = buildQuery({ name });
                const m = buildQuery(col);
                const res = await m.findOneAndRemove(n);
                assert.equal(name, res.value.name);
            });
        });

        describe("with 3 args", () => {
            it("conditions + options + callback", async () => {
                name = "findOneAndRemove + conds + options + cb";
                await col.insert([{ name }, { name: "a" }], { safe: true });
                const m = buildQuery(col);
                const res = await m.findOneAndRemove({ name }, { sort: { name: 1 } });
                assert.ok(res.value);
                assert.equal(name, res.value.name);
            });
        });
    });

    describe("exec", () => {
        beforeEach(async () => {
            await col.insert([{ name: "exec", age: 1 }, { name: "exec", age: 2 }]);
        });

        afterEach(async () => {
            await buildQuery(col).remove();
        });

        it("requires an op", async () => {
            await assert.throws(async () => {
                await buildQuery().exec();
            }, /Missing query type/);
        });

        describe("find", () => {
            it("works", async () => {
                const m = buildQuery(col).find({ name: "exec" });
                const docs = await m.exec();
                assert.equal(2, docs.length);
            });

            it("works with readPreferences", async () => {
                const m = buildQuery(col).find({ name: "exec" });
                const rp = new adone.database.mongo.ReadPreference("primary");
                m.read(rp);
                const docs = await m.exec();
                assert.equal(2, docs.length);
            });
        });

        it("findOne", async () => {
            const m = buildQuery(col).findOne({ age: 2 });
            const doc = await m.exec();
            assert.equal(2, doc.age);
        });

        it("count", async () => {
            const m = buildQuery(col).count({ name: "exec" });
            const count = await m.exec();
            assert.equal(2, count);
        });

        it("distinct", async () => {
            const m = buildQuery({ name: "exec" });
            m.collection(col);
            m.distinct("age");
            const array = await m.exec();
            assert.ok(is.array(array));
            assert.equal(2, array.length);
            assert.include(array, 1);
            assert.include(array, 2);
        });

        describe("update", () => {
            let num;

            it("with a callback", async () => {
                const m = buildQuery(col);
                m.where({ name: "exec" });

                num = await m.count();
                m.setOptions({ multi: true });
                m.update({ name: "exec + update" });
                const res = await m.exec();
                assert.equal(num, res.result.n);
                const docs = await buildQuery(col).find({ name: "exec + update" });
                assert.equal(num, docs.length);
            });

            describe("updateMany", () => {
                it("works", async () => {
                    await buildQuery(col).updateMany({ name: "exec" }, { name: "test" }).exec();
                    const res = await buildQuery(col).count({ name: "test" });
                    assert.equal(res, 2);
                });
            });

            describe("updateOne", () => {
                it("works", async () => {
                    await buildQuery(col).updateOne({ name: "exec" }, { name: "test" }).exec();
                    const res = await buildQuery(col).count({ name: "test" }).exec();
                    assert.equal(res, 1);
                });
            });

            describe("replaceOne", () => {
                it("works", async () => {
                    await buildQuery(col).replaceOne({ name: "exec" }, { name: "test" }).exec();
                    const res = await buildQuery(col).findOne({ name: "test" }).exec();
                    assert.equal(res.name, "test");
                    assert.ok(is.nil(res.age));
                });
            });

            it("without a callback", async () => {
                const m = buildQuery(col);
                m.where({ name: "exec + update" }).setOptions({ multi: true });
                m.update({ name: "exec" });

                // unsafe write
                m.exec(true);

                await promise.delay(300);

                const docs = await buildQuery(col).find({ name: "exec" });
                assert.equal(2, docs.length);
            });

            it("preserves key ordering", () => {
                const m = buildQuery(col);

                const m2 = m.update({ _id: "something" }, { 1: 1, 2: 2, 3: 3 });
                const doc = m2._updateForExec().$set;
                let count = 0;
                for (const i in doc) {
                    if (count == 0) {
                        assert.equal("1", i);
                    } else if (count == 1) {
                        assert.equal("2", i);
                    } else if (count == 2) {
                        assert.equal("3", i);
                    }
                    count++;
                }
            });
        });

        describe("remove", () => {
            it("with a callback", async () => {
                const m = buildQuery(col).where({ age: 2 }).remove();
                const res = await m.exec();
                assert.equal(1, res.result.n);
            });
        });

        describe("deleteOne", () => {
            it("with a callback", async () => {
                const m = buildQuery(col).where({ age: { $gte: 0 } }).deleteOne();
                const res = await m.exec();
                assert.equal(res.result.n, 1);
            });

            it("with justOne set", async () => {
                const m = buildQuery(col).where({ age: { $gte: 0 } }).
                    // Should ignore `justOne`
                    setOptions({ justOne: false }).
                    deleteOne();
                const res = await m.exec();
                assert.equal(res.result.n, 1);
            });
        });

        describe("deleteMany", () => {
            it("with a callback", async () => {
                const m = buildQuery(col).where({ age: { $gte: 0 } }).deleteMany();
                const res = await m.exec();
                assert.equal(res.result.n, 2);
            });
        });

        describe("findOneAndUpdate", () => {
            it("with a callback", async () => {
                const m = buildQuery(col);
                m.findOneAndUpdate({ name: "exec", age: 1 }, { $set: { name: "findOneAndUpdate" } });
                const res = await m.exec();
                assert.equal("findOneAndUpdate", res.value.name);
            });
        });

        describe("findOneAndRemove", () => {
            it("with a callback", async () => {
                const m = buildQuery(col);
                m.findOneAndRemove({ name: "exec", age: 2 });
                const res = await m.exec();
                assert.equal("exec", res.value.name);
                assert.equal(2, res.value.age);
                const num = await buildQuery(col).count({ name: "exec" });
                assert.equal(1, num);
            });
        });
    });

    describe.skip("setTraceFunction", () => {
        beforeEach(async () => {
            await col.insert([{ name: "trace", age: 93 }]);
        });

        it("calls trace function when executing query", (done) => {
            const m = buildQuery(col);

            let resultTraceCalled;

            m.setTraceFunction((method, queryInfo) => {
                try {
                    assert.equal("findOne", method);
                    assert.equal("trace", queryInfo.conditions.name);
                } catch (e) {
                    done(e);
                }

                return function (err, result, millis) {
                    try {
                        assert.equal(93, result.age);
                    } catch (e) {
                        done(e);
                    }
                    resultTraceCalled = true;
                };
            });

            m.findOne({ name: "trace" }, (err, doc) => {
                assert.ifError(err);
                assert.equal(resultTraceCalled, true);
                assert.equal(93, doc.age);
                done();
            });
        });

        it("inherits trace function when calling toConstructor", (done) => {
            function traceFunction() {
                return function () { };
            }

            const tracedQuery = buildQuery().setTraceFunction(traceFunction).toConstructor();

            const query = tracedQuery();
            assert.equal(traceFunction, query._traceFunction);

            done();
        });
    });

    describe("stream", () => {
        before(async () => {
            await col.insert([{ name: "stream", age: 1 }, { name: "stream", age: 2 }]);
        });

        after(async () => {
            await buildQuery(col).remove({ name: "stream" }).exec();
        });

        describe("throws", () => {
            describe("if used with non-find operations", () => {
                const ops = ["update", "findOneAndUpdate", "remove", "count", "distinct"];

                ops.forEach((op) => {
                    assert.throws(() => {
                        buildQuery(col)[op]().stream();
                    });
                });
            });
        });

        it("returns a stream", (done) => {
            const stream = buildQuery(col).find({ name: "stream" }).stream();
            let count = 0;
            let err;

            stream.on("data", (doc) => {
                assert.equal("stream", doc.name);
                ++count;
            });

            stream.on("error", (er) => {
                err = er;
            });

            stream.on("end", () => {
                if (err) {
                    return done(err);
                }
                assert.equal(2, count);
                done();
            });
        });
    });

    // query internal

    describe("_updateForExec", () => {
        it("returns a clone of the update object with same key order #19", (done) => {
            const update = {};
            update.$push = { n: { $each: [{ x: 10 }], $slice: -1, $sort: { x: 1 } } };

            const q = buildQuery().update({ x: 1 }, update);

            // capture original key order
            const order = [];
            for (var key in q._update.$push.n) {
                order.push(key);
            }

            // compare output
            const doc = q._updateForExec();
            let i = 0;
            for (var key in doc.$push.n) {
                assert.equal(key, order[i]);
                i++;
            }

            done();
        });
    });
});
