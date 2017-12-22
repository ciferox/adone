import getInstances from "./get_instances";
import options from "./options";
import jsonSchemaTest from "./json_schema_test";

describe("schema", "json schema", () => {
    const remoteRefs = {
        "http://localhost:1234/integer.json": require("./remotes/integer.json"),
        "http://localhost:1234/subSchemas.json": require("./remotes/sub_schemas.json"),
        "http://localhost:1234/folder/folderInteger.json": require("./remotes/folder/folder_integer.json")
    };

    const thisDir = new adone.fs.Directory(__dirname);
    const testsDir = thisDir.getDirectory("tests");

    const draft4Dir = testsDir.getDirectory("draft4");
    const draft4Files = draft4Dir.findSync().map((x) => x.relativePath(thisDir));
    runTest(getInstances(adone.util.clone(options, { meta: false })), 4, draft4Files);

    const draft6Dir = testsDir.getDirectory("draft6");
    const draft6Files = draft6Dir.findSync().map((x) => x.relativePath(thisDir));
    runTest(getInstances(adone.util.clone(options)), 6, draft6Files);


    function runTest(instances, draft, tests) {
        instances.forEach((instance) => {
            instance.addMetaSchema(adone.schema.refs["json-schema-draft-04"]);
            if (draft === 4) {
                instance._opts.defaultMeta = "http://json-schema.org/draft-04/schema#";
            }
            for (const id in remoteRefs) {
                instance.addSchema(remoteRefs[id], id);
            }
        });

        jsonSchemaTest(instances, {
            description: `JSON-Schema Test Suite draft-0${draft}: ${instances.length} instances with different options`,
            suites: { tests },
            only: [
                // 'type', 'not', 'allOf', 'anyOf', 'oneOf', 'enum',
                // 'maximum', 'minimum', 'multipleOf', 'maxLength', 'minLength', 'pattern',
                // 'properties', 'patternProperties', 'additionalProperties',
                // 'dependencies', 'required',
                // 'maxProperties', 'minProperties', 'maxItems', 'minItems',
                // 'items', 'additionalItems', 'uniqueItems',
                // 'optional/format', 'optional/bignum',
                // 'ref', 'refRemote', 'definitions',
            ],
            skip: ["optional/zeroTerminatedFloats"],
            assert,
            afterEach: (res) => {
                expect(res.valid).to.be.a("boolean");
                if (res.valid === true) {
                    expect(res.errors).to.be.null();
                } else {
                    expect(res.errors).to.be.an("array");
                    for (const err of res.errors) {
                        expect(err).to.be.an("object");
                    }
                }
            },
            cwd: __dirname,
            hideFolder: `draft${draft}/`,
            timeout: 120000
        });
    }

});
