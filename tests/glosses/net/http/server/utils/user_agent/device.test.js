describe("glosses", "net", "http", "server", "util", "user agent", "_", "device", () => {
    const { fs, data: { yaml }, net: { http: { server: { util: { userAgent } } } } } = adone;
    const { _: { Device, PartialParser } } = userAgent;

    const options = { device: true };

    describe("Device object", () => {
        it("Device constructor with no arguments", () => {
            const device = new Device();
            assert.strictEqual(device.family, "Other");
            assert.strictEqual(device.toString(), "Other");
        });

        it("Device constructor with valid arguments", () => {
            const device = new Device("Foo");
            assert.strictEqual(device.family, "Foo");
            assert.strictEqual(device.toString(), "Foo");
        });

        it("Device constructor with valid Brand Model arguments", () => {
            const device = new Device("Sang", "Gum", "Sang A");
            assert.strictEqual(device.family, "Sang");
            assert.strictEqual(device.brand, "Gum");
            assert.strictEqual(device.model, "Sang A");
            assert.strictEqual(device.toString(), "Gum Sang A");
        });
    });

    describe("Device parser", () => {
        it("parser returns a function", () => {
            assert.equal(typeof new PartialParser([]).parse, "function");
        });

        it("Parser returns an instance of Device when unsuccessful at parsing", () => {
            const parser = new PartialParser([{ regex: "foo" }], options);
            assert.ok(parser.parse("bar") instanceof Device);
        });

        it("Parser returns an instance of Device when sucessful", () => {
            const parser = new PartialParser([{ regex: "foo" }], options);
            assert.ok(parser.parse("foo") instanceof Device);
        });

        it("Parser correctly identifies Device name", () => {
            const parser = new PartialParser([{ regex: "(foo)" }], options);
            assert.strictEqual(parser.parse("foo").family, "foo");
        });

        it("Parser correctly processes replacements", () => {
            const parser = new PartialParser([{
                regex: "(foo)",
                device: "$1bar"
            }], options);

            const device = parser.parse("foo");
            assert.strictEqual(device.family, "foobar");
        });
    });

    describe("Device parser groups", () => {
        let parse = null;

        before(async () => {
            const file = new fs.File(__dirname, "fixtures", "device", "groupdevice.yml");
            const { rules } = yaml.safeLoad(await file.content());
            const parser = new PartialParser(rules, options);
            parse = parser.parse.bind(parser);
        });

        it('Parser correctly processes groups matching "gumsang"', () => {
            const device = parse("gumsang tststs");
            assert.deepEqual(device, { family: "gumsang tsts", brand: "GumSanG", model: "tsts" });
        });

        it('Parser correctly processes groups matching "THC" and "Bandroid"', () => {
            const device = parse("Bandroid THC TWO1212");
            assert.deepEqual(device, { family: "THC TWO", brand: "THC", model: "TWO 1212" });
        });

        it('Parser correctly processes groups matching "CHC"', () => {
            const device = parse("CHC POOL4 Bandroid");
            assert.deepEqual(device, { family: "CHC", brand: "CHC by THC", model: "LOOP 4" });
        });

        it("Parser correctly processes groups matching no group", () => {
            const device = parse("price YBoY");
            assert.deepEqual(device, { family: "YBoY ice", brand: "YBoY", model: "ice" });
        });

        it("Parser correctly processes groups without a match", () => {
            const device = parse("price ZBoZ");
            assert.deepEqual(device, { family: "Other", brand: null, model: null });
        });

        it("Parser correctly processes preset", () => {
            const device = parse("cool YBoY Mobile");
            assert.deepEqual(device, { family: "YBoY cool", brand: "YBoY", model: "cool", type: "mobile" });
        });
    });

});
