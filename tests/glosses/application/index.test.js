const {
    std,
    system: { process: { exec, execStdout } },
    application: { Application }
} = adone;

const fixture = std.path.join.bind(std.path, __dirname, "fixtures");

describe("application", "Application", () => {
    let prevRoot = null;

    before(() => {
        // define env var to require correct adone inside fixture apps
        prevRoot = process.env.ADONE_ROOT_PATH; // ?
        process.env.ADONE_ROOT_PATH = adone.rootPath;
    });

    after(() => {
        process.env.ADONE_ROOT_PATH = prevRoot;
    });

    it("by default should use script name as application name", async () => {
        const name = await execStdout("node", [fixture("test_name.js")]);
        assert.equal(name, "test_name");
    });

    it("should exit with correct code", async () => {
        const err = await assert.throws(async () => exec("node", [fixture("exit_code.js")]));
        assert.equal(err.code, 7);
    });

    it("should not parse args and use correct argv", async () => {
        const expectedArgv = ["a", "b", "8", "--cc"];
        const argv = await execStdout("node", [fixture("argv.js")].concat(expectedArgv));
        assert.equal(argv, expectedArgv.join(" "));
    });

    it("Correct sequential method call at startup", async () => {
        const stdout = await execStdout("node", [fixture("correct_bootstrap.js")]);
        assert.equal(stdout, "configured\ninitialized\nrun\nuninitialized");
    });

    it("should self referenced by 'app' property", () => {
        class TestApp extends Application {
        }
        const testApp = new TestApp();
        assert.deepEqual(testApp, testApp.app);
    });

    it("Compact application with properties", async () => {
        const stdout = await execStdout("node", [fixture("compact.js")]);
        assert.equal(stdout, "non configured\nconfigured\ninitialized\nrun\nadone compact application\nuninitialized");
    });

    it("Should not run invalid application", async () => {
        const err = await assert.throws(async () => exec("node", [fixture("invalid.js")]));
        assert.equal(err.code, 1);
        assert.equal(err.stderr, "\u001b[31mInvalid application class (should be derivative of 'adone.application.Application')\u001b[39m\n");
    });

    it("no public properties instead of application's reserved", async () => {
        const expected = ["_", "data", "app", "argv", "name"];
        const stdout = await execStdout("node", [fixture("public_reserved_props.js")]);
        const props = stdout.split(";");
        assert.sameMembers(props, expected);
    });

    it("'isMain' is not writable", async () => {
        const stdout = await execStdout("node", [fixture("is_main_not_writable.js")]);
        assert.equal(stdout, "ok");
    });

    describe("Subsystems", () => {
        
    });
});
