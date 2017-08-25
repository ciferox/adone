const {
    std,
    system: { process: { exec, execStdout } },
    application: { Application }
} = adone;

const fixture = std.path.join.bind(std.path, __dirname, "fixtures");

describe("application", "Application", () => {
    it("by default should use script name as application name", async () => {
        const name = await execStdout("node", [fixture("test_name.js")]);
        assert.equal(name, "test_name");
    });

    it("should exit with correct code", async () => {
        const err = await assert.throws(async () => exec("node", [fixture("exit_code.js")]));
        assert.equal(err.code, 7);
    });

    it("should not process args and use correct argv", async () => {
        const expectedArgv = ["a", "b", "8", "--cc"];
        const argv = await execStdout("node", [fixture("argv.js")].concat(expectedArgv));
        assert.equal(argv, expectedArgv.join(" "));
    });

    describe("Subsystems", () => {
        it("should self referenced as subsystem", () => {
            class TestApp extends Application {
            }
            const testApp = new TestApp();
            assert.deepEqual(testApp, testApp.app);
        });
    });
});
