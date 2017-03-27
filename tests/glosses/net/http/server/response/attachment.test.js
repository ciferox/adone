import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "attachment", () => {
    const { net: { http: { server: { Server } } } } = adone;
    const { context } = helpers;

    describe("when given a filename", () => {
        it("should set the filename param", () => {
            const ctx = context();
            ctx.attachment("path/to/tobi.png");
            const str = 'attachment; filename="tobi.png"';
            expect(ctx.response.header["content-disposition"]).to.be.equal(str);
        });
    });

    describe("when omitting filename", () => {
        it("should not set filename param", () => {
            const ctx = context();
            ctx.attachment();
            expect(ctx.response.header["content-disposition"]).to.be.equal("attachment");
        });
    });

    describe("when given a no-ascii filename", () => {
        it("should set the encodeURI filename param", () => {
            const ctx = context();
            ctx.attachment("path/to/include-no-ascii-char-中文名-ok.png");
            const str = 'attachment; filename="include-no-ascii-char-???-ok.png"; filename*=UTF-8\'\'include-no-ascii-char-%E4%B8%AD%E6%96%87%E5%90%8D-ok.png';
            expect(ctx.response.header["content-disposition"]).to.be.equal(str);
        });

        it("should work with http client", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.attachment("path/to/include-no-ascii-char-中文名-ok.json");
                ctx.body = { foo: "bar" };
            });

            await request(server)
                .get("/")
                .expectStatus(200)
                .expectHeader("content-disposition", 'attachment; filename="include-no-ascii-char-???-ok.json"; filename*=UTF-8\'\'include-no-ascii-char-%E4%B8%AD%E6%96%87%E5%90%8D-ok.json')
                .expectBody({ foo: "bar" });
        });
    });
});
