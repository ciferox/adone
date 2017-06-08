import { TEST_SCHEMA } from "./support/schema";

describe("data", "yaml", "dumper", () => {
    const { fs, data: { yaml }, is } = adone;
    const fixtures = new fs.Directory(__dirname, "common_samples");
    const files = fs.readdirSync(fixtures.path());

    for (const rfile of files) {
        const file = fixtures.getVirtualFile(rfile);
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
});
