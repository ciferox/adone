describe("glosses", "promise", () => {
    describe("defer", () => {
        it("should have a promise", () => {
            const defer = adone.promise.defer();
            expect(defer.promise).to.be.instanceOf(Promise);
        });

        it("should have a resolve function", () => {
            const defer = adone.promise.defer();
            expect(defer.resolve).to.be.a("function");
        });

        it("should have a reject function", () => {
            const defer = adone.promise.defer();
            expect(defer.reject).to.be.a("function");
        });

        it("should resolve the promise", async () => {
            const defer = adone.promise.defer();
            defer.resolve(5);
            expect(await defer.promise).to.be.equal(5);
        });

        it("should reject the promise", async () => {
            const defer = adone.promise.defer();
            defer.reject(10);
            expect(await defer.promise.then(() => null, (x) => x)).to.be.equal(10);
        });
    });

    describe("delay", () => {
        it("should be a promise", () => {
            expect(adone.promise.delay(100)).to.be.instanceOf(Promise);
        });

        it("should be delayed", async () => {
            const past = new Date();
            await adone.promise.delay(100);
            expect(new Date() - past).to.be.at.least(95);  // v8, wtf?
        });

        it("should be resolves with a value", async () => {
            expect(await adone.promise.delay(50, 10)).to.be.equal(10);
        });
    });

    describe("timeout", () => {
        it("should throw if the first argument is not a promise", () => {
            expect(() => {
                adone.promise.timeout(5);
            }).to.throw(adone.x.InvalidArgument, "The first argument must be a promise");
        });

        it("should reject the promise after the dalay", async () => {
            const p = adone.promise.delay(500);
            const q = adone.promise.timeout(p, 200);
            const res = await q.then(() => null, (x) => x);
            expect(res).to.be.instanceOf(adone.x.Timeout);
            expect(res.message).to.be.equal("Timeout of 200ms exceeded");
        });

        it("should not reject the promise if it resolves", async () => {
            const p = adone.promise.delay(10, 10);
            expect(await adone.promise.timeout(p, 100)).to.be.equal(10);
        });

        it("should be rejeted by itself", async () => {
            const p = adone.promise.delay(10).then(() => {
                throw new Error("hello");
            });
            const q = await adone.promise.timeout(p, 100).then(() => null, (x) => x);
            expect(q).to.be.instanceOf(Error);
            expect(q.message).to.be.equal("hello");
        });
    });

    describe("nodeify", () => {
        it("should pass the value as the second argument", (done) => {
            adone.promise.nodeify(Promise.resolve(10), (err, value) => {
                expect(value).to.be.equal(10);
                done();
            });
        });

        it("should pass null as the first argument if there is no error", (done) => {
            adone.promise.nodeify(Promise.resolve(), (err) => {
                expect(err).to.be.null;
                done();
            });
        });

        it("should pass the error as the first argument", (done) => {
            adone.promise.nodeify(Promise.reject(10), (err) => {
                expect(err).to.be.equal(10);
                done();
            });
        });

        it("should not pass the second argument if there is an error", (done) => {
            adone.promise.nodeify(Promise.reject(10), (...args) => {
                expect(args).to.have.lengthOf(1);
                done();
            });
        });

        it("should return the passed promise", async () => {
            const p = Promise.resolve(10);
            expect(adone.promise.nodeify(p, () => { })).to.be.equal(p);
        });

        it("should throw if the first argument is not a promise", () => {
            expect(() => {
                adone.promise.nodeify();
            }).to.throw(adone.x.InvalidArgument, "The first argument must be a promise");
        });

        it("should return the promise if the second argument is not a function", () => {
            const p = Promise.resolve();
            expect(adone.promise.nodeify(p)).to.be.equal(p);
        });
    });

    describe("promisify", () => {
        it("should turn a callback-based function into an async function", async () => {
            const getSecrets = (cb) => {
                cb(null, 123);
            };
            const getSecretsAsync = adone.promise.promisify(getSecrets);
            expect(getSecretsAsync).to.be.a("function");
            expect(await getSecretsAsync()).to.be.equal(123);
        });

        it("should throw if the first argument of the callback truthy", async () => {
            const getSecrets = (cb) => {
                cb(1);
            };
            const f = adone.promise.promisify(getSecrets);
            expect(await f().then(() => null, (x) => x)).to.be.equal(1);
        });

        it("should correctly handle synchronous errors", async () => {
            const getSecrets = () => {
                throw 1;
            };
            const f = adone.promise.promisify(getSecrets);
            expect(await f().then(() => null, (x) => x)).to.be.equal(1);
        });

        it("should pass arguments", async () => {
            const getSecrets = (a, b, cb) => {
                cb(null, a + b);
            };
            const f = adone.promise.promisify(getSecrets);
            expect(await f(1, 2)).to.be.equal(3);
        });

        it("should pass the context", async () => {
            const getSecrets = function (cb) {
                cb(null, this.a + this.b);
            };
            const f = adone.promise.promisify(getSecrets);
            expect(await f.call({ a: 1, b: 2 })).to.be.equal(3);
        });

        it("should throw if the first argument is not a function", () => {
            expect(() => {
                adone.promise.promisify();
            }).to.throw(adone.x.InvalidArgument, "The first argument must be a function");
        });

        it("should set the promisified property", () => {
            const getSecrets = () => { };
            const f = adone.promise.promisify(getSecrets);
            expect(f[Symbol.for("adone:promise:promisified")]).to.be.true;
        });

        it("should set the promisified source property", () => {
            const getSecrets = () => { };
            const f = adone.promise.promisify(getSecrets);
            expect(f[Symbol.for("adone:promise:promisify_source")]).to.be.equal(getSecrets);
        });
    });

    describe("promisifyAll", () => {
        it("should promisify nested functions", async () => {
            const a = {
                f: (cb) => cb(null, 1),
                b: (cb) => cb(null, 2)
            };
            const b = adone.promise.promisifyAll(a);
            expect(await b.fAsync()).to.be.equal(1);
            expect(await b.bAsync()).to.be.equal(2);
            expect(b.fAsync[Symbol.for("adone:promise:promisified")]).to.be.true;
            expect(b.bAsync[Symbol.for("adone:promise:promisified")]).to.be.true;
        });

        it("should not modify the prev functions", () => {
            const a = {
                f: (cb) => cb(null, 1),
                b: (cb) => cb(null, 2)
            };
            const b = adone.promise.promisifyAll(a);
            expect(b.f).to.be.equal(a.f);
            expect(b.b).to.be.equal(a.b);
        });

        it("should copy the source object", () => {
            const a = {
                f: (cb) => cb(null, 1),
                b: (cb) => cb(null, 2)
            };
            const b = adone.promise.promisifyAll(a);
            expect(a).not.to.be.equal(b);
            a.new = 1;
            expect(b.new).to.be.undefined;
            b.new = 2;
            expect(a.new).to.be.equal(1);
        });

        it("should change the suffix", async () => {
            const a = {
                f: (cb) => cb(null, 1),
                b: (cb) => cb(null, 2)
            };
            const b = adone.promise.promisifyAll(a, { suffix: "_" });
            expect(await b.f_()).to.be.equal(1);
            expect(await b.b_()).to.be.equal(2);
        });

        it("should touch only functions", () => {
            const a = {
                s: "123",
                f: (cb) => cb(null, 1)
            };
            const b = adone.promise.promisifyAll(a);
            expect(b).to.have.property("fAsync");
            expect(b).not.to.have.property("sAsync");
        });

        it("should filter properties", () => {
            const a = {
                f: (cb) => cb(null, 1),
                b: (cb) => cb(null, 2)
            };
            const b = adone.promise.promisifyAll(a, {
                filter: (key) => key !== "b"
            });
            expect(b).to.have.property("fAsync");
            expect(b).not.to.have.property("bAsync");
        });
    });

    describe.only("reduce", () => {
        const reduce = adone.promise.reduce;

        it("should assert input types", () => {
            assert.throws(reduce.bind(null, 123));
        });

        it("should accept a single val", () => {
            const reduceFn = (prev, next) => prev + next;
            const checkFn = (val) => assert.equal(5, val);
            Promise.resolve(2).then(reduce(reduceFn, 3)).then(checkFn);
        });

        it("should reduce a fn", () => {
            const reduceFn = (prev, next) => prev + next;
            const checkFn = (val) => assert.equal(6, val);
            Promise.resolve([1, 2, 3]).then(reduce(reduceFn, 0)).then(checkFn);
        });

        it("should pass reducer arguments to callback", (done) => {
            const arrTest = [1, 2];

            const reduceFn = function (prev, next, index, arr) {
                assert.equal(4, arguments.length);
                assert.equal(arrTest, arr);

                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(prev + next);
                    }, 1);
                });
            };

            const checkFn = (val) => {
                assert.equal(3, val);
                done();
            };

            Promise.resolve(arrTest).then(reduce(reduceFn, 0)).then(checkFn);
        });

        it("should not continue until last iteration has been resolved", () => {
            const reduceFn = (prev, next) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(prev + next);
                    }, 1);
                });
            };
            const checkFn = (val) => assert.equal(6, val);
            Promise.resolve([1, 2, 3]).then(reduce(reduceFn, 0)).then(checkFn);
        });

        it("should not call callback when initial value is undefined and iterable contains one item", () => {
            const checkFn = (val) => assert.equal(1, val, "should return the item in iterable");
            Promise.resolve([1]).then(reduce(() => { }, undefined)).then(checkFn);
        });

        it("should not call callback when iterable is empty", () => {
            const checkFn = (val) => assert.equal(10, val, "should return initial value");
            Promise.resolve([]).then(reduce(() => { }, 10)).then(checkFn);
        });
    });
});
