const {
    std,
    application: { Application }
} = adone;

const fixture = std.path.join.bind(std.path, __dirname, "fixtures");

describe("application", "Application", () => {
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

    it("parent subsystem should be 'undefined' for main application", () => {
        class TestApp extends Application {
        }
        const testApp = new TestApp();
        assert.undefined(testApp.parent);
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
        const result = await forkProcess(fixture("no_public_props_and_getters.js"));
        assert.equal(result.stdout, "true");
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
        describe("add", () => {
            it("valid subsystem", async () => {
                const result = await forkProcess(fixture("add_valid_subsystem.js"));
                assert.equal(result.stdout, "configure\ninitialize\nuninitialize");
            });

            it("valid subsystem from path", async () => {
                const result = await forkProcess(fixture("add_valid_subsystem_from_path.js"));
                assert.equal(result.stdout, "configure\ninitialize\nuninitialize");
            });

            it("valid subsystems from path", async () => {
                const result = await forkProcess(fixture("add_valid_subsystems_from_path.js"));
                assert.equal(result.stdout, "hello configure\nhello configure\nhello configure\nhello init\nhello init\nhello init\nhello uninit\nhello uninit\nhello uninit");
            });

            it("not valid subsystem", async () => {
                const result = await forkProcess(fixture("add_not_valid_subsystem.js"));
                assert.equal(result.stdout, "incorrect subsystem");
            });

            it("not valid subsystem from", async () => {
                const result = await forkProcess(fixture("add_not_valid_subsystem_from_path.js"));
                assert.equal(result.stdout, "incorrect subsystem");
            });

            describe("subsystem name and name collisions", () => {
                it("it's impossible to set name", () => {
                    class SubSys extends adone.application.Subsystem {
                        constructor() {
                            super();
                            this.name = "ownname";
                        }
                    }

                    const err = assert.throws(() => new SubSys());
                    assert.instanceOf(err, TypeError);
                });

                it("should throw if a subsystem with the same name already exists", async () => {
                    await assert.throws(async () => {
                        await forkProcess(fixture("add_existing_name.js"));
                    }, "Subsystem with name 'hello' already exists");
                });

                it("should throw if a subsystem with the same name already exists when the subsytem name is set implicitly", async () => {
                    await assert.throws(async () => {
                        await forkProcess(fixture("add_existing_implicit_name.js"));
                    }, "Subsystem with name 'Hello' already exists");
                });
            });

            it("add subsystem and bind it", async () => {
                const result = await forkProcess(fixture("add_and_bind.js"));
                assert.equal(result.stdout, "true\nsome_data\nfalse");
            });

            it("add subsystem and bind it with unallowed name", async () => {
                await assert.throws(async () => forkProcess(fixture("add_and_bind_notallowed_name.js")), "Property with name 'removeListener' is already exist");
            });
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

        it("root subsystem", async () => {
            const result = await forkProcess(fixture("root_subsystem.js"));
            assert.equal(result.stdout, "true\ntrue\ntrue\ntrue");
        });


        describe("deleteSubsystem", () => {
            it("delete an uninitialized subsystem", async () => {
                const result = await forkProcess(fixture("delete_uninitialized_subsystem.js"));
                assert.equal(result.stdout, "configure\ninitialize\nmain\nuninitialize\nfalse");
            });

            it("should throw on delete of initialized subsystem", async () => {
                const result = await forkProcess(fixture("delete_initialized_subsystem.js"));
                assert.equal(result.stdout, "configure\ninitialize\nmain\nThe subsystem is used and can not be deleted\ntrue\nuninitialize");
            });
        });

        describe("unloadSubsystem", () => {
            it("should unload and delete subsystem", async () => {
                const result = await forkProcess(fixture("unload_initialized_subsystem.js"));
                assert.equal(result.stdout, [
                    "hello configure",
                    "hello init",
                    "main",
                    "hello uninit",
                    "has false"
                ].join("\n"));
            });

            it("should wait for uninitialized if the subsystem is unitializing", async () => {
                const result = await forkProcess(fixture("unload_slow_uninitialize.js"));
                assert.equal(result.stdout, [
                    "hello configure",
                    "hello init",
                    "main",
                    "hello uninit",
                    "has false"
                ].join("\n"));
            });

            it("should wait for initialized and then uninit and delete the subsystem if it is initializing", async () => {
                const result = await forkProcess(fixture("unload_slow_initialize.js"));
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "hello uninit",
                    "has false"
                ].join("\n"));
            });

            it("should wait for initialized and then uninit and delete the subsystem if it is configuring", async () => {
                const result = await forkProcess(fixture("unload_slow_configure.js"));
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "hello uninit",
                    "has false"
                ].join("\n"));
            });

            it("should throw if the subsystem is unknown", async () => {
                await assert.throws(async () => {
                    await forkProcess(fixture("unload_unknown_subsystem.js"));
                }, /Unknown subsystem: hello/);
            });

            it("should clear the require cache and then load the new code", async () => {
                const result = await forkProcess(fixture("unload_and_load.js"));
                assert.equal(result.stdout, [
                    "hello1 configure",
                    "hello1 init",
                    "main",
                    "hello1 uninit",
                    "has false",
                    "cached false",
                    "hello2 configure",
                    "hello2 init",
                    "hello2 uninit",
                    "hello3 configure",
                    "hello3 init",
                    "hello3 uninit"
                ].join("\n"));
            });
        });

        describe("loadSubsystem", () => {
            it("should add, configure and initialize a new subsystem using an absolute path", async () => {
                const result = await forkProcess(fixture("load_external_subsystem.js"), [
                    fixture("subsystem", "hello.js")
                ]);
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "hello uninit"
                ].join("\n"));
            });

            it("should add and initialize a new subsystem using a Subsystem instance", async () => {
                const result = await forkProcess(fixture("load_local_subsystem.js"));
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "hello uninit"
                ].join("\n"));
            });

            it("should not transpile by default", async () => {
                const err = await assert.throws(async () => {
                    await forkProcess(fixture("load_external_subsystem.js"), [
                        fixture("subsystem", "hello_need_transpile.js")
                    ]);
                });
                assert.match(err.stderr, /Unexpected token/);
            });

            it("should transpile if transpile = true", async () => {
                const result = await forkProcess(fixture("load_external_subsystem.js"), [
                    fixture("subsystem", "hello_need_transpile.js"),
                    "--transpile"
                ]);
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "hello uninit"
                ].join("\n"));
            });

            it("should set name to the subsystem class name by default", async () => {
                const result = await forkProcess(fixture("load_external_subsystem.js"), [
                    fixture("subsystem", "hello.js"),
                    "--print-meta"
                ]);
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "name Hello",
                    "description ",
                    "hello uninit"
                ].join("\n"));
            });

            it("should set a custom name if defined", async () => {
                const result = await forkProcess(fixture("load_external_subsystem.js"), [
                    fixture("subsystem", "hello.js"),
                    "--name", "hellosubsystem",
                    "--print-meta"
                ]);
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "name hellosubsystem",
                    "description ",
                    "hello uninit"
                ].join("\n"));
            });

            it("should set a custom description if defined", async () => {
                const result = await forkProcess(fixture("load_external_subsystem.js"), [
                    fixture("subsystem", "hello.js"),
                    "--description", "Description",
                    "--print-meta"
                ]);
                assert.equal(result.stdout, [
                    "main",
                    "hello configure",
                    "hello init",
                    "name Hello",
                    "description Description",
                    "hello uninit"
                ].join("\n"));
            });

            it("should throw if not an absolute path is provided", async () => {
                await assert.throws(async () => {
                    await forkProcess(fixture("load_not_abs_argument.js"));
                }, /must be absolute/);
            });

            it("should throw if neither a subsystem nor an absolute path is provided", async () => {
                await assert.throws(async () => {
                    await forkProcess(fixture("load_invalid_argument.js"));
                }, "'subsystem' should be path or instance of adone.application.Subsystem");
            });
        });

        describe("owning", () => {
            class Sys extends adone.application.Subsystem {
            }

            class SubSys extends adone.application.Subsystem {
            }

            it("by default subsystem should not be owned", () => {
                const sys = new Sys();
                assert.false(sys.isOwned);
            });

            it("subsystem should be owned after addSubsystem() and should be freed after deleteSubsystem() ", () => {
                const sys = new Sys();

                const subSys = new SubSys();
                assert.false(sys.isOwned);

                sys.addSubsystem({
                    name: "s",
                    subsystem: subSys
                });

                assert.false(sys.isOwned);
                assert.true(subSys.isOwned);

                sys.deleteSubsystem("s");

                assert.false(sys.isOwned);
                assert.false(subSys.isOwned);
            });

            it("subsystem can be owned once", () => {
                const sys = new Sys();

                const subSys = new SubSys();

                sys.addSubsystem({
                    name: "s",
                    subsystem: subSys
                });

                const err = assert.throws(() => sys.addSubsystem({
                    name: "s1",
                    subsystem: subSys
                }));
                assert.instanceOf(err, adone.x.NotAllowed);
            });
        });
    });
});
