import * as helpers from "../helpers";

describe("net", "http", "server", "response", "status", () => {
    const { net: { http: { server: { Server, helper: { status } } } } } = adone;

    describe("when a status code", () => {
        describe("and valid", () => {
            it("should set the status", () => {
                const res = helpers.response();
                res.status = 403;
                expect(res.status).to.be.equal(403);
            });

            it("should not throw", () => {
                assert.doesNotThrow(() => {
                    helpers.response().status = 403;
                });
            });
        });

        describe("and invalid", () => {
            it("should throw", () => {
                assert.throws(() => {
                    helpers.response().status = 999;
                }, "invalid status code: 999");
            });
        });

        describe("and custom status", () => {
            before(() => {
                status.codes.set(700, "custom status");
            });

            after(() => {
                status.codes.delete(700);
            });

            it("should set the status", () => {
                const res = helpers.response();
                res.status = 700;
                expect(res.status).to.be.equal(700);
            });

            it("should not throw", () => {
                assert.doesNotThrow(() => helpers.response().status = 700);
            });
        });
    });

    describe("when a status string", () => {
        it("should throw", () => {
            assert.throws(() => helpers.response().status = "forbidden", "status code must be a number");
        });
    });

    const strip = (status) => {
        it("should strip content related header fields", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.body = { foo: "bar" };
                ctx.set("Content-Type", "application/json; charset=utf-8");
                ctx.set("Content-Length", "15");
                ctx.set("Transfer-Encoding", "chunked");
                ctx.status = status;
                assert(ctx.response.header["content-type"] == null);
                assert(ctx.response.header["content-length"] == null);
                assert(ctx.response.header["transfer-encoding"] == null);
            });

            await request(server)
                .get("/")
                .expectStatus(status)
                .expect((response) => {
                    expect(response.headers).not.to.have.property("content-type");
                    expect(response.headers).not.to.have.property("content-length");
                    expect(response.headers).not.to.have.property("content-encoding");
                });
        });

        it("should strip content releated header fields after status set", async () => {
            const server = new Server();

            server.use((ctx) => {
                ctx.status = status;
                ctx.body = { foo: "bar" };
                ctx.set("Content-Type", "application/json; charset=utf-8");
                ctx.set("Content-Length", "15");
                ctx.set("Transfer-Encoding", "chunked");
            });

            await request(server)
                .get("/")
                .expectStatus(status)
                .expectEmptyBody()
                .expect((response) => {
                    expect(response.headers).not.to.have.property("content-type");
                    expect(response.headers).not.to.have.property("content-length");
                    expect(response.headers).not.to.have.property("content-encoding");
                });
        });
    };

    describe("when 204", () => strip(204));

    describe("when 205", () => strip(205));

    describe("when 304", () => strip(304));
});
