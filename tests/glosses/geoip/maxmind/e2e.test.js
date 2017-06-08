describe("geoip", "maxmind", "geoip", () => {
    const { geoip: { maxmind }, net: { address: { IP6 } }, std: { assert } } = adone;

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");
    const source = fixtures.getVirtualDirectory("source");

    const actual = async (file) => {
        const data = JSON.parse(await source.getVirtualFile(file).content());
        const hash = {};
        data.forEach((item) => {
            for (const key in item) {
                hash[key] = item[key];
            }
        });

        return {
            hash,
            get(subnet) {
                const item = hash[subnet];
                assert(item);
                return item;
            }
        };
    };

    describe("basic functionality", () => {

        it("should successfully handle database", () => {
            assert(maxmind.openSync(fixtures.getVirtualFile("GeoIP2-City-Test.mmdb").path()));
        });

        it("should fetch geo ip", async () => {
            const geoIp = await maxmind.open(fixtures.getVirtualFile("GeoIP2-City-Test.mmdb").path());
            const data = await actual("GeoIP2-City-Test.json");
            assert.deepEqual(geoIp.get("1.1.1.1"), null);

            assert.deepEqual(geoIp.get("175.16.198.255"), null);
            assert.deepEqual(geoIp.get("175.16.199.1"), data.get("::175.16.199.0/120"));
            assert.deepEqual(geoIp.get("175.16.199.255"), data.get("::175.16.199.0/120"));
            assert.deepEqual(geoIp.get("::175.16.199.255"), data.get("::175.16.199.0/120"));
            assert.deepEqual(geoIp.get("175.16.200.1"), null);

            assert.deepEqual(geoIp.get("2a02:cf40:ffff::"), data.get("2a02:cf40::/29"));
            assert.deepEqual(geoIp.get("2a02:cf47:0000::"), data.get("2a02:cf40::/29"));
            assert.deepEqual(geoIp.get("2a02:cf48:0000::"), null);
        });

        it("should handle corrupt database", () => {
            assert.throws(function verify() {
                maxmind.openSync(__filename);
            });
        });

        it("should accept cache options", () => {
            assert(maxmind.openSync(fixtures.getVirtualFile("GeoIP2-City-Test.mmdb").path(), {
                cache: { max: 1000 }
            }));
        });
    });

    describe("section: data", () => {
        it("should decode all possible types - complex", () => {
            const geoIp = maxmind.openSync(fixtures.getVirtualFile("MaxMind-DB-test-decoder.mmdb").path());
            assert.deepEqual(geoIp.get("::1.1.1.1"), {
                array: [1, 2, 3],
                boolean: true,
                bytes: Buffer.from([0, 0, 0, 42]),
                double: 42.123456,
                // It should be 1.1, but there's some issue with rounding in v8
                float: 1.100000023841858,
                int32: -268435456,
                map: { mapX: { arrayX: [7, 8, 9], utf8_stringX: "hello" } },
                uint128: "1329227995784915872903807060280344576",
                uint16: 100,
                uint32: 268435456,
                uint64: "1152921504606846976",
                utf8_string: "unicode! ☯ - ♫"
            });
        });

        it("should decode all possible types - zero/empty values", () => {
            const geoIp = maxmind.openSync(fixtures.getVirtualFile("MaxMind-DB-test-decoder.mmdb").path());
            assert.deepEqual(geoIp.get("::0.0.0.0"), {
                array: [],
                boolean: false,
                bytes: Buffer.from([]),
                double: 0,
                float: 0,
                int32: 0,
                map: {},
                uint128: "0",
                uint16: 0,
                uint32: 0,
                uint64: "0",
                utf8_string: ""
            });
        });

        it("should return correct value: string entries", () => {
            const geoIp = maxmind.openSync(fixtures.getVirtualFile("MaxMind-DB-string-value-entries.mmdb").path());
            assert.equal(geoIp.get("1.1.1.1"), "1.1.1.1/32");
            assert.equal(geoIp.get("1.1.1.2"), "1.1.1.2/31");
            assert.equal(geoIp.get("175.2.1.1"), null);
        });
    });

    describe("section: binary search tree", () => {

        const files = [
            "GeoIP2-Anonymous-IP-Test",
            "GeoIP2-City-Test",
            "GeoIP2-Connection-Type-Test",
            "GeoIP2-Country-Test",
            "GeoIP2-Domain-Test",
            "GeoIP2-Enterprise-Test",
            "GeoIP2-ISP-Test",
            "GeoIP2-Precision-City-Test",
            "GeoIP2-Precision-ISP-Test"
        ];

        const tester = function (geoIp, data) {
            for (const subnet in data.hash) {
                const ip = new IP6(subnet);
                // TODO: check random address from the subnet?
                // see http://ip-address.js.org/#address4/biginteger
                // see https://github.com/andyperlitch/jsbn
                assert.deepEqual(geoIp.get(ip.startAddress().address), data.hash[subnet], subnet);
                assert.deepEqual(geoIp.get(ip.endAddress().address), data.hash[subnet], subnet);
            }
        };

        files.forEach((file) => {
            it(`should test everything: ${file}`, async () => {
                const geoIp = maxmind.openSync(fixtures.getVirtualFile(`${file}.mmdb`).path());
                const data = await actual(`${file}.json`);
                tester(geoIp, data);
            });
        });
    });

});
