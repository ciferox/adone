const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

const test = {};
describe("Storage Pool", () => {
    before(() => {
        SegfaultHandler.registerHandler();
    });

    describe("hypervisor methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist();
                done();
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist();
                test.hypervisor = undefined;
                done();
            });
        });

        it("should create a transient pool", (done) => {
            const xml = fixture("storage_pool.xml");
            test.hypervisor.createStoragePool(xml, (err, pool) => {
                expect(err).to.not.exist();

                pool.getName((err, name) => {
                    expect(err).to.not.exist();
                    expect(name).to.equal("virtimages");
                    done();
                });
            });
        });

        it("should define a pool", (done) => {
            const xml = fixture("storage_pool.xml");
            test.hypervisor.defineStoragePool(xml, (err, pool) => {
                expect(err).to.not.exist();

                pool.getName((err, name) => {
                    expect(err).to.not.exist();
                    expect(name).to.equal("virtimages");
                    done();
                });
            });
        });

        it("should return volume names", (done) => {
            test.hypervisor.lookupStoragePoolByName("default-pool", (err, pool) => {
                expect(err).to.not.exist();
                expect(pool).to.exist();
                expect(pool._parent).to.exist();

                pool.getVolumes((err, volumes) => {
                    expect(err).to.not.exist();
                    expect(volumes).to.be.instanceOf(Array);
                    done();
                });
            });

        });
    });

    describe("methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist();
                test.hypervisor.lookupStoragePoolByName("default-pool", (err, pool) => {
                    expect(err).to.not.exist();
                    expect(pool).to.exist();
                    expect(pool._parent).to.exist();

                    test.pool = pool;

                    test.pool.isActive((err, active) => {
                        expect(err).to.not.exist();
                        if (active) {
                            return done();
                        }

                        test.pool.start((err, started) => {
                            expect(err).to.not.exist();
                            done();
                        });
                    });
                });
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist();
                test.hypervisor = undefined;
                test.pool = undefined;
                done();
            });
        });

        it("should indicate if autostart is enabled", (done) => {
            test.pool.getAutostart((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.false();
                done();
            });
        });

        it("should set autostart to start the pool at boot time", (done) => {
            test.pool.setAutostart(false, (err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.true();

                test.pool.getAutostart((err, result) => {
                    expect(err).to.not.exist();

                    // NOTE: seems broken on test-driver, should be: to.be.true
                    expect(result).to.be.false();
                    done();
                });
            });
        });

        it("should return its information", (done) => {
            // @todo: work on more idiomatic definitions of these
            //        constants: test.pool.VIR_STORAGE_POOL_RUNNING
            const storageRunning = 2;

            test.pool.getInfo((err, info) => {
                expect(err).to.not.exist();
                expect(info).to.eql({
                    state: storageRunning,
                    capacity: 107374182400,
                    allocation: 0,
                    available: 107374182400
                });

                done();
            });
        });

        it("should be located by its name", (done) => {
            test.pool.getName((err, name) => {
                expect(err).to.not.exist();
                expect(name).to.equal("default-pool");
                done();
            });
        });

        it("should be located by its uuid", (done) => {
            test.pool.getUUID((err, uuid) => {
                expect(err).to.not.exist();

                test.hypervisor.lookupStoragePoolByUUID(uuid, (err, pool) => {
                    expect(err).to.not.exist();
                    expect(pool).to.exist();
                    expect(pool._parent).to.exist();

                    pool.getName((err, name) => {
                        expect(err).to.not.exist();
                        expect(name).to.equal("default-pool");
                        done();
                    });
                });
            });
        });

        it("should return its name", (done) => {
            test.pool.getName((err, name) => {
                expect(err).to.not.exist();
                expect(name).to.equal("default-pool");
                done();
            });
        });

        it("should return its uuid", (done) => {
            test.pool.getUUID((err, uuid) => {
                expect(err).to.not.exist();

                test.hypervisor.lookupStoragePoolByUUID(uuid, (err, pool) => {
                    expect(err).to.not.exist();
                    expect(pool).to.exist();
                    expect(pool._parent).to.exist();

                    pool.getUUID((err, lookupUUID) => {
                        expect(err).to.not.exist();
                        expect(lookupUUID).to.equal(uuid);
                        done();
                    });
                });
            });
        });

        it("should return its xml representation", (done) => {
            test.pool.toXml((err, xml) => {
                expect(err).to.not.exist();
                expect(xml).to.match(/<name>default-pool<\/name>/);
                done();
            });
        });

        it("should show if the pool is active", (done) => {
            test.pool.isActive((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.true();
                done();
            });
        });

        // it('should start an already defined pool', function(done) {
        //   //workaround because test driver seems to start the pool when it's defined which is wrong
        //   //according to the documentation
        //   //see http://libvirt.org/html/libvirt-libvirt.html#virStoragePoolDefineXML

        //   function actualTest() {
        //     test.pool.start(function(err, startResult) {
        //       expect(err).to.not.exist();
        //       expect(startResult).to.be.true();

        //       test.pool.isActive(function(err, isActive) {
        //         expect(err).to.not.exist();
        //         expect(isActive).to.be.true();
        //         done();
        //       });
        //     });
        //   }

        //   test.pool.isActive(function(err, isActive) {
        //     expect(err).to.not.exist();
        //     if (isActive) {
        //       actualTest();
        //     } else {
        //       test.pool.stop(function(err, stopResult) {
        //         expect(err).to.not.exist();
        //         expect(stopResult).to.be.true();
        //         actualTest();
        //       });
        //     }
        //   });
        // });

        it("should show if the pool is persistent", (done) => {
            test.pool.isPersistent((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.true();
                done();
            });
        });

        it("should be refreshed", (done) => {
            test.pool.refresh((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.ok();
                done();
            });
        });

        it("should stop an started pool", (done) => {
            test.pool.stop((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.ok();
                done();
            });
        });

        it("should erase a pool", (done) => {
            test.pool.stop((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.ok();

                test.pool.erase([], (err, result) => {
                    expect(err).to.not.exist();
                    expect(result).to.be.ok();
                    done();
                });
            });
        });

        it("should be undefined", (done) => {
            test.pool.stop((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.ok();

                test.pool.undefine((err, result) => {
                    expect(err).to.not.exist();
                    expect(result).to.be.ok();

                    test.hypervisor.lookupStoragePoolByName("default-pool", (err, pool) => {
                        expect(err).to.exist();
                        expect(pool).to.not.exist();
                        done();
                    });
                });
            });
        });
    });
});
