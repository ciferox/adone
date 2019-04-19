const {
    is,
    configuration: { GenericConfig },
    std
} = adone;

const fixture = std.path.join.bind(std.path.join, __dirname, "fixtures");

describe("configuration", "GenericConfig", () => {
    let conf;

    const options = {
        cwd: fixture()
    };

    beforeEach(() => {
        conf = new GenericConfig(options);
    });

    it("default supported extensions", () => {
        assert.sameMembers(conf.getSupportedExtensions(), [".js", ".mjs", ".json", ".json5", ".bson", ".mpak", ".yaml"]);
    });

    it("should not load config without extension", async () => {
        await assert.throws(async () => conf.load("simple"));
    });

    it("should throw exceptions on load es6-config without 'transpile' flag", async () => {
        const conf = new GenericConfig();
        await assert.throws(async () => conf.load(fixture("simple_es.js"), true), SyntaxError);

        // load ok
        await conf.load(fixture("simple_es.js"), {
            transpile: true
        });
    });

    it("load config", async () => {
        await conf.load("simple.js");
        assert.equal(conf.raw.val, "value1");
        assert.equal(conf.raw.num, 8);
        assert.ok(is.date(conf.raw.nowTm));
    });

    const formats = [".js", ".mjs", ".json", ".bson", ".mpak", ".json5"];

    for (const format of formats) {
        // eslint-disable-next-line no-loop-func
        it(`load '${format}'`, async () => {
            const conf = new GenericConfig(options);
            await conf.load(`a${format}`);
            assert.equal(conf.raw.a, 1);
            assert.equal(conf.raw.b, "adone");
            assert.equal(conf.raw.c, true);
        });

        // eslint-disable-next-line no-loop-func
        it(`save ${format}`, async () => {
            const shouldThrow = [".js", ".mjs"].includes(format);
            const conf = new GenericConfig(options);
            conf.assign({
                a: 1,
                b: "adone",
                c: true
            });
            const filename = `tmpconf${format}`;
            try {
                await conf.save(filename);
                if (shouldThrow) {
                    assert.fail(`should throw for: ${format}`);
                }
            } catch (err) {
                if (!shouldThrow) {
                    throw err;
                }
                assert.instanceOf(err, adone.error.NotSupportedException);
                return;
            }

            const savedConf = new GenericConfig(options);
            await savedConf.load(filename);
            assert.deepEqual(savedConf, conf);
            await adone.fs.unlink(adone.std.path.resolve(options.cwd, filename));
        });
    }

    it("should throw on read unknown format", async () => {
        try {
            const conf = new GenericConfig(options);
            await conf.load("unsupport.dat");
        } catch (err) {
            assert.instanceOf(err, adone.error.NotSupportedException);
            return;
        }
        assert.fail("Should throw NotSupported error");
    });

    it("should create destination directory while save", async () => {
        const conf = new GenericConfig(options);
        await conf.load("a.json");
        await conf.save(std.path.join(options.cwd, "1", "2", "3", "a.json"));
        await adone.fs.rm(adone.std.path.join(options.cwd, "1"));
    });
});
