const {
    app: { Subsystem, SubsystemMeta },
    error,
    std
} = adone;

const fixture = (name) => std.path.join(__dirname, "fixtures", name);

describe("application", "Subsystem", () => {
    const create = (name) => new Subsystem({ name });
    it("default initialization", () => {
        const ss = create();
        assert.undefined(ss.name);
    });

    it("initialization with name", () => {
        const ss = create("super");
        assert.equal(ss.name, "super");
    });

    it("should throw on changing name", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.name = "dd";
        }, error.NotAllowedException);
    });

    it("should throw on changing parent", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.parent = new Subsystem();
        }, error.NotAllowedException);
    });

    it("should throw on changing state", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.state = adone.app.STATE.RUNNING;
        }, error.NotAllowedException);
    });

    it("should throw on changing root", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.root = new Subsystem();
        }, error.NotAllowedException);
    });

    it("check presence and get all of subsystems", () => {
        const ss = create("root");
        assert.false(ss.hasSubsystems());

        ss.addSubsystem({
            name: "ss1",
            subsystem: create("ss1")
        });

        ss.addSubsystem({
            name: "ss2",
            subsystem: create("ss2")
        });

        assert.true(ss.hasSubsystems());
        assert.lengthOf(ss.getSubsystems(), 2);
    });

    describe("groups", () => {
        it("check presence and get all of subsystems", () => {
            const ss = create("root");
            assert.false(ss.hasSubsystems());
    
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
    
            assert.false(ss.hasSubsystems("1"));
            assert.true(ss.hasSubsystems());
            assert.true(ss.hasSubsystems("2"));
            assert.true(ss.hasSubsystems("3"));
            
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


        @SubsystemMeta({
            dependencies: ["sys2"]
        })
        class Sys1 extends Subsystem {
            configure() {
                configureOrder.push(1);
            }

            initialize() {
                initializeOrder.push(1);
            }

            uninitialize() {
                uninitializeOrder.push(1);
            }
        }

        @SubsystemMeta({
            dependencies: ["sys3"]
        })
        class Sys2 extends Subsystem {
            configure() {
                configureOrder.push(2);
            }

            initialize() {
                initializeOrder.push(2);
            }

            uninitialize() {
                uninitializeOrder.push(2);
            }
        }

        @SubsystemMeta()
        class Sys3 extends Subsystem {
            configure() {
                configureOrder.push(3);
            }

            initialize() {
                initializeOrder.push(3);
            }

            uninitialize() {
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

            await rootSys._configure();
            assert.deepEqual(configureOrder, [3, 2, 1]);

            await rootSys._initialize();
            assert.deepEqual(initializeOrder, [3, 2, 1]);

            await rootSys._uninitialize();
            assert.deepEqual(uninitializeOrder, [1, 2, 3]);
        });
    });
});
