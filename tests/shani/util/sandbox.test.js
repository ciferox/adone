describe("shani", "util", "sandbox", () => {
    const {
        sandbox,
        stub,
        match,
        assert: sassert,
        __: {
            Collection
        }
    } = adone.shani.util;

    it("inherits collection", () => {
        assert(sandbox() instanceof Collection);
    });

    it("creates sandboxes", () => {
        const s = sandbox.create();

        assert.isObject(s);
        assert(s instanceof sandbox.Sandbox);
    });

    it("exposes match", () => {
        const s = sandbox.create();

        assert.equal(s.match, match);
    });

    it("exposes assert", () => {
        const s = sandbox.create();

        assert.equal(s.assert, sassert);
    });

    describe(".usingPromise", () => {
        beforeEach(function () {
            this.sandbox = new sandbox.Sandbox();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("must be a function", function () {

            assert.isFunction(this.sandbox.usingPromise);
        });

        it("must return the sandbox", function () {
            const mockPromise = {};

            const actual = this.sandbox.usingPromise(mockPromise);

            assert.equal(actual, this.sandbox);
        });

        it("must set all stubs created from sandbox with mockPromise", function () {

            const resolveValue = {};
            const mockPromise = {
                resolve: stub.create().resolves(resolveValue)
            };

            this.sandbox.usingPromise(mockPromise);
            const s = this.sandbox.stub().resolves();

            return s()
                .then((action) => {

                    assert.equal(resolveValue, action);
                    assert(mockPromise.resolve.calledOnce);
                });
        });

        it("must set all stubs created from sandbox with mockPromise", function () {

            const resolveValue = {};
            const mockPromise = {
                resolve: stub.create().resolves(resolveValue)
            };
            const stubbedObject = {
                stubbedMethod() {

                }
            };

            this.sandbox.usingPromise(mockPromise);
            this.sandbox.stub(stubbedObject);
            stubbedObject.stubbedMethod.resolves({});

            return stubbedObject.stubbedMethod()
                .then((action) => {

                    assert.equal(resolveValue, action);
                    assert(mockPromise.resolve.calledOnce);
                });
        });
    });

    describe(".inject", () => {
        beforeEach(function () {
            this.obj = {};
            this.sandbox = sandbox.create();
        });

        afterEach(function () {
            this.sandbox.restore();
        });

        it("injects spy, stub, mock", function () {
            this.sandbox.inject(this.obj);

            assert.isFunction(this.obj.spy);
            assert.isFunction(this.obj.stub);
            assert.isFunction(this.obj.mock);
        });

        it("should return object", function () {
            const injected = this.sandbox.inject({});

            assert.isObject(injected);
            assert.isFunction(injected.spy);
        });
    });

    describe(".restore", () => {
        it("throws when passed arguments", () => {
            const s = sandbox.create();

            assert.throws(() => {
                s.restore("args");
            }, "sandbox.restore() does not take any parameters. Perhaps you meant stub.restore()");
        });
    });

    describe("getters and setters", () => {
        it("allows stubbing getters", () => {
            const object = {
                foo: "bar"
            };

            const s = sandbox.create();
            s.stub(object, "foo").get(() => {
                return "baz";
            });

            assert.equal(object.foo, "baz");
        });

        it("allows restoring getters", () => {
            const object = {
                foo: "bar"
            };

            const s = sandbox.create();
            s.stub(object, "foo").get(() => {
                return "baz";
            });

            s.restore();

            assert.equal(object.foo, "bar");
        });

        it("allows stubbing setters", () => {
            const object = {
                prop: "bar",
                foo: undefined
            };

            const s = sandbox.create();
            s.stub(object, "foo").set((val) => {
                object.prop = `${val}bla`;
            });

            object.foo = "bla";

            assert.equal(object.prop, "blabla");
        });

        it("allows restoring setters", () => {
            const object = {
                prop: "bar"
            };

            const s = sandbox.create();
            s.stub(object, "prop").set(function setterFn(val) {
                object.prop = `${val}bla`;
            });

            s.restore();

            object.prop = "bla";

            assert.equal(object.prop, "bla");
        });
    });
});
