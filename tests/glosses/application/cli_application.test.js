const {
    std
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
        const result = await forkProcess(fixture("argv.js"), expectedArgv);
        assert.equal(result.stdout, expectedArgv.join(" "));
    });

    it("no public properties instead of application's reserved", async () => {
        const result = await forkProcess(fixture("no_public_props_and_getters_cli.js"));
        assert.equal(result.stdout, "true");
    });

    describe("before run event", () => {
        it("main command", async () => {
            const result = await forkProcess(fixture("before_run_cli.js"));
            assert.equal(result.stdout, "before run before_run_cli\nmain");
        });

        it("regular command", async () => {
            const result = await forkProcess(fixture("before_run_cli.js"), ["regular"]);
            assert.equal(result.stdout, "before run regular,r\nregular");
        });

        it("failed command", async () => {
            const err = await assert.throws(async () => forkProcess(fixture("before_run_cli.js"), ["failed"]));
            assert.match(err.stderr, /something bad happened/);
        });
    });
});
