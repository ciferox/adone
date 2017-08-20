const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

const test = {};
describe("Interface", () => {
    before(() => {
        SegfaultHandler.registerHandler();
    });

    describe("hypervisor methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist;
                done();
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist;
                done();
            });
        });

        it("should define and undefine an interface from its xml description", (done) => {
            const xml = fixture("interface.xml");
            test.hypervisor.defineInterface(xml, (err, iface) => {
                expect(err).to.not.exist;
                expect(iface).to.exist;
                expect(iface._parent).to.exist;

                iface.getName((err, result) => {
                    expect(err).to.not.exist;
                    expect(result).to.equal("eth2");
                    done();
                });
            });
        });

        it("should undefine the interface", (done) => {
            const xml = fixture("interface.xml");
            test.hypervisor.defineInterface(xml, (err, iface) => {
                expect(err).to.not.exist;
                expect(iface).to.exist;
                expect(iface._parent).to.exist;

                test.hypervisor.lookupInterfaceByName("eth2", (err, iface) => {
                    expect(err).to.not.exist;
                    expect(iface).to.exist;
                    expect(iface._parent).to.exist;
                    iface.undefine((err, result) => {
                        expect(err).to.not.exist;
                        expect(result).to.be.true;
                        done();
                    });
                });
            });
        });

        it("should be located through its name", (done) => {
            test.hypervisor.lookupInterfaceByName("eth1", (err, iface) => {
                expect(err).to.not.exist;
                expect(iface).to.exist;
                expect(iface._parent).to.exist;

                iface.getName((err, result) => {
                    expect(err).to.not.exist;
                    expect(result).to.equal("eth1");
                    done();
                });
            });
        });

        it("should be located through its mac address", (done) => {
            test.hypervisor.lookupInterfaceByMacAddress("aa:bb:cc:dd:ee:ff", (err, iface) => {
                expect(err).to.not.exist;
                expect(iface).to.exist;
                expect(iface._parent).to.exist;

                iface.getName((err, result) => {
                    expect(err).to.not.exist;
                    expect(result).to.equal("eth1");
                    done();
                });
            });
        });
    });

    describe("methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist;
                test.hypervisor.lookupInterfaceByName("eth1", (err, iface) => {
                    expect(err).to.not.exist;
                    expect(iface).to.exist;
                    expect(iface._parent).to.exist;
                    test.interface = iface;
                    done();
                });
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist;
                test.interface = undefined;
                done();
            });
        });

        it("should start", (done) => {
            test.interface.start((err, result) => {
                expect(err).to.exist;

                // NOTE: not supported in test-driver, so result is false
                expect(result).to.not.exist;
                done();
            });
        });

        it("should stop", (done) => {
            // NOTE: not supported in test-driver, so result is false
            test.interface.stop((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it("should indicate if is active and running", (done) => {
            test.interface.isActive((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                done();
            });
        });

        it("should return the name", (done) => {
            test.interface.getName((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.equal("eth1");
                done();
            });
        });

        it("should return the mac address", (done) => {
            test.interface.getMacAddress((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.equal("aa:bb:cc:dd:ee:ff");
                done();
            });
        });

        it("should return its xml description", (done) => {
            test.interface.toXml((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.match(/eth1/);
                done();
            });
        });
    });
});
