import getInstances from "./get_instances";
import options from "./options";
import jsonSchemaTest from "./json_schema_test";

describe("schema", "schema", () => {
    const instances = getInstances(adone.util.clone(options), {
        unknownFormats: ["allowedUnknown"]
    });
    const remoteRefs = {
        "http://localhost:1234/integer.json": require("./remotes/integer.json"),
        "http://localhost:1234/folder/folderInteger.json": require("./remotes/folder/folder_integer.json"),
        "http://localhost:1234/name.json": require("./remotes/name.json")
    };
    const remoteRefsWithIds = [
        require("./remotes/bar.json"),
        require("./remotes/foo.json"),
        require("./remotes/buu.json"),
        require("./remotes/tree.json"),
        require("./remotes/node.json"),
        require("./remotes/second.json"),
        require("./remotes/first.json"),
        require("./remotes/scope_change.json")
    ];

    instances.forEach(function addRemoteRefs(validator) {
        validator.addMetaSchema(adone.schema.refs["json-schema-draft-04"]);
        for (const id in remoteRefs) {
            validator.addSchema(remoteRefs[id], id);
        }
        validator.addSchema(remoteRefsWithIds);
    });

    const thisDir = new adone.fs.Directory(__dirname);
    const testsDir = thisDir.getVirtualDirectory("tests");
    const files = testsDir
        .filesSync()
        .filter((x) => !x.filename().startsWith("draft"))
        .map((x) => x.findSync().map((y) => y.relativePath(thisDir)))
        .reduce((y, x) => (y.push(...x), y), []);

    jsonSchemaTest(instances, {
        description: `Schema tests of ${instances.length} instances with different options`,
        suites: {
            "Advanced schema tests": files
        },
        only: [
            // 'schemas/complex', 'schemas/basic', 'schemas/advanced',
        ],
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
        timeout: 120000
    });
});
