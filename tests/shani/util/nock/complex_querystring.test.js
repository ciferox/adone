describe("shani", "util", "nock", "complex querystring", () => {
    const {
        shani: {
            util: { nock }
        },
        net: {
            http: {
                client: { request }
            }
        }
    } = adone;

    beforeEach(() => {
        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    after(() => {
        nock.cleanAll();
        nock.restore();
    });

    it("query with array", async () => {
        const query1 = { list: [123, 456, 789], a: "b" };
        nock("https://array-query-string.com")
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://array-query-string.com/test", {
            params: query1
        });

        expect(resp.data).to.be.equal("success");
    });

    it("query with array which contains unencoded value ", async () => {
        const query1 = { list: ["hello%20world", "2hello%20world", 3], a: "b" };

        nock("https://array-query-string.com")
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://array-query-string.com/test", {
            params: query1
        });

        expect(resp.data).to.be.equal("success");
    });

    it("query with array which contains pre-encoded values ", async () => {
        const query1 = { list: ["hello%20world", "2hello%20world"] };

        nock("https://array-query-string.com", { encodedQueryParams: true })
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://array-query-string.com/test?list%5B0%5D=hello%20world&list%5B1%5D=2hello%20world");

        expect(resp.data).to.be.equal("success");
    });

    it("query with object", async () => {
        const query1 = {
            a: {
                b: ["c", "d"]
            },
            e: [1, 2, 3, 4]
        };

        nock("https://object-query-string.com")
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://object-query-string.com/test", {
            params: query1
        });
        expect(resp.data).to.be.equal("success");
    });

    it("query with object which contains unencoded value", async () => {
        const query1 = {
            a: {
                b: "hello%20world"
            }
        };

        nock("https://object-query-string.com")
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://object-query-string.com/test", {
            params: query1
        });

        expect(resp.data).to.be.equal("success");
    });

    it("query with object which contains pre-encoded values", async () => {
        const query1 = {
            a: {
                b: "hello%20world"
            }
        };

        nock("https://object-query-string.com", { encodedQueryParams: true })
            .get("/test")
            .query(query1)
            .reply(200, "success");

        const resp = await request.get("https://object-query-string.com/test?a%5Bb%5D=hello%20world");

        expect(resp.data).to.be.equal("success");
    });

    it("query with array and regexp", async () => {
        const expectQuery = {
            list: [123, 456, 789],
            foo: /.*/,
            a: "b"
        };

        const actualQuery = {
            list: [123, 456, 789],
            foo: "bar",
            a: "b"
        };

        nock("https://array-query-string.com")
            .get("/test")
            .query(expectQuery)
            .reply(200, "success");

        const resp = await request.get("https://array-query-string.com/test", {
            params: actualQuery
        });

        expect(resp.data).to.be.equal("success");
    });
});
