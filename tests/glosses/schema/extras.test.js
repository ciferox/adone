import getInstances from "./get_instances";
import options from "./options";
import jsonSchemaTest from "./json_schema_test";

describe("glosses", "schema", "extras", () => {
    const instances = getInstances(options, {
        $data: true,
        patternGroups: true,
        unknownFormats: ["allowedUnknown"]
    });

    const thisDir = new adone.fs.Directory(__dirname);
    const extrasDir = thisDir.getVirtualDirectory("extras");
    const extrasFiles = extrasDir.findSync().map((x) => x.relativePath(thisDir));


    jsonSchemaTest(instances, {
        description: `Extra keywords schemas tests of ${instances.length} instances with different options`,
        suites: {
            extras: extrasFiles
        },
        assert,
        afterEach: (res) => {
            expect(res.valid).to.be.a("boolean");
            if (res.valid === true) {
                expect(res.errors).to.be.null;
            } else {
                expect(res.errors).to.be.an("array");
                for (const err of res.errors) {
                    expect(err).to.be.an("object");
                }
            }
        },
        cwd: __dirname,
        hideFolder: "extras/",
        timeout: 90000
    });
});
