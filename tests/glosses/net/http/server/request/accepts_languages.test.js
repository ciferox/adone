import * as helpers from "../helpers";

describe("net", "http", "server", "request", "accepts languages", () => {
    const { context } = helpers;

    describe("with no arguments", () => {
        describe("when Accept-Language is populated", () => {
            it("should return accepted types", () => {
                const ctx = context();
                ctx.req.headers["accept-language"] = "en;q=0.8, es, pt";
                expect(ctx.acceptsLanguages()).to.be.deep.equal(["es", "pt", "en"]);
            });
        });
    });

    describe("with multiple arguments", () => {
        describe("when Accept-Language is populated", () => {
            describe("if any types types match", () => {
                it("should return the best fit", () => {
                    const ctx = context();
                    ctx.req.headers["accept-language"] = "en;q=0.8, es, pt";
                    expect(ctx.acceptsLanguages("es", "en")).to.be.equal("es");
                });
            });

            describe("if no types match", () => {
                it("should return false", () => {
                    const ctx = context();
                    ctx.req.headers["accept-language"] = "en;q=0.8, es, pt";
                    expect(ctx.acceptsLanguages("fr", "au")).to.be.false;
                });
            });
        });

        describe("when Accept-Language is not populated", () => {
            it("should return the first type", () => {
                const ctx = context();
                expect(ctx.acceptsLanguages("es", "en")).to.be.equal("es");
            });
        });
    });

    describe("with an array", () => {
        it("should return the best fit", () => {
            const ctx = context();
            ctx.req.headers["accept-language"] = "en;q=0.8, es, pt";
            expect(ctx.acceptsLanguages(["es", "en"])).to.be.equal("es");
        });
    });
});
