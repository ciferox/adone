const {
    is,
    configuration,
    std
} = adone;

const fixture = std.path.join.bind(std.path.join, __dirname, "fixtures");

describe("configuration", "FileConfiguration", () => {
    let conf;

    const options = {
        base: fixture()
    };

    beforeEach(() => {
        conf = new configuration.FileConfiguration(options);
    });

    it("by default load config at root", async () => {
        await conf.load("a.js");
        assert.equal(conf.val, "value1");
        assert.equal(conf.num, 8);
        assert.isOk(is.date(conf.nowTm));
    });

    it("load config", async () => {
        await conf.load("a.js", true);
        assert.isOk(is.propertyDefined(conf, "a"));
        assert.equal(conf.a.val, "value1");
        assert.equal(conf.a.num, 8);
        assert.isOk(is.date(conf.a.nowTm));
    });

    it("should not load config without extension", async () => {
        const err = await assert.throws(async () => conf.load("a", true));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("load simple config with specified name", async () => {
        await conf.load("a.js", "common");
        assert.isOk(is.propertyDefined(conf, "common"));
        assert.equal(conf.common.val, "value1");
        assert.equal(conf.common.num, 8);
        assert.isOk(is.date(conf.common.nowTm));
    });

    it("should assign config on load several times", async () => {
        await conf.load("a.js", true);
        assert.isOk(is.propertyDefined(conf, "a"));
        assert.equal(conf.a.val, "value1");
        assert.equal(conf.a.num, 8);
        const dt = conf.a.nowTm;
        assert.isOk(is.date(dt));
        await conf.load("b.js", "a", {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf, "a"));
        assert.equal(conf.a.val, "value2");
        assert.equal(conf.a.num, 8);
        assert.isOk(is.date(conf.a.nowTm1));
        assert.equal(dt, conf.a.nowTm);
    });

    it("should throw exceptions on load es6-config without 'transpile' flag", async () => {
        const conf = new configuration.FileConfiguration();
        const err = await assert.throws(async () => conf.load(fixture("b.js"), true));
        assert.instanceOf(err, adone.x.NotValid);
    });

    it("load dir", async () => {
        await conf.load("withfns", true, {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf, "a"));
        assert.isOk(is.propertyDefined(conf, "b"));
        assert.isOk(is.propertyDefined(conf, "c"));
    });

    it("load config with function", async () => {
        await conf.load("withfns/a.js", true);
        assert.isOk(is.propertyDefined(conf, "a"));
        assert.equal(conf.a.str, "value1");
        assert.equal(conf.a.func1(), "value1");
    });

    it("load config with function at root", async () => {
        await conf.load("withfns/a.js");
        assert.equal(conf.str, "value1");
        assert.equal(conf.func1(), "value1");
    });

    it("load config with multiple functions", async () => {
        await conf.load("withfns/c.js", true, {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf, "c"));
        assert.isOk(is.date(conf.c.nowTm));
        assert.equal(conf.c.sub1.func1(), "value1");
        assert.isOk(is.date(conf.c.sub1.sub2.func1()));
        assert.equal(conf.c.sub1.sub2.func1(), conf.c.nowTm);
    });

    it("load config with multiple functions at root", async () => {
        await conf.load("withfns/c.js", null, {
            transpile: true
        });
        assert.isOk(is.date(conf.nowTm));
        assert.equal(conf.sub1.func1(), "value1");
        assert.isOk(is.date(conf.sub1.sub2.func1()));
        assert.equal(conf.sub1.sub2.func1(), conf.nowTm);
    });

    it("load config with async function", async () => {
        await conf.load("asyncfn.js", true, {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf, "asyncfn"));
        assert.equal(await conf.asyncfn.afn(adone), 777);
    });

    const formats = [".json", ".bson", ".mpak", ".json5"];

    for (const format of formats) {
        it(`${format} read`, async () => {
            const conf = new configuration.FileConfiguration(options);
            await conf.load(`a${format}`);
            assert.equal(conf.a, 1);
            assert.equal(conf.b, "adone");
            assert.equal(conf.c, true);
        });

        it(`${format} write`, async () => {
            const conf = new configuration.FileConfiguration(options);
            conf.assign({
                a: 1,
                b: "adone",
                c: true
            });
            const filename = `tmpconf${format}`;
            await conf.save(filename);

            const savedConf = new configuration.FileConfiguration(options);
            await savedConf.load(filename);
            assert.deepEqual(savedConf, conf);
            await adone.fs.unlink(adone.std.path.resolve(options.base, filename));
        });
    }

    it("should throw on read unknown format", async () => {
        try {
            const conf = new configuration.FileConfiguration(options);
            await conf.load("unsupport.dat");
        } catch (err) {
            assert.instanceOf(err, adone.x.NotSupported);
            return;
        }
        assert.fail("Should throw NotSupported exception");
    });

    it("save nested object", async () => {
        const conf = new configuration.FileConfiguration(options);
        await conf.load("b.json5", true);
        await conf.save("nested.json", "b.nested");
        const savedConf = new configuration.FileConfiguration(options);
        await savedConf.load("nested.json");
        await adone.fs.unlink(adone.std.path.resolve(options.base, "nested.json"));
        assert.equal(savedConf.str2, "val2");
        assert.equal(savedConf.num2, 8);
    });

    it("should load all es6-configs in directory", async () => {
        const conf = new configuration.FileConfiguration();
        await conf.load(fixture("es6_configs"), true, {
            transpile: true
        });
        assert.equal(conf.a.name, "adone");
        assert.equal(conf.b.name, "omnitron");
        assert.equal(conf.c.name, "specter");
    });
});
