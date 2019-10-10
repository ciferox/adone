const {
    is,
    assertion,
    error,
    app: { Subsystem, subsystem },
    promise,
    std
} = adone;

assertion.use(assertion.extension.checkmark);

const fixture = (name) => std.path.join(__dirname, "fixtures", name);


describe("Subsystem", () => {
    class SS extends Subsystem {
        async onConfigure(...args) {
            await promise.delay(1);
            return args;
        }

        async onInitialize(...args) {
            await promise.delay(1);
            return args;
        }

        async onUninitialize(...args) {
            await promise.delay(1);
            return args;
        }
    }

    const create = (name) => new Subsystem({ name });

    it("default initialization", () => {
        const ss = create();
        assert.isUndefined(ss.name);
        assert.isFalse(ss.owned);
    });

    it("initialization with name", () => {
        const ss = create("super");
        assert.equal(ss.name, "super");
    });

    it("should throw on attempt to changing name property", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.name = "dd";
        }, error.ImmutableException);
    });

    it("should throw on attempt to changing owned property", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.owned = true;
        }, error.ImmutableException);
    });

    it("should throw on attempt to changing parent property", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.parent = new Subsystem();
        }, error.ImmutableException);
    });

    it("initial state by default", () => {
        const ss = create();
        assert.equal(ss.getState(), "initial");
        assert.isTrue(ss.isRoot);
    });

    describe("public methods", () => {
        const methods = [
            "configure",
            "initialize",
            "uninitialize",
            "reinitialize",
            "configureSubsystems",
            "initializeSubsystems",
            "uninitializeSubsystems",
            "reinitializeSubsystems",
            "configureSubsystem",
            "loadSubsystem",
            "unloadSubsystem",
            "initializeSubsystem",
            "uninitializeSubsystem",
            "reinitializeSubsystem",
            "getSubsystem",
            "hasSubsystem",
            "hasSubsystems",
            "getSubsystemInfo",
            "getSubsystems",
            "addSubsystem",
            "addSubsystemsFrom",
            "instantiateSubsystem",
            "deleteSubsystem"
        ];

        const ss = create("ss");

        for (const method of methods) {
            // eslint-disable-next-line no-loop-func
            it(`${method}()`, () => {
                assert.isFunction(ss[method]);
            });
        }
    });

    describe("common transitions", () => {
        const cases = [
            {
                name: "default subsystem",
                args: ["a", "b", "c"],
                create: () => create("root"),
                returns: undefined
            },
            {
                name: "with transition handlers",
                args: ["a", "b", "c"],
                create: () => new SS("root"),
                returns: ["a", "b", "c"]
            }
        ];

        for (const cAse of cases) {
            describe(cAse.name, () => {
                it("allow configure from 'initial' state", async (done) => {
                    const ss = cAse.create();

                    expect(3).checks(done);

                    const expectedStates = ["configuring", "configured"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                });

                it("configure in 'configured' state should have thrown", async (done) => {
                    const ss = cAse.create();

                    expect(3).checks(done);

                    const expectedStates = ["configuring", "configured"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });


                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                    await assert.throws(async () => ss.configure(), error.IllegalStateException);
                });

                it("allow initialize from 'configured' state", async (done) => {
                    const ss = cAse.create();

                    expect(6).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                });

                it("initialize in 'initialized' state should have thrown", async (done) => {
                    const ss = cAse.create();

                    expect(6).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                    await assert.throws(async () => ss.initialize(), error.IllegalStateException);
                });

                it("allow uninitialize from 'initialized' state", async (done) => {
                    const ss = cAse.create();

                    expect(9).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized", "uninitializing", "uninitialized"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                });

                it("uninitialize in 'uninitialized' state should have thrown", async (done) => {
                    const ss = cAse.create();

                    expect(9).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized", "uninitializing", "uninitialized"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                    await assert.throws(async () => ss.uninitialize(), error.IllegalStateException);
                });

                it("allow configure from 'uninitialized' state", async (done) => {
                    const ss = cAse.create();

                    expect(12).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized", "uninitializing", "uninitialized", "configuring", "configured"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                });

                it("allow initialize from 'uninitialized' state", async (done) => {
                    const ss = cAse.create();

                    expect(12).checks(done);

                    const expectedStates = ["configuring", "configured", "initializing", "initialized", "uninitializing", "uninitialized", "initializing", "initialized"];
                    ss.on("state", (state) => {
                        expect(state).to.be.equal(expectedStates.shift()).mark();
                    });

                    if (is.array(cAse.returns)) {
                        expect(await ss.configure(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.have.members(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.have.members(cAse.returns).mark();
                    } else {
                        expect(await ss.configure(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.uninitialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                        expect(await ss.initialize(...cAse.args)).to.be.equal(cAse.returns).mark();
                    }
                });
            });
        }
    });

    it("reinitialize from 'initialized' state", async (done) => {
        const ss = new SS();

        expect(9).checks(done);

        const expectedStates = ["configuring", "configured", "initializing", "initialized", "uninitializing", "uninitialized", "initializing", "initialized"];
        ss.on("state", (state) => {
            expect(state).to.be.equal(expectedStates.shift()).mark();
        });

        await ss.configure();
        await ss.initialize();
        assert.deepEqual(await ss.reinitialize("a", "b"), [["a", "b"], ["a", "b"]]);
        expect(true).to.be.ok.mark();
    });

    it("configure from 'fail' state", async (done) => {
        class SS extends Subsystem {
            onInitialize() {
                throw new error.NotValidException("quuuiizzaahhh");
            }
        }
        const ss = new SS();

        expect(7).checks(done);

        const expectedStates = ["configuring", "configured", "initializing", "fail", "configuring", "configured"];
        ss.on("state", (state) => {
            expect(state).to.be.equal(expectedStates.shift()).mark();
        });

        await ss.configure();
        await assert.throws(async () => ss.initialize());
        assert.equal(ss.getState(), "fail");
        await ss.configure();
        expect(true).to.be.ok.mark();
    });

    it("check presence and get all of subsystems", () => {
        const ss = create("root");
        assert.isFalse(ss.hasSubsystems());

        ss.addSubsystem({
            name: "ss1",
            subsystem: create("ss1")
        });

        ss.addSubsystem({
            name: "ss2",
            subsystem: create("ss2")
        });

        assert.isTrue(ss.hasSubsystems());
        assert.lengthOf(ss.getSubsystems(), 2);

        assert.strictEqual(ss.getSubsystem("ss1").root, ss);
        assert.strictEqual(ss.getSubsystem("ss2").root, ss);

        const ss2 = ss.getSubsystem("ss2");
        ss2.addSubsystem({
            name: "ss21",
            subsystem: create("ss21")
        });
        assert.strictEqual(ss2.getSubsystem("ss21").root, ss);
        assert.strictEqual(ss2.getSubsystem("ss21").parent, ss2);
    });

    describe("groups", () => {
        it("check presence and get all of subsystems", () => {
            const ss = create("root");
            assert.isFalse(ss.hasSubsystems());
    
            ss.addSubsystem({
                name: "ss1",
                subsystem: create("ss1")
            });
    
            ss.addSubsystem({
                name: "ss2-1",
                subsystem: create("ss2-1"),
                group: "2"
            });

            ss.addSubsystem({
                name: "ss2-2",
                subsystem: create("ss2-1"),
                group: "2"
            });

            ss.addSubsystem({
                name: "ss3",
                subsystem: create("ss3"),
                group: "3"
            });
    
            assert.isFalse(ss.hasSubsystems("1"));
            assert.isTrue(ss.hasSubsystems());
            assert.isTrue(ss.hasSubsystems("2"));
            assert.isTrue(ss.hasSubsystems("3"));
            
            assert.lengthOf(ss.getSubsystems("1"), 0);
            assert.lengthOf(ss.getSubsystems("2"), 2);
            assert.lengthOf(ss.getSubsystems("3"), 1);
            assert.lengthOf(ss.getSubsystems(), 4);
        });
    });

    describe("load subsystems", () => {
        it("load subsystems from path, when name is equal to class name", async () => {
            const ss = create("ss");
            await ss.addSubsystemsFrom(fixture("subsystems"), {
                transpile: true
            });

            assert.sameMembers(ss.getSubsystems().map((ssInfo) => ssInfo.name), ["Sub0", "Sub1", "Sub2", "Sub3"]);
        });

        it("load subsystems from path, when name is equal to file/dir name", async () => {
            const ss = create("ss");
            await ss.addSubsystemsFrom(fixture("subsystems"), {
                useFilename: true,
                transpile: true
            });

            assert.sameMembers(ss.getSubsystems().map((ssInfo) => ssInfo.name), ["sub0", "sub1", "sub2", "sub3"]);
        });
    });

    describe("dependencies", () => {
        let rootSys;
        let configureOrder;
        let initializeOrder;
        let uninitializeOrder;


        @subsystem({
            dependencies: ["sys2"]
        })
        class Sys1 extends Subsystem {
            onConfigure() {
                configureOrder.push(1);
            }

            onInitialize() {
                initializeOrder.push(1);
            }

            onUninitialize() {
                uninitializeOrder.push(1);
            }
        }

        @subsystem({
            dependencies: ["sys3"]
        })
        class Sys2 extends Subsystem {
            onConfigure() {
                configureOrder.push(2);
            }

            onInitialize() {
                initializeOrder.push(2);
            }

            onUninitialize() {
                uninitializeOrder.push(2);
            }
        }

        @subsystem()
        class Sys3 extends Subsystem {
            onConfigure() {
                configureOrder.push(3);
            }

            onInitialize() {
                initializeOrder.push(3);
            }

            onUninitialize() {
                uninitializeOrder.push(3);
            }
        }

        beforeEach(() => {
            configureOrder = [];
            initializeOrder = [];
            uninitializeOrder = [];

            rootSys = new Subsystem({ name: "root" });
        });

        afterEach(() => {

        });

        it("dependency", async () => {
            rootSys.addSubsystem({
                name: "sys2",
                subsystem: new Sys2()
            });
            rootSys.addSubsystem({
                name: "sys1",
                subsystem: new Sys1()
            });
            rootSys.addSubsystem({
                name: "sys3",
                subsystem: new Sys3()
            });

            await rootSys.configure();
            assert.deepEqual(configureOrder, [3, 2, 1]);

            await rootSys.initialize();
            assert.deepEqual(initializeOrder, [3, 2, 1]);

            await rootSys.uninitialize();
            assert.deepEqual(uninitializeOrder, [1, 2, 3]);
        });
    });
});
