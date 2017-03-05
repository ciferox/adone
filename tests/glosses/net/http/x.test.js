describe("glosses", "net", "http", "x", () => {
    const { net: { http: { x } } } = adone;

    it("create(status)", () => {
        const err = x.create(404);
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
    });

    it("create(status) for 300", () => {
        const err = x.create(300);
        assert.equal(err.name, "Exception");
        assert.equal(err.message, "Multiple Choices");
        assert.equal(err.status, 300);
    });

    it("create(status) for 471", () => {
        const err = x.create(471);
        assert.equal(err.name, "BadRequest");
        assert.equal(err.message, "Bad Request");
        assert.equal(err.status, 471);
    });

    it("create(status) for 520", () => {
        const err = x.create(520);
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 520);
    });

    it("create(status, msg)", () => {
        const err = x.create(404, "LOL");
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
    });

    it("create(status, props)", () => {
        const err = x.create(404, {
            id: 1
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, props) with status prop", () => {
        const err = x.create(404, {
            id: 1,
            status: 500
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, props) with statusCode prop", () => {
        const err = x.create(404, {
            id: 1,
            statusCode: 500
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(props)", () => {
        const err = x.create({
            id: 1
        });
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 500);
        assert.equal(err.id, 1);
    });

    it("create(msg)", () => {
        const err = x.create("LOL");
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 500);
    });

    it("create(err)", () => {
        let _err = new Error("LOL");
        _err.status = 404;
        let err = x.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);

        _err = new Error("LOL");
        err = x.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
    });

    it("create(err) with invalid err.status", () => {
        const _err = new Error("Connection refused");
        _err.status = -1;
        const err = x.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "Connection refused");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
    });

    it("create(err, props)", () => {
        const _err = new Error("LOL");
        _err.status = 404;
        const err = x.create(_err, {
            id: 1
        });
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
        assert.equal(err.expose, true);
    });

    it("create(status, err, props)", () => {
        const _err = new Error("LOL");
        const err = x.create(404, _err, {
            id: 1
        });
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, msg, props)", () => {
        const err = x.create(404, "LOL", {
            id: 1
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, msg, { expose: false })", () => {
        const err = x.create(404, "LOL", {
            expose: false
        });
        assert.equal(err.expose, false);
    });

    it("new x.NotFound()", () => {
        const err = new x.NotFound();
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);
        assert(err.stack);
    });

    it("new x.InternalServerError()", () => {
        const err = new x.InternalServerError();
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
        assert(err.stack);
    });

    it('new x["404"]()', () => {
        const err = new x["404"]();
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);
        assert(err.stack);
    });

    it("should support err instanceof Error", () => {
        assert(x.create(404) instanceof Error);
        assert((new x["404"]()) instanceof Error);
        assert((new x["500"]()) instanceof Error);
    });

    it("should support err instanceof exposed constructor", () => {
        assert(x.create(404) instanceof x.NotFound);
        assert(x.create(500) instanceof x.InternalServerError);
        assert((new x["404"]()) instanceof x.NotFound);
        assert((new x["500"]()) instanceof x.InternalServerError);
        assert((new x.NotFound()) instanceof x.NotFound);
        assert((new x.InternalServerError()) instanceof x.InternalServerError);
    });

    it("should support err instanceof HttpError", () => {
        assert(x.create(404) instanceof x.HttpError);
        assert((new x["404"]()) instanceof x.HttpError);
        assert((new x["500"]()) instanceof x.HttpError);
    });
});
