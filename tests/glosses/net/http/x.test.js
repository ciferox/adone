describe("net", "http", "x", () => {
    const {
        net: { http: { exception } }
    } = adone;

    it("create(status)", () => {
        const err = exception.create(404);
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
    });

    it("create(status) for 300", () => {
        const err = exception.create(300);
        assert.equal(err.name, "Exception");
        assert.equal(err.message, "Multiple Choices");
        assert.equal(err.status, 300);
    });

    it("create(status) for 471", () => {
        const err = exception.create(471);
        assert.equal(err.name, "BadRequest");
        assert.equal(err.message, "Bad Request");
        assert.equal(err.status, 471);
    });

    it("create(status) for 520", () => {
        const err = exception.create(520);
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 520);
    });

    it("create(status, msg)", () => {
        const err = exception.create(404, "LOL");
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
    });

    it("create(status, props)", () => {
        const err = exception.create(404, {
            id: 1
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, props) with status prop", () => {
        const err = exception.create(404, {
            id: 1,
            status: 500
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, props) with statusCode prop", () => {
        const err = exception.create(404, {
            id: 1,
            statusCode: 500
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(props)", () => {
        const err = exception.create({
            id: 1
        });
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 500);
        assert.equal(err.id, 1);
    });

    it("create(msg)", () => {
        const err = exception.create("LOL");
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 500);
    });

    it("create(err)", () => {
        let _err = new Error("LOL");
        _err.status = 404;
        let err = exception.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);

        _err = new Error("LOL");
        err = exception.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
    });

    it("create(err) with invalid err.status", () => {
        const _err = new Error("Connection refused");
        _err.status = -1;
        const err = exception.create(_err);
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "Connection refused");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
    });

    it("create(err, props)", () => {
        const _err = new Error("LOL");
        _err.status = 404;
        const err = exception.create(_err, {
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
        const err = exception.create(404, _err, {
            id: 1
        });
        assert.equal(err, _err);
        assert.equal(err.name, "Error");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, msg, props)", () => {
        const err = exception.create(404, "LOL", {
            id: 1
        });
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "LOL");
        assert.equal(err.status, 404);
        assert.equal(err.id, 1);
    });

    it("create(status, msg, { expose: false })", () => {
        const err = exception.create(404, "LOL", {
            expose: false
        });
        assert.equal(err.expose, false);
    });

    it("new exception.NotFound()", () => {
        const err = new exception.NotFound();
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);
        assert(err.stack);
    });

    it("new exception.InternalServerError()", () => {
        const err = new exception.InternalServerError();
        assert.equal(err.name, "InternalServerError");
        assert.equal(err.message, "Internal Server Error");
        assert.equal(err.status, 500);
        assert.equal(err.expose, false);
        assert(err.stack);
    });

    it('new exception["404"]()', () => {
        const err = new exception["404"]();
        assert.equal(err.name, "NotFound");
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, 404);
        assert.equal(err.expose, true);
        assert(err.stack);
    });

    it("should support err instanceof Error", () => {
        assert(exception.create(404) instanceof Error);
        assert((new exception["404"]()) instanceof Error);
        assert((new exception["500"]()) instanceof Error);
    });

    it("should support err instanceof exposed constructor", () => {
        assert(exception.create(404) instanceof exception.NotFound);
        assert(exception.create(500) instanceof exception.InternalServerError);
        assert((new exception["404"]()) instanceof exception.NotFound);
        assert((new exception["500"]()) instanceof exception.InternalServerError);
        assert((new exception.NotFound()) instanceof exception.NotFound);
        assert((new exception.InternalServerError()) instanceof exception.InternalServerError);
    });

    it("should support err instanceof HttpError", () => {
        assert(exception.create(404) instanceof exception.HttpError);
        assert((new exception["404"]()) instanceof exception.HttpError);
        assert((new exception["500"]()) instanceof exception.HttpError);
    });
});
