import { TEST_SCHEMA } from "./support/schema";

describe("data", "yaml", "dumper", () => {
    const { fs, data: { yaml }, is } = adone;
    const fixtures = new fs.Directory(__dirname, "common_samples");
    const files = fs.readdirSync(fixtures.path());

    for (const rfile of files) {
        const file = fixtures.getFile(rfile);
        if (file.extname() !== ".js") {
            continue;
        }
        specify(file.filename().slice(0, -3), async () => {
            const sample = require(file.path());
            const data = is.function(sample) ? sample.expected : sample;
            const serialized = yaml.dump(data, { schema: TEST_SCHEMA });
            const deserialized = yaml.load(serialized, { schema: TEST_SCHEMA });

            if (is.function(sample)) {
                sample.call(null, deserialized);
            } else {
                assert.deepEqual(deserialized, sample);
            }
        });
    }

    const fc = require("fast-check");

    // Generate valid YAML instances for yaml.safeDump
    const key = fc.string16bits();
    const values = [
        key, fc.boolean(), fc.integer(), fc.double(),
        fc.constantFrom(null, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)
    ];
    const yamlArbitrary = fc.object({ key, values });

    // Generate valid options for yaml.safeDump configuration
    const dumpOptionsArbitrary = fc.record({
        skipInvalid: fc.boolean(),
        sortKeys: fc.boolean(),
        noRefs: fc.boolean(),
        noCompatMode: fc.boolean(),
        condenseFlow: fc.boolean(),
        indent: fc.integer(1, 80),
        flowLevel: fc.integer(-1, 10),
        styles: fc.record({
            "!!null": fc.constantFrom("lowercase", "canonical", "uppercase", "camelcase"),
            "!!int": fc.constantFrom("decimal", "binary", "octal", "hexadecimal"),
            "!!bool": fc.constantFrom("lowercase", "uppercase", "camelcase"),
            "!!float": fc.constantFrom("lowercase", "uppercase", "camelcase")
        }, { with_deleted_keys: true })
    }, { with_deleted_keys: true })
        .map((instance) => {
            if (instance.condenseFlow === true && !is.undefined(instance.flowLevel)) {
                instance.flowLevel = -1;
            }
            return instance;
        });

    describe("Properties", () => {
        specify("Load from dumped should be the original object", () => {
            fc.assert(fc.property(
                yamlArbitrary,
                dumpOptionsArbitrary,
                (obj, dumpOptions) => {
                    const yamlContent = yaml.safeDump(obj, dumpOptions);
                    assert.ok(is.string(yamlContent));
                    assert.deepStrictEqual(yaml.safeLoad(yamlContent), obj);
                }));
        });
    });
});
