import { TEST_SCHEMA } from "./support/schema";

describe("data", "yaml", "loader", () => {
    const { fs, data: { yaml } } = adone;
    const fixtures = new fs.Directory(__dirname, "common_samples");
    const files = fs.readdirSync(fixtures.path());

    for (const rfile of files) {
        const file = fixtures.getFile(rfile);
        if (file.extname() !== ".js") {
            continue;
        }
        specify(file.filename().slice(0, -3), async () => {
            const yamlFile = fixtures.getFile(`${rfile.slice(0, -3)}.yml`);
            const expected = require(file.path());
            let actual = [];

            yaml.loadAll(await yamlFile.contents(), (doc) => {
                actual.push(doc);
            }, { filename: yamlFile, schema: TEST_SCHEMA });

            if (actual.length === 1) {
                actual = actual[0];
            }

            if (typeof expected === "function") {
                expected.call(this, actual);
            } else {
                assert.deepEqual(actual, expected);
            }
        });
    }
});
