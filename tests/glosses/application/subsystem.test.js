const {
    application: { Subsystem, DSubsystem },
    error
} = adone;

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
        }, error.NotAllowed);
    });

    it("should throw on changing parent", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.parent = new Subsystem();
        }, error.NotAllowed);
    });

    it("should throw on changing state", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.state = adone.application.STATE.RUNNING;
        }, error.NotAllowed);
    });

    it("should throw on changing root", () => {
        const ss = create("ss");
        assert.throws(() => {
            ss.root = new Subsystem();
        }, error.NotAllowed);
    });

    describe("dependencies", () => {
        let rootSys;
        let configureOrder;
        let initializeOrder;
        let uninitializeOrder;


        @DSubsystem({
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

        @DSubsystem({
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

        @DSubsystem()
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
