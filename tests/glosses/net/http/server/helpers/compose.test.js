describe("glosses", "net", "http", "helpers", "compose", () => {
    const { compose } = adone.net.http.server.helper;

    it("should compose middlewares", async () => {
        let i = 0;
        const m = compose([
            (ctx, next) => (i += 1) && next(),
            (ctx, next) => (i += 2) && next(),
            (ctx, next) => (i += 3) && next()
        ]);
        await m({}, () => i += 4);
        expect(i).to.be.equal(10);
    });

    it("should work if the next middleware is not given", async () => {
        let i = 0;
        const m = compose([
            (ctx, next) => (i += 1) && next(),
            (ctx, next) => (i += 2) && next(),
            (ctx, next) => (i += 3) && next()
        ]);
        await m({});
        expect(i).to.be.equal(6);
    });

    it("should stop the chain if a middleware fails", async () => {
        let i = 0;
        const m = compose([
            (ctx, next) => (i += 1) && next(),
            (ctx, next) => (i += 2) && next(),
            () => {
                throw new Error();
            },
            (ctx, next) => (i += 3) && next()
        ]);
        let err;
        try {
            await m({});
        } catch (_err) {
            err = _err;
        }
        expect(i).to.be.equal(3);
        expect(err).to.be.ok;
    });

    it("should not call a middleware without the next callback being invoked", async () => {
        let i = 0;
        const m = compose([
            () => (i += 1),
            (ctx, next) => (i += 2) && next(),
            (ctx, next) => (i += 3) && next()
        ]);
        await m({});
        expect(i).to.be.equal(1);
    });

    it("should stop the chain if a middleware fails asynchronously", async () => {
        let i = 0;
        const m = compose([
            (ctx, next) => (i += 1) && next(),
            (ctx, next) => (i += 2) && next(),
            () => {
                return Promise.reject(new Error());
            },
            (ctx, next) => (i += 3) && next()
        ]);
        let err;
        try {
            await m({});
        } catch (_err) {
            err = _err;
        }
        expect(i).to.be.equal(3);
        expect(err).to.be.ok;
    });

    it("should pass extra arguments to the first middleware", async () => {
        let i = 0;
        const m = compose([
            (ctx, next, init) => (i += 1 + init) && next(),
            (ctx, next, value = 0) => (i += 2 + value) && next(),
            (ctx, next, value = 0) => (i += 3 + value) && next()
        ]);
        await m({}, null, 1);
        expect(i).to.be.equal(7);
    });

    it("should pass extra arguments from the previous middleware to the next one via the next arguments", async () => {
        let i = 0;
        const m = compose([
            (ctx, next, value) => (i += 1 + value) && next(value + 1),
            (ctx, next, value) => (i += 2 + value) && next(value + 2),
            (ctx, next, value) => (i += 3 + value) && next(value + 3)
        ]);
        await m({}, (ctx, next, value) => i += 4 + value, 1);
        expect(i).to.be.equal(1 + 1 + 2 + 2 + 3 + 4 + 4 + 7);
    });
});
