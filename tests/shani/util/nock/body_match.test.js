describe("shani", "util", "nock", "body match", () => {
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

    it("match body is regex trying to match string", async () => {

        nock("http://encodingsareus.com")
            .post("/", new RegExp("a.+"))
            .reply(200);

        const resp = await request.post("http://encodingsareus.com/", {
            hello: "abc"
        });

        expect(resp.status).to.be.equal(200);
    });

    it("match body with regex", async () => {
        nock("http://encodingsareus.com")
            .post("/", { auth: { passwd: /a.+/ } })
            .reply(200);

        const resp = await request.post("http://encodingsareus.com/", {
            auth: {
                passwd: "abc"
            }
        });
        expect(resp.status).to.be.equal(200);
    });

    it("match body with regex inside array", async () => {

        nock("http://encodingsareus.com")
            .post("/", { items: [{ name: /t.+/ }] })
            .reply(200);

        const resp = await request.post("http://encodingsareus.com/", {
            items: [{
                name: "test"
            }]
        });

        expect(resp.status).to.be.equal(200);
    });

    it("match body with empty object inside", async () => {
        nock("http://encodingsareus.com")
            .post("/", { obj: {} })
            .reply(200);

        const resp = await request.post("http://encodingsareus.com/", {
            obj: {}
        });

        expect(resp.status).to.be.equal(200);
    });

    it("match body with nested object inside", async () => {
        nock("http://encodingsareus.com")
            .post("/", /x/)
            .reply(200);

        const resp = await request.post("http://encodingsareus.com/", {
            obj: {
                x: 1
            }
        });

        assert.equal(resp.status, 200);
    });

    it("doesn't match body with mismatching keys", async () => {
        nock("http://encodingsareus.com")
            .post("/", { a: "a" })
            .reply(200);

        await assert.throws(async () => {
            await request.post("http://encodingsareus.com/", {
                a: "a",
                b: "b"
            });
        });
    });

    it.skip("match body with form multipart", async () => { // TODO

        nock("http://encodingsareus.com")
            .post("/", "--fixboundary\r\nContent-Disposition: form-data; name=\"field\"\r\n\r\nvalue\r\n--fixboundary--\r\n")
            .reply(200);

        const r = mikealRequest({
            url: "http://encodingsareus.com/",
            method: "post"
        }, (err, res) => {
            if (err) {
                throw err;
            }
            assert.equal(res.statusCode, 200);
            t.end();
        });
        const form = r.form();
        form._boundary = "fixboundary"; // fix boundary so that request could match at all
        form.append("field", "value");
    });
});
