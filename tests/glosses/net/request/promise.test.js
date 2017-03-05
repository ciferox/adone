/* global describe it afterEach */

import nock from "../../../helpers/nock";

const { request } = adone.net;

describe("promise", function () {
    it("should provide succinct object to then", function (done) {
        nock("http://example.org")
            .get("/foo")
            .reply(200, "{\"hello\":\"world\"}", {
                "Content-Type": "application/json"
            });

        request("http://example.org/foo").then(function (response) {
            expect(typeof response).to.be.equal("object");
            expect(response.data.hello).to.be.equal("world");
            expect(response.status).to.be.equal(200);
            expect(response.headers["content-type"]).to.be.equal("application/json");
            expect(response.config.url).to.be.equal("http://example.org/foo");
            done();
        });
    });
});