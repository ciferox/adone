import * as helpers from "../helpers";

describe("glosses", "net", "http", "server", "response", "socket", () => {
    const { std: { stream: { Stream } } } = adone;
    const { response } = helpers;

    it("should return the request socket object", () => {
        const res = response();
        expect(res.socket).to.be.instanceOf(Stream);
    });
});
