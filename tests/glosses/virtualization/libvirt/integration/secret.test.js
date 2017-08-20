const {
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const fixture = require("../lib/helper").fixture;

const test = {
    // helper while developing
    removeSecret(uuid) {
        return test.hypervisor.lookupSecretByUUIDAsync(uuid).then((secret) => {
            return secret.undefineAsync();
        });
    }
};

describe("Secret (integration)", () => {
    before(() => {
        SegfaultHandler.registerHandler();
    });

    describe("hypervisor methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("qemu:///system");
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

        it("should be located through its uuid", () => {
            return test.hypervisor.defineSecretAsync(fixture("secret.xml")).then((secret) => {
                return secret.getUUIDAsync();
            }).then((uuid) => {
                return test.hypervisor.lookupSecretByUUIDAsync(uuid);
            }).then((secret) => {
                expect(secret).to.exist;
                return secret.undefineAsync();
            });
        });

        it("should support setValue/getValue (#89)", async () => {
            const data = "some_test_value";
            let secret;
            try {
                secret = await test.hypervisor.defineSecretAsync(fixture("secret2.xml"));
                await secret.setValueAsync(data);
                const result = await secret.getValueAsync();
                expect(result).to.eql(data);
            } catch (err) {
                adone.error(err);
            } finally {
                if (secret) {
                    await secret.undefineAsync();
                }
            }
        });
    });
});
