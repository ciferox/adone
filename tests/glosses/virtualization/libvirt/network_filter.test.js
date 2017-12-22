const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("./lib/helper").fixture;

const test = {};
describe("Network Filter", () => {
    before(() => {
        SegfaultHandler.registerHandler();
    });

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
            done();
        });
    });

    it("should define network filter from its xml description", (done) => {
        // NOTE: test driver does not provide mechanisms to test this function
        const xml = fixture("network_filter.xml");
        test.hypervisor.defineNetworkFilter(xml, (err, filter) => {
            expect(err.code).to.equal(libvirt.VIR_ERR_NO_SUPPORT);
            // expect(err).to.not.exist();
            // expect(filter).to.exist();
            done();
        });
    });

    it("should return the network filter name", () => {
        //test driver does not provide mechanisms to test this function
        //filter.getName().should_be 'default'
    });

    it("should return the network filter UUID", () => {
        //test driver does not provide mechanisms to test this function
        //filter.GetUUID().should_not_be undefined
    });

    it("should return the xml description of the network filter", () => {
        //test driver does not provide mechanisms to test this function
        //var xml = filter.toXml();
    });

    it("should look up the network filter based in its name", (done) => {
        // NOTE: test driver does not provide mechanisms to test this function
        test.hypervisor.lookupNetworkFilterByName("test-eth0", (err, filter) => {
            expect(err.code).to.equal(libvirt.VIR_ERR_NO_SUPPORT);
            done();

            // expect(err).to.not.exist();

            // filter.getName(function(err, name) {
            //   expect(err).to.not.exist();
            //   expect(name).to.equal('default');
            //   done();
            // });
        });
    });

    it("should look up the network filter based in its UUID", (done) => {
        // NOTE: test driver does not provide mechanisms to test this function
        test.hypervisor.lookupNetworkFilterByName("test-eth0", (err, filter1) => {
            expect(err.code).to.equal(libvirt.VIR_ERR_NO_SUPPORT);
            done();

            // expect(err).to.not.exist();

            // filter.getUUID(function(err, uuid) {
            //   expect(err).to.not.exist();

            //   test.hypervisor.lookupNetworkFilterByUUID(function(err, filter2) {
            //     expect(err).to.not.exist();

            //     filter2.getName(function(err, name) {
            //       expect(err).to.not.exist();
            //       expect(name).to.equal('test-eth0');
            //       done();
            //     });
            //   });
            // });
        });
    });

    it("should undefine the network filter", () => {
        //test driver does not provide mechanisms to test this function
        //filter.undefine().should_be true
    });
});
