const {
    assertion,
    error,
    fsm: { StateMachine },
    promise
} = adone;

assertion.use(assertion.extension.checkmark);

describe("fsm", () => {
    const scheme1 = {
        initial: "new",
        transitions: [
            { event: "create", from: "new", to: "created" },
            { event: "delete", from: "created", to: "deleted" },
            { event: "reset", from: "*", to: "new" }
        ]
    };

    const scheme2 = {
        initial: "initial",
        transitions: [
            { event: "configure", from: "initial", to: ["configuring", "configured"] },
            { event: "initialize", from: "configured", to: ["initializing", "initialized"] },
            { event: "bad", from: "configured", to: "unknown" }
        ]
    };

    it("should throw without initial state", () => {
        assert.throws(() => new StateMachine({}), error.NotValidException, /Initial state/);
    });

    it("should throw without transitions", () => {
        assert.throws(() => new StateMachine({ initial: "new" }), error.NotValidException, /Transitions/);
    });

    describe("publick methods", () => {
        const methods = [
            "getState",
            "onInvalidTransition",
            "waitUntilStateEnters",
            "waitUntilStateLeaves"
        ];

        for (const method of methods) {
            it(`${method}()`, () => {
                const sm = new StateMachine(scheme1);
                assert.isFunction(sm[method]);
            });
        }
    });

    it("getState() should return initial state", () => {
        const sm = new StateMachine(scheme1);
        assert.equal(sm.getState(), "new");
    });

    it("should create transition methods", () => {
        const sm = new StateMachine(scheme1);

        assert.isFunction(sm.create);
        assert.isFunction(sm.delete);
        assert.isFunction(sm.reset);
    });

    it("should emit state event on transition", (done) => {
        const sm = new StateMachine(scheme1);

        sm.on("state", (st) => {
            assert.equal(st, "created");
            done();
        });

        sm.create();
    });

    it("should call async handler method with args for transision event", async (done) => {
        expect(2).checks(done);

        class My extends StateMachine {
            async onCreate(...args) {
                promise.delay(1);
                return args;
            }
        }
        const sm = new My(scheme1);

        sm.on("state", (st) => {
            expect(st).to.be.equal("created").mark();
        });

        expect(await sm.create(1, 2, 3)).to.have.members([1, 2, 3]).mark();
    });

    it("should call overrided transition method instead of event-named", async (done) => {
        expect(2).checks(done);

        class My extends StateMachine {
            async onCreate() {
                assert.fail("Ыhould not be called");
            }

            async create(...args) {
                promise.delay(1);
                return args;
            }
        }
        const sm = new My(scheme1);

        sm.on("state", (st) => {
            expect(st).to.be.equal("created").mark();
        });

        expect(await sm.create(1, 2, 3)).to.have.members([1, 2, 3]).mark();
    });

    it("should emit trasition pre and post events", async (done) => {
        expect(3).checks(done); 

        class My extends StateMachine {
            onConfigure(...args) {
                return args;
            }
        }
        const sm = new My(scheme2);

        const expectedStates = ["configuring", "configured"];
        sm.on("state", (st) => {
            expect(st).to.be.equal(expectedStates.shift()).mark();
        });

        expect(await sm.configure(1, 2, 3)).to.have.members([1, 2, 3]).mark();
    });

    it("should emit event and throw when invalid transition is happend", async (done) => {
        expect(2).checks(done); 

        const sm = new StateMachine(scheme2);

        sm.on("invalidTransition", (event, st) => {
            expect(event).to.be.equal("bad");
            expect(st).to.be.equal("initial").mark();
        });

        await assert.throws(async () => sm.bad(), error.IllegalStateException);
        expect(true).to.be.ok.mark();
    });

    it("waitUntilStateEnters() without timeout", async (done) => {
        const st = new StateMachine(scheme2);

        st.waitUntilStateEnters("initialized").then(done);

        await st.configure();
        await st.initialize();
    });

    it("waitUntilStateEnters() with timeout", async (done) => {
        const st = new StateMachine(scheme2);

        st.waitUntilStateEnters("configured", 500).then(done);
        st.waitUntilStateEnters("configured", 500).then(() => assert.fail("bad")).catch(done);

        await promise.delay(300);
        await st.configure();
        await promise.delay(300);
        await st.initialize();
    });

    it("waitUntilStateLeaves() without timeout", async (done) => {
        const st = new StateMachine(scheme2);

        await st.configure();
        st.waitUntilStateLeaves("configured").then(done);

        await st.initialize();
    });

    it("waitUntilStateLeaves() with timeout", async (done) => {
        const st = new StateMachine(scheme2);

        st.waitUntilStateLeaves("initial", 500).then(done);
        await st.configure();
        st.waitUntilStateLeaves("configured", 100).then(() => assert.fail("bad")).catch(done);
        await promise.delay(300);
        await st.initialize();
    });
});
