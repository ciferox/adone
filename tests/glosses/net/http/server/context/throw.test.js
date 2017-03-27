describe("glosses", "net", "http", "server", "context", "throw", () => {
    const { net: { http: { server: { Context } } } } = adone;

    const context = () => new Context({}, {}, {});

    describe("ctx.throw(msg)", () => {
        it("should set .status to 500", (done) => {
            const ctx = context();

            try {
                ctx.throw("boom");
            } catch (err) {
                assert(err.status === 500);
                assert(!err.expose);
                done();
            }
        });
    });

    describe("ctx.throw(err)", () => {
        it("should set .status to 500", (done) => {
            const ctx = context();
            const err = new Error("test");

            try {
                ctx.throw(err);
            } catch (err) {
                assert(err.status === 500);
                assert(err.message === "test");
                assert(!err.expose);
                done();
            }
        });
    });

    describe("ctx.throw(status, err)", () => {
        it("should throw the error and set .status", (done) => {
            const ctx = context();
            const error = new Error("test");

            try {
                ctx.throw(422, error);
            } catch (err) {
                assert(err.status === 422);
                assert(err.message === "test");
                assert(err.expose === true);
                done();
            }
        });
    });

    describe("ctx.throw(status, msg)", () => {
        it("should throw an error", (done) => {
            const ctx = context();

            try {
                ctx.throw(400, "name required");
            } catch (err) {
                assert(err.message === "name required");
                assert(err.status === 400);
                assert(err.expose === true);
                done();
            }
        });
    });

    describe("ctx.throw(status)", () => {
        it("should throw an error", (done) => {
            const ctx = context();

            try {
                ctx.throw(400);
            } catch (err) {
                assert(err.message === "Bad Request");
                assert(err.status === 400);
                assert(err.expose === true);
                done();
            }
        });

        describe("when not valid status", () => {
            it("should not expose", (done) => {
                const ctx = context();

                try {
                    const err = new Error("some error");
                    err.status = -1;
                    ctx.throw(err);
                } catch (err) {
                    assert(err.message === "some error");
                    assert(!err.expose);
                    done();
                }
            });
        });
    });

    describe("ctx.throw(status, msg, props)", () => {
        it("should mixin props", (done) => {
            const ctx = context();

            try {
                ctx.throw(400, "msg", { prop: true });
            } catch (err) {
                assert(err.message === "msg");
                assert(err.status === 400);
                assert(err.expose === true);
                assert(err.prop === true);
                done();
            }
        });

        describe("when props include status", () => {
            it("should be ignored", (done) => {
                const ctx = context();

                try {
                    ctx.throw(400, "msg", {
                        prop: true,
                        status: -1
                    });
                } catch (err) {
                    assert(err.message === "msg");
                    assert(err.status === 400);
                    assert(err.expose === true);
                    assert(err.prop === true);
                    done();
                }
            });
        });
    });

    describe("ctx.throw(msg, props)", () => {
        it("should mixin props", (done) => {
            const ctx = context();

            try {
                ctx.throw("msg", { prop: true });
            } catch (err) {
                assert(err.message === "msg");
                assert(err.status === 500);
                assert(err.expose === false);
                assert(err.prop === true);
                done();
            }
        });
    });

    describe("ctx.throw(status, props)", () => {
        it("should mixin props", (done) => {
            const ctx = context();

            try {
                ctx.throw(400, { prop: true });
            } catch (err) {
                assert(err.message === "Bad Request");
                assert(err.status === 400);
                assert(err.expose === true);
                assert(err.prop === true);
                done();
            }
        });
    });

    describe("ctx.throw(err, props)", () => {
        it("should mixin props", (done) => {
            const ctx = context();

            try {
                ctx.throw(new Error("test"), { prop: true });
            } catch (err) {
                assert(err.message === "test");
                assert(err.status === 500);
                assert(err.expose === false);
                assert(err.prop === true);
                done();
            }
        });
    });
});
