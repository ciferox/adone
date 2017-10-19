const {
    std,
    system: { process: { exec, execStdout } },
    application: { CliApplication }
} = adone;

const fixture = std.path.join.bind(std.path, __dirname, "fixtures");

describe("application", "CliApplication", () => {
    let prevRoot = null;

    before(() => {
        // define env var to require correct adone inside fixture apps
        prevRoot = process.env.ADONE_ROOT_PATH; // ?
        process.env.ADONE_ROOT_PATH = adone.rootPath;
    });

    after(() => {
        process.env.ADONE_ROOT_PATH = prevRoot;
    });

    it("should not parse args and use correct argv", async () => {
        const expectedArgv = ["a", "b", "8", "--cc"];
        const argv = await execStdout("node", [fixture("argv.js")].concat(expectedArgv));
        assert.equal(argv, expectedArgv.join(" "));
    });

    it("no public properties instead of application's reserved", async () => {
        const expected = ["_", "data", "parent", "argv", "name"];
        const stdout = await execStdout("node", [fixture("public_reserved_props_cli.js")]);
        const props = stdout.split(";");
        assert.sameMembers(props, expected);
    });
});
