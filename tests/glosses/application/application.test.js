const {
    std,
    // system: { process: { exec, execStdout } },
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
        const result = await forkProcess(fixture("test_name.js"));
        assert.equal(result.stdout, "test_name");
    });

    it("should exit with correct code", async () => {
        const err = await assert.throws(async () => forkProcess(fixture("exit_code.js")));
        assert.equal(err.code, 7);
    });

    it("Correct sequential method call at startup", async () => {
        const result = await forkProcess(fixture("correct_bootstrap.js"));
        assert.equal(result.stdout, "configured\ninitialized\nrun\nuninitialized");
    });

    it("parent subsystem should be 'null' for main application", () => {
        class TestApp extends Application {
        }
        const testApp = new TestApp();
        assert.isNull(testApp.parent);
    });

    it("Compact application with properties", async () => {
        const result = await forkProcess(fixture("compact.js"));
        assert.equal(result.stdout, "non configured\nconfigured\ninitialized\nrun\nadone compact application\nuninitialized");
    });

    it("Should not run invalid application", async () => {
        const err = await assert.throws(async () => forkProcess(fixture("invalid.js")));
        assert.equal(err.code, 1);
        assert.equal(err.stderr, "\u001b[31mInvalid application class (should be derivative of 'adone.application.Application')\u001b[39m\n");
    });

    it("no public properties instead of application's reserved", async () => {
        const expected = ["parent", "name"];
        const result = await forkProcess(fixture("public_reserved_props.js"));
        const props = result.stdout.split(";");
        assert.sameMembers(props, expected);
    });

    it("'isMain' is not writable", async () => {
        const result = await forkProcess(fixture("is_main_not_writable.js"));
        assert.equal(result.stdout, "ok");
    });

    it("correct application exception handling during uninitialization", async () => {
        const err = await assert.throws(async () => forkProcess(fixture("exception_on_uninitialization")));
        assert.equal(err.code, 1);
        assert.match(err.stderr, /Something bad happend during uninitialization/);
    });

    describe("Subsystems", () => {
        it("add valid subsystem", async () => {
            const result = await forkProcess(fixture("add_valid_subsystem.js"));
            assert.equal(result.stdout, "configure\ninitialize\nuninitialize");
        });

        it("add valid subsystem from path", async () => {
            const result = await forkProcess(fixture("add_valid_subsystem_from_path.js"));
            assert.equal(result.stdout, "configure\ninitialize\nuninitialize");
        });

        it("add not valid subsystem", async () => {
            const result = await forkProcess(fixture("add_not_valid_subsystem.js"));
            assert.equal(result.stdout, "incorrect subsystem");
        });

        it("add not valid subsystem from", async () => {
            const result = await forkProcess(fixture("add_not_valid_subsystem_from_path.js"));
            assert.equal(result.stdout, "incorrect subsystem");
        });

        it("initialization and deinitialization of subsystems in accordance with the order of their addition", async () => {
            const result = await forkProcess(fixture("subsystems_order.js"));
            assert.equal(result.stdout, "app_configure\nconfigure1\nconfigure2\napp_initialize\ninitialize1\ninitialize2\napp_uninitialize\nuninitialize2\nuninitialize1");
        });

        for (let i = 1; i <= 2; i++) {
            // eslint-disable-next-line
            it(`get subsystem by name (${i})`, async () => {
                const result = await forkProcess(fixture(`get_subsystem${i}.js`));
                assert.equal(result.stdout, "test subsystem");
            });
        }

        it("get unknown subsystem", async () => {
            const err = await assert.throws(async () => forkProcess(fixture("get_unknown_subsystem.js")));
            assert.equal(err.code, 1);
            assert.match(err.stderr, /Unknown subsystem/);
        });

        it("subsystem custom initialization", async () => {
            const result = await forkProcess(fixture("subsystem_custom_initialize.js"));
            assert.equal(result.stdout, "c\nc1\nc2\ni2\ni\ni1\nu\nu2\nu1");
        });

        it("subsystem custom deinitialization", async () => {
            const result = await forkProcess(fixture("subsystem_custom_uninitialize.js"));
            assert.equal(result.stdout, "c\nc1\nc2\ni\ni1\ni2\nu1\nu\nu2");
        });

        it("simple reinitialization", async () => {
            const result = await forkProcess(fixture("simple_reinitialization.js"));
            assert.equal(result.stdout, "non configured\nconfigured\ninitialized\nmain\nuninitialized\ninitialized\nuninitialized");
        });

        it("complex reinitialization", async () => {
            const result = await forkProcess(fixture("complex_reinitialization.js"));
            assert.equal(result.stdout, "nc\nc\nc1\nc11\nc111\nc112\nc2\ni\ni1\ni11\ni111\ni112\ni2\nm\nr\nu\nu2\nu1\nu11\nu112\nu111\ni\ni1\ni11\ni111\ni112\ni2\nu\nu2\nu1\nu11\nu112\nu111");
        });

        it("complex custom reinitialization", async () => {
            const result = await forkProcess(fixture("complex_custom_reinitialization.js"));
            assert.equal(result.stdout, "nc\nc\nc1\nc11\nc111\nc112\nc2\ni2\ni\ni1\ni11\ni111\ni112\nm\nr\nu\nu2\nu1\nu111\nu11\nu112\ni2\ni\ni1\ni11\ni111\ni112\nu\nu2\nu1\nu111\nu11\nu112");
        });
    });
});
