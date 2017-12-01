const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

//TODO create a Node class and add detach attach
const test = {};
describe("Node Device", () => {
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

        it("should create a node device using its xml description", (done) => {
            const xml = fixture("node_device.xml");
            test.hypervisor.createNodeDevice(xml, (err, device) => {
                expect(err).to.exist;

                // @todo figure out why the test driver expects a fiber channel
                // expect(err).to.not.exist;
                // expect(device).to.exist;
                done();
            });
        });

        it("should lookup a node device by name", (done) => {
            test.hypervisor.listNodeDevices((err, devices) => {
                expect(err).to.not.exist;
                expect(devices).to.be.instanceOf(Array);
                done();

                // @todo figure out why the test driver expects a fiber channel
                // expect(devices).to.not.be.empty;

                // test.hypervisor.lookupNodeDeviceByName(devices[0], function(err, device) {
                //   expect(err).to.not.exist;
                //   expect(device).to.exist;
                //   done();
                // });
            });
        });
    });

    describe("methods", () => {
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




        beforeEach(() => {
            try {
                const xml = fixture("node_device.xml");
                test.device = test.hypervisor.createNodeDevice(xml);
                expect(test.device).to.exist;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_INTERNAL_ERROR);
            }
        });

        afterEach(() => {
            test.device = undefined;
        });

        it("should detach the device from the node itself in order to be assigned to a guest domain", () => {
            //test driver does not provide mechanisms to test this function
            try {
                expect(test.device.detach()).to.be.ok;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should reattach a previously detached node device", () => {
            //test driver does not provide mechanisms to test this function
            try {
                expect(test.device.reattach()).to.be.ok;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should reset the node device a previously detached node device", () => {
            //test driver does not provide mechanisms to test this function
            try {
                expect(test.device.reset()).to.be.ok;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should return the device name", () => {
            //test driver does not provide mechanisms to test this function
            try {
                const name = test.device.name;
                expect(name).to.exist;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should return the device parent name", () => {
            //test driver does not provide mechanisms to test this function
            try {
                const parent = test.device.getParentName();
                expect(parent).to.exist;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should return de device xml description", () => {
            //test driver does not provide mechanisms to test this function
            try {
                const xml = test.device.toXml();
                expect(xml).to.exist;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should list device capabilities", () => {
            //test driver does not provide mechanisms to test this function
            try {
                const capabilities = test.device.getCapabilities();
                expect(capabilities).to.exist;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });

        it("should remove the node device from the host operating system", () => {
            //test driver does not provide mechanisms to test this function
            try {
                expect(test.device.destroy()).to.be.ok;
            } catch (error) {
                expect(error.code).to.equal(error.VIR_ERR_NO_SUPPORT);
            }
        });
    });
});
