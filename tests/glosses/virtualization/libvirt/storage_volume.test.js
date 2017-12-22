const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

const test = {};
describe("Storage Volume", () => {
    before(() => {
        SegfaultHandler.registerHandler();
    });

    describe("storage pool methods", () => {
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

        it("should be created", (done) => {
            const xml = fixture("storage_volume.xml");
            test.pool.createVolume(xml, (err, volume) => {
                if (err) {
                    console.log("\n\n\nERROR:\n"); console.log(err); console.log("\n\n\n");
                }

                expect(err).to.not.exist();
                expect(volume._parent).to.exist();

                volume.getName((err, name) => {
                    expect(err).to.not.exist();
                    expect(name).to.equal("sparse.img");

                    volume.remove((err, result) => {
                        expect(err).to.not.exist();
                        expect(result).to.be.true();
                        done();
                    });
                });
            });
        });

        it("should clone an existent volume", (done) => {
            const xml = fixture("storage_volume.xml");
            const clone_xml = fixture("clone_volume.xml");

            test.pool.createVolume(xml, (err, volume) => {
                expect(err).to.not.exist();

                volume.getName((err, name) => {
                    expect(err).to.not.exist();
                    expect(name).to.equal("sparse.img");

                    test.pool.cloneVolume(volume, clone_xml, (err, cloneVolume) => {
                        expect(err).to.not.exist();
                        expect(volume).to.exist();
                        expect(volume._parent).to.exist();

                        cloneVolume.getName((err, name) => {
                            expect(err).to.not.exist();
                            expect(name).to.equal("sparse_clone.img");

                            cloneVolume.remove((err, result) => {
                                expect(err).to.not.exist();
                                expect(result).to.be.true();

                                volume.remove((err, result) => {
                                    expect(err).to.not.exist();
                                    expect(result).to.be.true();
                                    done();
                                });
                            });
                        });
                    });
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

                    const xml = fixture("storage_volume.xml");
                    test.pool.createVolume(xml, (err, volume) => {
                        expect(err).to.not.exist();
                        expect(volume).to.exist();
                        expect(volume._parent).to.exist();
                        test.volume = volume;
                        done();
                    });
                });
            });
        });

        afterEach((done) => {
            if (test.volume) {
                test.volume.remove((err, result) => {
                    expect(err).to.not.exist();
                    expect(result).to.be.true();
                    test.volume = undefined;

                    test.hypervisor.disconnect((err) => {
                        expect(err).to.not.exist();
                        test.hypervisor = undefined;
                        test.pool = undefined;
                        done();
                    });
                });
            } else {
                test.hypervisor.disconnect((err) => {
                    expect(err).to.not.exist();
                    test.hypervisor = undefined;
                    test.pool = undefined;
                    done();
                });
            }
        });

        it("should return volume information", (done) => {
            test.volume.getInfo((err, info) => {
                expect(err).to.not.exist();

                // @todo: find better way to store these constants
                // var storageVolumeFile = test.volume.VIR_STORAGE_VOL_FILE;
                const storageVolumeFile = 0;
                expect(info).to.eql({
                    type: storageVolumeFile,
                    capacity: 5368709120,
                    allocation: 0
                });

                done();
            });
        });

        it("should be wiped", (done) => {
            test.volume.wipe((err, result) => {
                // NOTE: not supported by test driver
                expect(err).to.exist();
                expect(result).to.not.exist();

                // expect(err).to.not.exist();
                // expect(result).to.be.true();
                done();
            });
        });

        it("should return its key", (done) => {
            test.volume.getKey((err, key) => {
                expect(err).to.not.exist();
                expect(key).to.equal("/default-pool/sparse.img");
                done();
            });
        });

        it("should return its name", (done) => {
            test.volume.getName((err, name) => {
                expect(err).to.not.exist();
                expect(name).to.equal("sparse.img");
                done();
            });
        });

        it("should return its path", (done) => {
            test.volume.getPath((err, path) => {
                expect(err).to.not.exist();
                expect(path).to.equal("/default-pool/sparse.img");
                done();
            });
        });

        it("should return its xml description", (done) => {
            test.volume.toXml((err, xml) => {
                expect(err).to.not.exist();
                expect(xml).to.match(/<name>sparse.img<\/name>/);
                done();
            });
        });

        it("should be located by its key", (done) => {
            test.volume.getKey((err, key) => {
                expect(err).to.not.exist();
                test.hypervisor.lookupStorageVolumeByKey(key, (err, volume) => {
                    expect(err).to.not.exist();
                    expect(volume).to.exist();
                    expect(volume._parent).to.exist();

                    volume.getName((err, lookupName) => {
                        expect(err).to.not.exist();

                        test.volume.getName((err, name) => {
                            expect(err).to.not.exist();
                            expect(lookupName).to.equal(name);
                            done();
                        });
                    });
                });
            });
        });

        it("should be located by its name", (done) => {
            test.volume.getName((err, name) => {
                expect(err).to.not.exist();
                test.pool.lookupStorageVolumeByName(name, (err, volume) => {
                    expect(err).to.not.exist();
                    expect(volume).to.exist();
                    expect(volume._parent).to.exist();

                    volume.getKey((err, lookupKey) => {
                        expect(err).to.not.exist();

                        test.volume.getKey((err, key) => {
                            expect(err).to.not.exist();
                            expect(lookupKey).to.equal(key);
                            done();
                        });
                    });
                });
            });
        });

        it("should be located by its path", (done) => {
            test.volume.getPath((err, path) => {
                expect(err).to.not.exist();
                test.hypervisor.lookupStorageVolumeByPath(path, (err, volume) => {
                    expect(err).to.not.exist();
                    expect(volume).to.exist();
                    expect(volume._parent).to.exist();

                    volume.getKey((err, lookupKey) => {
                        expect(err).to.not.exist();

                        test.volume.getKey((err, key) => {
                            expect(err).to.not.exist();
                            expect(lookupKey).to.equal(key);
                            done();
                        });
                    });
                });
            });
        });

        it("should be removed from the pool", (done) => {
            test.volume.remove((err, result) => {
                expect(err).to.not.exist();
                expect(result).to.be.true();
                test.volume = undefined;
                done();
            });
        });
    });
});
