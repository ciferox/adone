describe("geoip", "mmdb", "Generator", () => {
    const { net: { ip: { IP4, IP6, IPRange } }, geoip: { mmdb: { __: { Reader }, Generator } }, util } = adone;

    for (const recordSize of [24, 28, 32]) {
        describe(`record size of ${recordSize}`, () => {
            const createGenerator = (opts = {}) => new Generator({
                recordSize,
                ipVersion: 4,
                majorVersion: 0,
                minorVersion: 1,
                databaseType: "MyDB",
                languages: ["en"],
                description: {
                    en: "My database"
                },
                ...opts
            });

            const createReader = (generator) => {
                const db = generator.generate();
                return new Reader(db);
            };

            const getReaderData4 = (reader) => {
                const results = [];
                reader.scan4((address, data) => {
                    results.push([address.address, data]);
                });
                return results;
            };

            const getReaderData6 = (reader) => {
                const results = [];
                reader.scan6((address, data) => {
                    results.push([address.address, data]);
                });
                return results;
            };

            const getRawReaderData6 = (reader) => {
                const results = [];
                reader.scan6((address, data) => {
                    results.push([address, data]);
                });
                return results;
            };

            it("should insert a subnet", () => {
                const generator = createGenerator();
                const data = { hello: "world" };
                generator.insertSubnet("192.168.1.0", 24, data);
                const reader = createReader(generator);
                for (const i of new IP4("192.168.1.0/24")) {
                    expect(reader.get(i.address)).to.be.deep.equal(data);
                }
                expect(getReaderData4(reader)).to.be.deep.equal([
                    ["192.168.1.0/24", data]
                ]);
            });

            it("should insert a subnet ipv6", () => {
                const generator = createGenerator({ ipVersion: 6 });
                const data = { hello: "world" };
                generator.insertSubnet("::192.168.1.0", 120, data);
                const reader = createReader(generator);
                for (const i of new IP6("::192.168.1.0/120")) {
                    expect(reader.get(i.address)).to.be.deep.equal(data);
                }
                expect(getReaderData4(reader)).to.be.deep.equal([
                    ["192.168.1.0/24", data]
                ]);
                expect(getReaderData6(reader)).to.be.deep.equal([
                    ["0:0:0:0:0:0:c0a8:100/120", data]
                ]);
            });

            it("should insert an ipv4 subnet in ipv6 db", () => {
                const generator = createGenerator({ ipVersion: 6 });
                const data = { hello: "world" };
                generator.insertSubnet("192.168.1.0", 24, data);
                const reader = createReader(generator);
                for (const i of new IP6("::192.168.1.0/120")) {
                    expect(reader.get(i.address)).to.be.deep.equal(data);
                }
                expect(getReaderData4(reader)).to.be.deep.equal([
                    ["192.168.1.0/24", data]
                ]);
                expect(getReaderData6(reader)).to.be.deep.equal([
                    ["0:0:0:0:0:0:c0a8:100/120", data]
                ]);
            });

            it("should insert an address", () => {
                const generator = createGenerator();
                for (let i = 0; i < 256; ++i) {
                    generator.insertOne(`192.168.1.${i}`, { i });
                }
                const reader = createReader(generator);
                for (const [i, address] of util.enumerate(new IP4("192.168.1.0/24"))) {
                    expect(reader.get(address.address)).to.be.deep.equal({ i });
                }
                expect(getReaderData4(reader)).to.be.deep.equal([...new IP4("192.168.1.0/24")].map((addr, i) => {
                    return [`${addr.address}/32`, { i }];
                }));
            });

            it("should insert an address ipv6", () => {
                const generator = createGenerator({ ipVersion: 6 });
                for (let i = 0; i < 256; ++i) {
                    generator.insertOne(`::192.168.1.${i}`, { i });
                }
                const reader = createReader(generator);
                for (const [i, address] of util.enumerate(new IP6("::192.168.1.0/120"))) {
                    expect(reader.get(address.address)).to.be.deep.equal({ i });
                }
                expect(getReaderData4(reader)).to.be.deep.equal([...new IP4("192.168.1.0/24")].map((addr, i) => {
                    return [`${addr.address}/32`, { i }];
                }));
                for (const [[actual, data], [i, expected]] of util.zip(getRawReaderData6(reader), util.enumerate(new IP6("::192.168.1.0/120")))) {
                    expect(actual.canonicalForm()).to.be.equal(expected.canonicalForm());
                    expect(actual.subnetMask).to.be.equal(expected.subnetMask);
                    expect(data).to.be.deep.equal({ i });
                }
            });

            it("should insert an ipv4 address in ipv6 db", () => {
                const generator = createGenerator({ ipVersion: 6 });
                for (let i = 0; i < 256; ++i) {
                    generator.insertOne(`192.168.1.${i}`, { i });
                }
                const reader = createReader(generator);
                for (const [i, address] of util.enumerate(new IP6("::192.168.1.0/120"))) {
                    expect(reader.get(address.address)).to.be.deep.equal({ i });
                }
                expect(getReaderData4(reader)).to.be.deep.equal([...new IP4("192.168.1.0/24")].map((addr, i) => {
                    return [`${addr.address}/32`, { i }];
                }));
                for (const [[actual, data], [i, expected]] of util.zip(getRawReaderData6(reader), util.enumerate(new IP6("::192.168.1.0/120")))) {
                    expect(actual.canonicalForm()).to.be.equal(expected.canonicalForm());
                    expect(actual.subnetMask).to.be.equal(expected.subnetMask);
                    expect(data).to.be.deep.equal({ i });
                }
            });

            it("should insert a range", () => {
                const generator = createGenerator();
                const data = { hello: "world" };
                generator.insertRange("192.168.1.89", "192.168.3.32", data);
                const reader = createReader(generator);
                for (const addr of new IPRange("192.168.1.89", "192.168.3.32")) {
                    expect(reader.get(addr.address)).to.be.deep.equal(data);
                }
            });

            it("should insert a range ipv6", () => {
                const generator = createGenerator({ ipVersion: 6 });
                const data = { hello: "world" };
                generator.insertRange("::192.168.1.89", "::192.168.3.32", data);
                const reader = createReader(generator);
                for (const addr of new IPRange("::192.168.1.89", "::192.168.3.32")) {
                    expect(reader.get(addr.address)).to.be.deep.equal(data);
                }
            });

            it("should insert a ipv4 range in ipv6 db", () => {
                const generator = createGenerator({ ipVersion: 6 });
                const data = { hello: "world" };
                generator.insertRange("192.168.1.89", "192.168.3.32", data);
                const reader = createReader(generator);
                for (const addr of new IPRange("::192.168.1.89", "::192.168.3.32")) {
                    expect(reader.get(addr.address)).to.be.deep.equal(data);
                }
            });

            it("should correctly work for multiple insertions", () => {
                const generator = createGenerator();
                generator.insertRange("192.168.1.0", "192.168.2.5", { planet: "Earth" });
                generator.insertSubnet("192.168.1.0", 25, { planet: "Earth", country: "Russia" });
                generator.insertSubnet("192.168.1.128", 25, { planet: "Earth", country: "China" });
                generator.insertRange("192.168.1.15", "192.168.1.47", { planet: "Earth", country: "Russia", city: "Moscow" });
                generator.insertRange("192.168.1.199", "192.168.1.237", { planet: "Earth", country: "China", city: "Beijing" });
                generator.insertOne("192.168.1.18", { planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                generator.insertOne("192.168.1.244", { planet: "Earth", country: "China", city: "Beijing", secret: true });
                generator.insertRange("192.168.2.0", "192.168.2.3", { unknown: true });
                generator.insertOne("192.168.2.5", { somethingBeautiful: true });
                const reader = createReader(generator);

                // 192.168.1.0 - 192.168.1.14 - Russia
                for (let i = 0; i < 15; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.15 - 192.168.1.1.17 - Russia Moscow
                for (let i = 15; i < 18; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.18 - Russia Moscow secret
                expect(reader.get("192.168.1.18")).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                // 192.168.1.19 - 192.168.1.47 - Russia Moscow
                for (let i = 19; i < 48; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.48 - 192.168.1.127 - Russia
                for (let i = 48; i < 128; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.128 - 192.168.1.198 - China
                for (let i = 128; i < 199; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.199 - 192.168.1.237 - China Beijing
                for (let i = 199; i < 238; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing" });
                }
                // 192.168.1.244 - China Beijing secret
                expect(reader.get("192.168.1.244")).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing", secret: true });
                // 192.168.1.245 - 192.168.1.255 - China
                for (let i = 245; i < 256; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.2.0 - 192.168.2.3 - unknown
                for (let i = 0; i < 4; ++i) {
                    expect(reader.get(`192.168.2.${i}`)).to.be.deep.equal({ unknown: true });
                }
                // 192.168.2.4 - Earth
                expect(reader.get("192.168.2.4")).to.be.deep.equal({ planet: "Earth" });
                // 192.168.2.5 - someting beautiful
                expect(reader.get("192.168.2.5")).to.be.deep.equal({ somethingBeautiful: true });
            });

            it("should correctly work for multiple insertions ipv6", () => {
                const generator = createGenerator({ ipVersion: 6 });
                generator.insertRange("::192.168.1.0", "::192.168.2.5", { planet: "Earth" });
                generator.insertSubnet("::192.168.1.0", 121, { planet: "Earth", country: "Russia" });
                generator.insertSubnet("::192.168.1.128", 121, { planet: "Earth", country: "China" });
                generator.insertRange("::192.168.1.15", "::192.168.1.47", { planet: "Earth", country: "Russia", city: "Moscow" });
                generator.insertRange("::192.168.1.199", "::192.168.1.237", { planet: "Earth", country: "China", city: "Beijing" });
                generator.insertOne("::192.168.1.18", { planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                generator.insertOne("::192.168.1.244", { planet: "Earth", country: "China", city: "Beijing", secret: true });
                generator.insertRange("::192.168.2.0", "::192.168.2.3", { unknown: true });
                generator.insertOne("::192.168.2.5", { somethingBeautiful: true });
                const reader = createReader(generator);

                // 192.168.1.0 - 192.168.1.14 - Russia
                for (let i = 0; i < 15; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.15 - 192.168.1.1.17 - Russia Moscow
                for (let i = 15; i < 18; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.18 - Russia Moscow secret
                expect(reader.get("192.168.1.18")).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                // 192.168.1.19 - 192.168.1.47 - Russia Moscow
                for (let i = 19; i < 48; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.48 - 192.168.1.127 - Russia
                for (let i = 48; i < 128; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.128 - 192.168.1.198 - China
                for (let i = 128; i < 199; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.199 - 192.168.1.237 - China Beijing
                for (let i = 199; i < 238; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing" });
                }
                // 192.168.1.244 - China Beijing secret
                expect(reader.get("192.168.1.244")).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing", secret: true });
                // 192.168.1.245 - 192.168.1.255 - China
                for (let i = 245; i < 256; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.2.0 - 192.168.2.3 - unknown
                for (let i = 0; i < 4; ++i) {
                    expect(reader.get(`192.168.2.${i}`)).to.be.deep.equal({ unknown: true });
                }
                // 192.168.2.4 - Earth
                expect(reader.get("192.168.2.4")).to.be.deep.equal({ planet: "Earth" });
                // 192.168.2.5 - someting beautiful
                expect(reader.get("192.168.2.5")).to.be.deep.equal({ somethingBeautiful: true });
            });

            it("should correctly work for multiple insertions ipv4 addresses in ipv6 db", () => {
                const generator = createGenerator({ ipVersion: 6 });
                generator.insertRange("192.168.1.0", "192.168.2.5", { planet: "Earth" });
                generator.insertSubnet("192.168.1.0", 25, { planet: "Earth", country: "Russia" });
                generator.insertSubnet("192.168.1.128", 25, { planet: "Earth", country: "China" });
                generator.insertRange("192.168.1.15", "192.168.1.47", { planet: "Earth", country: "Russia", city: "Moscow" });
                generator.insertRange("192.168.1.199", "192.168.1.237", { planet: "Earth", country: "China", city: "Beijing" });
                generator.insertOne("192.168.1.18", { planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                generator.insertOne("192.168.1.244", { planet: "Earth", country: "China", city: "Beijing", secret: true });
                generator.insertRange("192.168.2.0", "192.168.2.3", { unknown: true });
                generator.insertOne("192.168.2.5", { somethingBeautiful: true });
                const reader = createReader(generator);

                // 192.168.1.0 - 192.168.1.14 - Russia
                for (let i = 0; i < 15; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.15 - 192.168.1.1.17 - Russia Moscow
                for (let i = 15; i < 18; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.18 - Russia Moscow secret
                expect(reader.get("192.168.1.18")).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow", secret: true });
                // 192.168.1.19 - 192.168.1.47 - Russia Moscow
                for (let i = 19; i < 48; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia", city: "Moscow" });
                }
                // 192.168.1.48 - 192.168.1.127 - Russia
                for (let i = 48; i < 128; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "Russia" });
                }
                // 192.168.1.128 - 192.168.1.198 - China
                for (let i = 128; i < 199; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.199 - 192.168.1.237 - China Beijing
                for (let i = 199; i < 238; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing" });
                }
                // 192.168.1.244 - China Beijing secret
                expect(reader.get("192.168.1.244")).to.be.deep.equal({ planet: "Earth", country: "China", city: "Beijing", secret: true });
                // 192.168.1.245 - 192.168.1.255 - China
                for (let i = 245; i < 256; ++i) {
                    expect(reader.get(`192.168.1.${i}`)).to.be.deep.equal({ planet: "Earth", country: "China" });
                }
                // 192.168.2.0 - 192.168.2.3 - unknown
                for (let i = 0; i < 4; ++i) {
                    expect(reader.get(`192.168.2.${i}`)).to.be.deep.equal({ unknown: true });
                }
                // 192.168.2.4 - Earth
                expect(reader.get("192.168.2.4")).to.be.deep.equal({ planet: "Earth" });
                // 192.168.2.5 - someting beautiful
                expect(reader.get("192.168.2.5")).to.be.deep.equal({ somethingBeautiful: true });
            });
        });
    }
});
