const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

const test = {};
describe("Network", () => {
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

        it("should create and start an already defined network", (done) => {
            const xml = fixture("network.xml");
            test.hypervisor.defineNetwork(xml, (err, network) => {
                expect(err).to.not.exist;
                expect(network).to.exist;
                expect(network._parent).to.exist;

                network.start((err, result) => {
                    expect(err).to.not.exist;
                    expect(result).to.be.true;
                    done();
                });
            });
        });

        it("should create and start a new virtual network from its xml description", (done) => {
            const xml = fixture("network.xml");
            test.hypervisor.createNetwork(xml, (err, network) => {
                expect(err).to.not.exist;
                expect(network).to.exist;
                expect(network._parent).to.exist;

                network.getName((err, name) => {
                    expect(err).to.not.exist;
                    expect(name).to.exist;
                    expect(name).to.equal("test");
                    done();
                });
            });
        });

        it("should lookup the network by name", (done) => {
            test.hypervisor.lookupNetworkByName("default", (err, network) => {
                expect(err).to.not.exist;
                expect(network).to.exist;
                expect(network._parent).to.exist;

                network.getName((err, name) => {
                    expect(err).to.not.exist;
                    expect(name).to.exist;
                    expect(name).to.equal("default");
                    done();
                });
            });
        });

        it("should define a network from its xml description", (done) => {
            const xml = fixture("network.xml");
            test.hypervisor.defineNetwork(xml, (err, network) => {
                expect(err).to.not.exist;
                expect(network).to.exist;
                expect(network._parent).to.exist;

                network.getName((err, name) => {
                    expect(err).to.not.exist;
                    expect(name).to.exist;
                    expect(name).to.equal("test");
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

                test.hypervisor.lookupNetworkByName("default", (err, network) => {
                    expect(err).to.not.exist;
                    expect(network).to.exist;
                    expect(network._parent).to.exist;
                    test.network = network;
                    done();
                });
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist;
                test.network = undefined;
                done();
            });
        });

        it("should determine if the network has a persistent configuration", (done) => {
            test.network.isPersistent((err, persistent) => {
                expect(err).to.not.exist;
                expect(persistent).to.be.true;
                done();
            });
        });

        it("should determine if the network is currently running", (done) => {
            test.network.isActive((err, active) => {
                expect(err).to.not.exist;
                expect(active).to.be.true;
                done();
            });
        });

        it("should provide a xml network description", (done) => {
            test.network.toXml((err, data) => {
                expect(err).to.not.exist;
                expect(data).to.match(/<name>default<\/name>/);
                done();
            });
        });

        it("should return the network uuid", (done) => {
            test.network.getUUID((err, uuid) => {
                expect(err).to.not.exist;
                expect(uuid).to.exist;
                done();
            });
        });

        it("should return the network name", (done) => {
            test.network.getName((err, name) => {
                expect(err).to.not.exist;
                expect(name).to.exist;
                expect(name).to.equal("default");
                done();
            });
        });

        it("should return the bridge interface name", (done) => {
            test.network.getBridgeName((err, name) => {
                expect(err).to.not.exist;
                expect(name).to.equal("virbr0");
                done();
            });
        });

        it("should indicate if the network is configured to be automatically started when the host boots", (done) => {
            test.network.getAutostart((err, autostart) => {
                expect(err).to.not.exist;
                expect(autostart).to.exist;
                expect(autostart).to.be.false;
                done();
            });
        });

        it("should configure the network to be automatically started when the host boots", (done) => {
            test.network.setAutostart(false, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                done();
            });

            /*
             NOTE: doesn't work with test driver
             expect(test.network.getAutostart()).to.be.false;
       
             expect(test.network.setAutostart(true)).to.be.ok;
             expect(test.network.getAutostart()).to.be.true;
             */
        });

        it("should lookup the network by uuid", (done) => {
            test.network.getUUID((err, uuid) => {
                expect(err).to.not.exist;
                expect(uuid).to.exist;

                test.hypervisor.lookupNetworkByUUID(uuid, (err, network) => {
                    expect(err).to.not.exist;
                    expect(network).to.exist;
                    expect(network._parent).to.exist;

                    network.getName((err, name) => {
                        expect(err).to.not.exist;
                        expect(name).to.exist;
                        expect(name).to.equal("default");
                        done();
                    });
                });
            });
        });

        it("should undefine a network", (done) => {
            const xml = fixture("network.xml");
            test.hypervisor.defineNetwork(xml, (err, network) => {
                expect(err).to.not.exist;
                expect(network).to.exist;
                expect(network._parent).to.exist;

                test.hypervisor.lookupNetworkByName("test", (err, network) => {
                    expect(err).to.not.exist;
                    expect(network).to.exist;
                    expect(network._parent).to.exist;

                    network.destroy((err, result) => {
                        expect(err).to.not.exist;
                        expect(result).to.be.true;

                        network.undefine((err, result) => {
                            expect(err).to.not.exist;
                            expect(result).to.be.true;
                            done();
                        });
                    });
                });
            });
        });

        it("should destroy a network", (done) => {
            test.network.destroy((err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                done();
            });
        });
    });
});
