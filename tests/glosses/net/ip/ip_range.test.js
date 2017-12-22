const {
    net: { ip: { IPRange, IP4, IP6 } },
    util
} = adone;

describe("net", "ip", "IPRange", () => {
    describe("v4", () => {
        it("should describe ipv4 range", () => {
            const range = new IPRange("192.168.1.23", "192.168.1.122");
            expect(range.type).to.be.equal(4);
            const addresses = [...range];
            expect(addresses).to.have.lengthOf(100);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP4);
            }
            addresses.sort((a, b) => {
                return a.toBigNumber().cmp(b.toBigNumber());
            });
            for (const [i, addr] of util.enumerate(addresses, 23)) {
                expect(addr.address).to.be.equal(`192.168.1.${i}`);
            }
        });

        it("should sort addresses", () => {
            const range = new IPRange("192.168.1.23", "192.168.1.122");
            const addresses = [...range.sort()];
            expect(addresses).to.have.lengthOf(100);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP4);
            }
            for (const [i, addr] of util.enumerate(addresses, 23)) {
                expect(addr.address).to.be.equal(`192.168.1.${i}`);
            }
        });

        it("should work for different subnets", () => {
            const range = new IPRange("192.168.0.18", "192.168.4.43");
            const addresses = [...range.sort()];
            expect(addresses).to.have.lengthOf(256 - 18 + 256 * 3 + 44);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP4);
            }
            const it = addresses[Symbol.iterator]();
            for (let i = 18; i < 256; ++i) {
                expect(it.next().value.address).to.be.equal(`192.168.0.${i}`);
            }
            for (let j = 1; j < 4; ++j) {
                for (let i = 0; i < 256; ++i) {
                    expect(it.next().value.address).to.be.equal(`192.168.${j}.${i}`);
                }
            }
            for (let i = 0; i < 44; ++i) {
                expect(it.next().value.address).to.be.equal(`192.168.4.${i}`);
            }
            expect(it.next().done).to.be.true();
        });
    });

    describe("v6", () => {
        it("should describe ipv6 range", () => {
            const range = new IPRange("::192.168.1.23", "::192.168.1.122");
            expect(range.type).to.be.equal(6);
            const addresses = [...range];
            expect(addresses).to.have.lengthOf(100);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP6);
            }
            addresses.sort((a, b) => {
                return a.toBigNumber().cmp(b.toBigNumber());
            });
            for (const [i, addr] of util.enumerate(addresses, 23)) {
                expect(addr.to4().address).to.be.equal(`192.168.1.${i}`);
            }
        });

        it("should sort addresses", () => {
            const range = new IPRange("::192.168.1.23", "::192.168.1.122");
            const addresses = [...range.sort()];
            expect(addresses).to.have.lengthOf(100);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP6);
            }
            for (const [i, addr] of util.enumerate(addresses, 23)) {
                expect(addr.to4().address).to.be.equal(`192.168.1.${i}`);
            }
        });

        it("should work for different subnets", () => {
            const range = new IPRange("::192.168.0.18", "::192.168.4.43");
            const addresses = [...range.sort()];
            expect(addresses).to.have.lengthOf(256 - 18 + 256 * 3 + 44);
            for (const addr of addresses) {
                expect(addr).to.be.instanceOf(IP6);
            }
            const it = addresses[Symbol.iterator]();
            for (let i = 18; i < 256; ++i) {
                expect(it.next().value.to4().address).to.be.equal(`192.168.0.${i}`);
            }
            for (let j = 1; j < 4; ++j) {
                for (let i = 0; i < 256; ++i) {
                    expect(it.next().value.to4().address).to.be.equal(`192.168.${j}.${i}`);
                }
            }
            for (let i = 0; i < 44; ++i) {
                expect(it.next().value.to4().address).to.be.equal(`192.168.4.${i}`);
            }
            expect(it.next().done).to.be.true();
        });
    });
});
