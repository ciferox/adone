describe("glosses", "net", "http", "server", "utils", "geoip", "reader", () => {
    const { geoip: { maxmind: { __: { Reader } } } } = adone;

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");

    describe("findAddressInTree()", () => {

        it("should work for most basic case", async () => {
            const reader = new Reader(await fixtures.getVirtualFile("GeoIP2-City-Test.mmdb").content(null));
            assert.equal(reader.findAddressInTree("1.1.1.1"), null);
        });

        it("should return correct value: city database", async () => {
            const reader = new Reader(await fixtures.getVirtualFile("GeoIP2-City-Test.mmdb").content(null));
            assert.equal(reader.findAddressInTree("1.1.1.1"), null);
            assert.equal(reader.findAddressInTree("175.16.199.1"), 3042);
            assert.equal(reader.findAddressInTree("175.16.199.88"), 3042);
            assert.equal(reader.findAddressInTree("175.16.199.255"), 3042);
            assert.equal(reader.findAddressInTree("::175.16.199.255"), 3042);
            assert.equal(reader.findAddressInTree("::ffff:175.16.199.255"), 3042);
            assert.equal(reader.findAddressInTree("2a02:cf40:ffff::"), 4735);
            assert.equal(reader.findAddressInTree("2a02:cf47:0000::"), 4735);
            assert.equal(reader.findAddressInTree("2a02:cf47:0000:fff0:ffff::"), 4735);
            assert.equal(reader.findAddressInTree("2a02:cf48:0000::"), null);
        });

        it("should return correct value: string entries", async () => {
            const reader = new Reader(await fixtures.getVirtualFile("MaxMind-DB-string-value-entries.mmdb").content(null));
            assert.equal(reader.findAddressInTree("1.1.1.1"), 98);
            assert.equal(reader.findAddressInTree("1.1.1.2"), 87);
            assert.equal(reader.findAddressInTree("175.2.1.1"), null);
        });

        describe("various record sizes and ip versions", () => {
            const ips = {
                v4: {
                    "1.1.1.1": 102,
                    "1.1.1.2": 90,
                    "1.1.1.32": 114,
                    "1.1.1.33": null
                },
                v6: {
                    "::1:ffff:fffa": null,
                    "::1:ffff:ffff": 176,
                    "::2:0000:0000": 194,
                    "::2:0000:0060": null
                },
                mix: {
                    "1.1.1.1": 315,
                    "1.1.1.2": 301,
                    "1.1.1.32": 329,
                    "1.1.1.33": null,
                    "::1:ffff:fffa": null,
                    "::1:ffff:ffff": 344,
                    "::2:0000:0000": 362,
                    "::2:0000:0060": null
                }
            };

            const scenarios = {
                "MaxMind-DB-test-ipv4-24.mmdb": ips.v4,
                "MaxMind-DB-test-ipv4-28.mmdb": ips.v4,
                "MaxMind-DB-test-ipv4-32.mmdb": ips.v4,
                "MaxMind-DB-test-ipv6-24.mmdb": ips.v6,
                "MaxMind-DB-test-ipv6-28.mmdb": ips.v6,
                "MaxMind-DB-test-ipv6-32.mmdb": ips.v6,
                "MaxMind-DB-test-mixed-24.mmdb": ips.mix,
                "MaxMind-DB-test-mixed-28.mmdb": ips.mix,
                "MaxMind-DB-test-mixed-32.mmdb": ips.mix
            };

            for (const file in scenarios) {
                (function (file, ips) {
                    it(`should return correct value: ${file}`, async () => {
                        const reader = new Reader(await fixtures.getVirtualFile(file).content(null));
                        for (const ip in ips) {
                            assert.equal(reader.findAddressInTree(ip), ips[ip], `IP: ${ip}`);
                        }
                    });
                })(file, scenarios[file]);
            }
        });

        describe("broken files and search trees", () => {
            it("should behave fine when there is no  ipv4 search tree", async () => {
                const reader = new Reader(await fixtures.getVirtualFile("MaxMind-DB-no-ipv4-search-tree.mmdb").content(null));
                assert.equal(reader.findAddressInTree("::1:ffff:ffff"), 80);
                // TODO: perhaps null should be returned here, note that pointer is larger than file itself
                assert.equal(reader.findAddressInTree("1.1.1.1"), 4811873);
            });

            it("should behave fine when search tree is broken", async () => {
                // TODO: find out in what way the file is broken
                const reader = new Reader(await fixtures.getVirtualFile("MaxMind-DB-test-broken-search-tree-24.mmdb").content(null));
                assert.equal(reader.findAddressInTree("1.1.1.1"), 102);
                assert.equal(reader.findAddressInTree("1.1.1.2"), 90);
            });
        });

        describe("invalid database format", () => {
            it("should provide meaningful message when one tries to use unknown format", async () => {
                const content = await fixtures.getVirtualFile("broken.dat").content(null);
                assert.throws(() => {
                    new Reader(content);
                }, /Cannot parse binary database/);
            });
        });
    });
});
