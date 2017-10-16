const {
    is,
    configuration,
    std
} = adone;

const fixture = std.path.join.bind(std.path.join, __dirname, "fixtures");

describe("configuration", "FileConfiguration", () => {
    let conf;

    const options = {
        cwd: fixture()
    };

    beforeEach(() => {
        conf = new configuration.FileConfiguration(options);
    });

    it("by default load config at root", async () => {
        await conf.load("a.js");
        assert.equal(conf.raw.val, "value1");
        assert.equal(conf.raw.num, 8);
        assert.isOk(is.date(conf.raw.nowTm));
    });

    it("load config", async () => {
        await conf.load("a.js", true);
        assert.isOk(is.propertyDefined(conf.raw, "a"));
        assert.equal(conf.raw.a.val, "value1");
        assert.equal(conf.raw.a.num, 8);
        assert.isOk(is.date(conf.raw.a.nowTm));
    });

    it("should not load config without extension", async () => {
        const err = await assert.throws(async () => conf.load("a", true));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("load simple config with specified name", async () => {
        await conf.load("a.js", "common");
        assert.isOk(is.propertyDefined(conf.raw, "common"));
        assert.equal(conf.raw.common.val, "value1");
        assert.equal(conf.raw.common.num, 8);
        assert.isOk(is.date(conf.raw.common.nowTm));
    });

    it("should assign config on load several times", async () => {
        await conf.load("a.js", true);
        assert.isOk(is.propertyDefined(conf.raw, "a"));
        assert.equal(conf.raw.a.val, "value1");
        assert.equal(conf.raw.a.num, 8);
        const dt = conf.raw.a.nowTm;
        assert.isOk(is.date(dt));
        await conf.load("b.js", "a", {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf.raw, "a"));
        assert.equal(conf.raw.a.val, "value2");
        assert.equal(conf.raw.a.num, 8);
        assert.isOk(is.date(conf.raw.a.nowTm1));
        assert.equal(dt, conf.raw.a.nowTm);
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
        assert.isOk(is.propertyDefined(conf.raw, "a"));
        assert.isOk(is.propertyDefined(conf.raw, "b"));
        assert.isOk(is.propertyDefined(conf.raw, "c"));
    });

    it("load config with function", async () => {
        await conf.load("withfns/a.js", true);
        assert.isOk(is.propertyDefined(conf.raw, "a"));
        assert.equal(conf.raw.a.str, "value1");
        assert.equal(conf.raw.a.func1(), "value1");
    });

    it("load config with function at root", async () => {
        await conf.load("withfns/a.js");
        assert.equal(conf.raw.str, "value1");
        assert.equal(conf.raw.func1(), "value1");
    });

    it("load config with multiple functions", async () => {
        await conf.load("withfns/c.js", true, {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf.raw, "c"));
        assert.isOk(is.date(conf.raw.c.nowTm));
        assert.equal(conf.raw.c.sub1.func1(), "value1");
        assert.isOk(is.date(conf.raw.c.sub1.sub2.func1()));
        assert.equal(conf.raw.c.sub1.sub2.func1(), conf.raw.c.nowTm);
    });

    it("load config with multiple functions at root", async () => {
        await conf.load("withfns/c.js", null, {
            transpile: true
        });
        assert.isOk(is.date(conf.raw.nowTm));
        assert.equal(conf.raw.sub1.func1(), "value1");
        assert.isOk(is.date(conf.raw.sub1.sub2.func1()));
        assert.equal(conf.raw.sub1.sub2.func1(), conf.raw.nowTm);
    });

    it("load config with async function", async () => {
        await conf.load("asyncfn.js", true, {
            transpile: true
        });
        assert.isOk(is.propertyDefined(conf.raw, "asyncfn"));
        assert.equal(await conf.raw.asyncfn.afn(adone), 777);
    });

    const formats = [".json", ".bson", ".mpak", ".json5"];

    for (const format of formats) {
        it(`${format} read`, async () => {
            const conf = new configuration.FileConfiguration(options);
            await conf.load(`a${format}`);
            assert.equal(conf.raw.a, 1);
            assert.equal(conf.raw.b, "adone");
            assert.equal(conf.raw.c, true);
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
            await adone.fs.unlink(adone.std.path.resolve(options.cwd, filename));
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

    it("save nested object (string)", async () => {
        const conf = new configuration.FileConfiguration(options);
        await conf.load("b.json5", true);
        await conf.save("nested.json", "b.nested");
        const savedConf = new configuration.FileConfiguration(options);
        await savedConf.load("nested.json");
        await adone.fs.unlink(adone.std.path.resolve(options.cwd, "nested.json"));
        assert.equal(savedConf.raw.str2, "val2");
        assert.equal(savedConf.raw.num2, 8);
    });

    it("save nested object (array)", async () => {
        const conf = new configuration.FileConfiguration(options);
        await conf.load("b.json5", true);
        await conf.save("nested.json", ["b", "nested"]);
        const savedConf = new configuration.FileConfiguration(options);
        await savedConf.load("nested.json");
        await adone.fs.unlink(adone.std.path.resolve(options.cwd, "nested.json"));
        assert.equal(savedConf.raw.str2, "val2");
        assert.equal(savedConf.raw.num2, 8);
    });

    it("should load all es6-configs in directory", async () => {
        const conf = new configuration.FileConfiguration();
        await conf.load(fixture("es6_configs"), true, {
            transpile: true
        });
        assert.equal(conf.raw.a.name, "adone");
        assert.equal(conf.raw.b.name, "omnitron");
        assert.equal(conf.raw.c.name, "specter");
    });

    it("should create destination directory while save", async () => {
        const conf = new configuration.FileConfiguration(options);
        await conf.load("a.json", true);
        await conf.save(std.path.join(options.cwd, "1", "2", "3", "a.json"), true);
        await adone.fs.rm(adone.std.path.join(options.cwd, "1"));
    });
});
