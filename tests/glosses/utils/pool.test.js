describe("util", "Pool", () => {
    class ResourceFactory {
        constructor() {
            this.created = 0;
            this.destroyed = 0;
            this.bin = [];
        }

        create() {
            const id = this.created++;
            const resource = { id };
            return Promise.resolve(resource);
        }

        destroy(resource) {
            this.destroyed++;
            this.bin.push(resource);
            return Promise.resolve();
        }
    }

    const stopPool = (pool) => {
        return pool.drain().then(() => {
            return pool.clear();
        });
    };

    const {
        util: { pool },
        promise: { delay }
    } = adone;

    const { create: createPool } = pool;

    describe("pool", () => {
        specify("min and max limit defaults", async () => {
            const resourceFactory = new ResourceFactory();

            const pool = createPool(resourceFactory);

            assert.equal(1, pool.max);
            assert.equal(0, pool.min);
            await stopPool(pool);
        });

        specify("malformed min and max limits are ignored", () => {
            const resourceFactory = new ResourceFactory();

            const config = {
                min: "asf",
                max: []
            };
            const pool = createPool(resourceFactory, config);

            assert.equal(1, pool.max);
            assert.equal(0, pool.min);
        });

        specify("min greater than max sets to max", async () => {
            const resourceFactory = new ResourceFactory();

            const config = {
                min: 5,
                max: 3
            };
            const pool = createPool(resourceFactory, config);

            assert.equal(3, pool.max);
            assert.equal(3, pool.min);
            await stopPool(pool);
        });

        specify("supports priority on borrow", async () => {
            // NOTE: this test is pretty opaque about what it's really testing/expecting...
            let borrowTimeLow = 0;
            let borrowTimeHigh = 0;
            let borrowCount = 0;

            const resourceFactory = new ResourceFactory();

            const config = {
                max: 1,
                priorityRange: 2
            };

            const pool = createPool(resourceFactory, config);

            const lowPriorityOnFulfilled = (obj) => {
                const time = Date.now();
                if (time > borrowTimeLow) {
                    borrowTimeLow = time;
                }
                borrowCount++;
                pool.release(obj);
            };

            const highPriorityOnFulfilled = (obj) => {
                const time = Date.now();
                if (time > borrowTimeHigh) {
                    borrowTimeHigh = time;
                }
                borrowCount++;
                pool.release(obj);
            };

            const operations = [];

            for (let i = 0; i < 10; i++) {
                const op = pool.acquire(1).then(lowPriorityOnFulfilled);
                operations.push(op);
            }

            for (let i = 0; i < 10; i++) {
                const op = pool.acquire(0).then(highPriorityOnFulfilled);
                operations.push(op);
            }

            await Promise.all(operations);

            assert.equal(20, borrowCount);
            assert.equal(true, borrowTimeLow >= borrowTimeHigh);
            await stopPool(pool);
        });

        // FIXME: bad test!
        // pool.destroy makes no obligations to user about when it will destroy the resource
        // we should test that "destroyed" objects are not acquired again instead
        // tap.test('removes correct object on reap', function (t) {
        //   const resourceFactory = new ResourceFactory()

        //   const config
        //     max: 2
        //   }

        //   const pool = createPool(resourceFactory, config)

        //   const op1 = pool.acquire()
        //   .then(function (client) {
        //     return new Promise(function (resolve, reject) {
        //       // should be removed second
        //       setTimeout(function () {
        //         pool.destroy(client)
        //         resolve()
        //       }, 5)
        //     })
        //   })

        //   const op2 = pool.acquire()
        //   .then(function (client) {
        //     pool.destroy(client)
        //   })

        //   Promise.all([op1, op2]).then(function () {
        //     t.equal(1, resourceFactory.bin[0].id)
        //     t.equal(0, resourceFactory.bin[1].id)
        //     utils.stopPool(pool)
        //     t.end()
        //   })
        //   .catch(t.threw)
        // })

        specify("evictor removes instances on idletimeout", async () => {
            const resourceFactory = new ResourceFactory();
            const config = {
                min: 2,
                max: 2,
                idleTimeoutMillis: 50,
                evictionRunIntervalMillis: 10
            };
            const pool = createPool(resourceFactory, config);

            await delay(120);

            const res = await pool.acquire();
            expect(res.id).to.be.greaterThan(1);
            await pool.release(res);

            await stopPool(pool);
        });

        specify("tests drain", async () => {
            const count = 5;
            let acquired = 0;

            const resourceFactory = new ResourceFactory();
            const config = {
                max: 2,
                idletimeoutMillis: 300000
            };
            const pool = createPool(resourceFactory, config);

            const operations = [];

            const onAcquire = (client) => {
                acquired += 1;
                assert.equal(typeof client.id, "number");
                setTimeout(() => {
                    pool.release(client);
                }, 250);
            };

            // request 5 resources that release after 250ms
            for (let i = 0; i < count; i++) {
                const op = pool.acquire().then(onAcquire);
                operations.push(op);
            }
            // FIXME: what does this assertion prove?
            assert.notEqual(count, acquired);

            await Promise.all(operations);
            await pool.drain();
            assert.equal(count, acquired);
            // short circuit the absurdly long timeouts above.
            pool.clear();

            await assert.throws(async () => {
                await pool.acquire();
            });
        });

        specify("handle creation errors", async () => {
            let created = 0;
            const resourceFactory = {
                create() {
                    created++;
                    if (created < 5) {
                        return Promise.reject(new Error("Error occurred."));
                    }
                    return Promise.resolve({ id: created });

                },
                destroy(client) { }
            };
            const config = {
                max: 1
            };

            const pool = createPool(resourceFactory, config);

            // FIXME: this section no longer proves anything as factory
            // errors no longer bubble up through the acquire call
            // we need to make the Pool an Emitter

            // ensure that creation errors do not populate the pool.
            // for (const i = 0; i < 5; i++) {
            //   pool.acquire(function (err, client) {
            //     t.ok(err instanceof Error)
            //     t.ok(client === null)
            //   })
            // }

            const client = await pool.acquire();
            expect(client.id).to.be.a("number");
            await pool.release(client);
            assert.equal(pool.pending, 0);
            await stopPool(pool);
        });

        specify("handle creation errors for delayed creates", async () => {
            let attempts = 0;

            const resourceFactory = {
                create() {
                    attempts++;
                    if (attempts <= 5) {
                        return Promise.reject(new Error("Error occurred."));
                    }
                    return Promise.resolve({ id: attempts });

                },
                destroy(client) {
                    return Promise.resolve();
                }
            };

            const config = {
                max: 1
            };

            const pool = createPool(resourceFactory, config);

            let errorCount = 0;
            pool.on("factoryCreateError", (err) => {
                assert.ok(err instanceof Error);
                errorCount++;
            });

            const client = await pool.acquire();
            expect(client.id).to.be.a("number");
            await pool.release(client);
            assert.equal(errorCount, 5);
            assert.equal(pool.pending, 0);
            await stopPool(pool);
        });

        specify("getPoolSize", async () => {
            const resourceFactory = new ResourceFactory();
            const config = {
                max: 2
            };

            const pool = createPool(resourceFactory, config);

            const borrowedResources = [];

            assert.equal(pool.size, 0);
            {
                const obj = await pool.acquire();
                borrowedResources.push(obj);
                assert.equal(pool.size, 1);
            }
            {
                const obj = await pool.acquire();
                borrowedResources.push(obj);
                assert.equal(pool.size, 2);
            }
            pool.release(borrowedResources.shift());
            pool.release(borrowedResources.shift());
            {
                const obj = await pool.acquire();
                // should still be 2
                assert.equal(pool.size, 2);
                pool.release(obj);
            }
            await stopPool(pool);
        });

        specify("availableObjectsCount", async () => {
            const resourceFactory = new ResourceFactory();
            const config = {
                max: 2
            };

            const pool = createPool(resourceFactory, config);

            const borrowedResources = [];

            assert.equal(pool.available, 0);
            {
                const obj = await pool.acquire();
                borrowedResources.push(obj);
                assert.equal(pool.available, 0);
            }
            {
                const obj = await pool.acquire();
                borrowedResources.push(obj);
                assert.equal(pool.available, 0);
            }
            pool.release(borrowedResources.shift());
            assert.equal(pool.available, 1);

            pool.release(borrowedResources.shift());
            assert.equal(pool.available, 2);
            {
                const obj = await pool.acquire();
                assert.equal(pool.available, 1);
                pool.release(obj);

                assert.equal(pool.available, 2);
            }
            await stopPool(pool);
        });

        // FIXME: bad test!
        // pool.destroy makes no obligations to user about when it will destroy the resource
        // we should test that "destroyed" objects are not acquired again instead
        // tap.test('removes from available objects on destroy', function (t) {
        //   let destroyCalled = false
        //   const factory = {
        //     create: function () { return Promise.resolve({}) },
        //     destroy: function (client) { destroyCalled = true; return Promise.resolve() }
        //   }

        //   const config
        //     max: 2
        //   }

        //   const pool = createPool(factory, config)

        //   pool.acquire().then(function (obj) {
        //     pool.destroy(obj)
        //   })
        //   .then(function () {
        //     t.equal(destroyCalled, true)
        //     t.equal(pool.available, 0)
        //     utils.stopPool(pool)
        //     t.end()
        //   })
        //   .catch(t.threw)
        // })

        // FIXME: bad test!
        // pool.destroy makes no obligations to user about when it will destroy the resource
        // we should test that "destroyed" objects are not acquired again instead
        // tap.test('removes from available objects on validation failure', function (t) {
        //   const destroyCalled = false
        //   const validateCalled = false
        //   const count = 0
        //   const factory = {
        //     create: function () { return Promise.resolve({count: count++}) },
        //     destroy: function (client) { destroyCalled = client.count },
        //     validate: function (client) {
        //       validateCalled = true
        //       return Promise.resolve(client.count > 0)
        //     }
        //   }

        //   const config
        //     max: 2,
        //     testOnBorrow: true
        //   }

        //   const pool = createPool(factory, config)

        //   pool.acquire()
        //   .then(function (obj) {
        //     pool.release(obj)
        //     t.equal(obj.count, 0)
        //   })
        //   .then(function () {
        //     return pool.acquire()
        //   })
        //   .then(function (obj2) {
        //     pool.release(obj2)
        //     t.equal(obj2.count, 1)
        //   })
        //   .then(function () {
        //     t.equal(validateCalled, true)
        //     t.equal(destroyCalled, 0)
        //     t.equal(pool.available, 1)
        //     utils.stopPool(pool)
        //     t.end()
        //   })
        //   .catch(t.threw)
        // })

        specify("do schedule again if error occured when creating new Objects async", async () => {
            // NOTE: we're simulating the first few resource attempts failing
            let resourceCreationAttempts = 0;

            const factory = {
                create() {
                    resourceCreationAttempts++;
                    if (resourceCreationAttempts < 2) {
                        return Promise.reject(new Error("Create Error"));
                    }
                    return Promise.resolve({});
                },
                destroy(client) { }
            };

            const config = {
                max: 1
            };

            const pool = createPool(factory, config);
            // pool.acquire(function () {})
            const obj = await pool.acquire();
            assert.equal(pool.available, 0);
            pool.release(obj);
            await stopPool(pool);
        });

        specify("returns only valid object to the pool", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                destroy(client) { },
                max: 1
            });

            const obj = await pool.acquire();
            assert.equal(pool.available, 0);
            assert.equal(pool.borrowed, 1);

            await assert.throws(async () => {
                await pool.release({});
            }, "Resource not currently part of this pool");
            assert.equal(pool.available, 0);
            assert.equal(pool.borrowed, 1);

            // Valid release
            await pool.release(obj);
            assert.equal(pool.available, 1);
            assert.equal(pool.borrowed, 0);
            await stopPool(pool);
        });

        specify("validate acquires object from the pool", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                validate(resource) {
                    return Promise.resolve(true);
                },
                destroy(client) { },
                max: 1
            });

            const obj = await pool.acquire();
            assert.equal(pool.available, 0);
            assert.equal(pool.borrowed, 1);
            pool.release(obj);
            await stopPool(pool);
        });

        specify("release to pool should work", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                validate(resource) {
                    return Promise.resolve(true);
                },
                destroy(client) { },
                max: 1
            });

            await Promise.all([
                pool
                    .acquire()
                    .then((obj) => {
                        assert.equal(pool.available, 0);
                        assert.equal(pool.borrowed, 1);
                        assert.equal(pool.pending, 1);
                        pool.release(obj);
                    }),
                pool
                    .acquire()
                    .then((obj) => {
                        assert.equal(pool.available, 0);
                        assert.equal(pool.borrowed, 1);
                        assert.equal(pool.pending, 0);
                        pool.release(obj);
                    })
            ]);
            await stopPool(pool);
        });

        specify("isBorrowedResource should return true for borrowed resource", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                validate(resource) {
                    return Promise.resolve(true);
                },
                destroy(client) { },
                max: 1
            });

            const obj = await pool.acquire();
            assert.equal(pool.isBorrowedResource(obj), true);
            pool.release(obj);
            await stopPool(pool);
        });

        specify("isBorrowedResource should return false for released resource", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                validate(resource) {
                    return Promise.resolve(true);
                },
                destroy(client) { },
                max: 1
            });

            const obj = await pool.acquire();
            pool.release(obj);

            assert.equal(pool.isBorrowedResource(obj), false);
            await stopPool(pool);
        });

        specify("destroy should redispense", async () => {
            const pool = createPool({
                create() {
                    return Promise.resolve({ id: "validId" });
                },
                validate(resource) {
                    return Promise.resolve(true);
                },
                destroy(client) { },
                max: 1
            });

            await Promise.all([
                pool
                    .acquire()
                    .then((obj) => {
                        assert.equal(pool.available, 0);
                        assert.equal(pool.borrowed, 1);
                        assert.equal(pool.pending, 1);
                        pool.destroy(obj);
                    }),
                pool
                    .acquire()
                    .then((obj) => {
                        assert.equal(pool.available, 0);
                        assert.equal(pool.borrowed, 1);
                        assert.equal(pool.pending, 0);
                        pool.release(obj);
                    })
            ]);
            await stopPool(pool);
        });

        specify("evictor start with acquire when autostart is false", async () => {
            const pool = createPool(
                {
                    create() {
                        return Promise.resolve({ id: "validId" });
                    },
                    validate(resource) {
                        return Promise.resolve(true);
                    },
                    destroy(client) { }
                },
                {
                    evictionRunIntervalMillis: 10000,
                    autostart: false
                }
            );

            assert.equal(pool._scheduledEviction, null);

            const obj = await pool.acquire();
            assert.notEqual(pool._scheduledEviction, null);
            pool.release(obj);
            await stopPool(pool);
        });

        describe("acquire timeout", () => {
            specify("acquireTimeout handles timed out acquire calls", async () => {
                const factory = {
                    create() {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve({});
                            }, 100);
                        }));
                    },
                    destroy() {
                        return Promise.resolve();
                    }
                };
                const config = {
                    acquireTimeoutMillis: 20,
                    idleTimeoutMillis: 150,
                    log: false
                };

                const pool = createPool(factory, config);

                await assert.throws(async () => {
                    await pool.acquire();
                }, "ResourceRequest timed out");

                await pool.clear();
            });

            specify("acquireTimeout handles non timed out acquire calls", async () => {
                const myResource = {};
                const factory = {
                    create() {
                        return new Promise(((resolve) => {
                            setTimeout(() => {
                                resolve(myResource);
                            }, 10);
                        }));
                    },
                    destroy() {
                        return Promise.resolve();
                    }
                };

                const config = {
                    acquireTimeoutMillis: 400
                };

                const pool = createPool(factory, config);

                const resource = await pool.acquire();

                assert.equal(resource, myResource);
                pool.release(resource);
                await pool.drain();
                await pool.clear();
            });
        });
    });

    describe("ResourceRequest", () => {
        const { ResourceRequest } = pool;

        specify("can be created", () => {
            const create = function () {
                const request = new ResourceRequest(undefined, Promise); // eslint-disable-line no-unused-vars
            };
            assert.doesNotThrow(create);
        });

        specify("times out when created with a ttl", async () => {
            const request = new ResourceRequest(10, Promise); // eslint-disable-line no-unused-vars
            await assert.throws(async () => {
                await request.promise;
            }, "ResourceRequest timed out");
        });

        specify("calls resolve when resolved", async () => {
            const resource = {};
            const request = new ResourceRequest(undefined, Promise);
            request.resolve(resource);
            expect(await request.promise).to.be.equal(resource);
        });

        specify.skip("removeTimeout removes the timeout", async () => {
            const request = new ResourceRequest(10, Promise);
            const p = request.promise;
            request.removeTimeout();
            setTimeout(() => {
                t.end();
            }, 20);
        });

        specify("does nothing if resolved more than once", () => {
            const request = new ResourceRequest(undefined, Promise);
            assert.doesNotThrow(() => {
                request.resolve({});
            });
            assert.doesNotThrow(() => {
                request.resolve({});
            });
        });
    });
});
