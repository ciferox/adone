const { client } = adone.net.http;

describe("static api", () => {
    it("should have request method helpers", () => {
        expect(typeof client.get).to.be.equal("function");
        expect(typeof client.head).to.be.equal("function");
        expect(typeof client.delete).to.be.equal("function");
        expect(typeof client.post).to.be.equal("function");
        expect(typeof client.put).to.be.equal("function");
        expect(typeof client.patch).to.be.equal("function");
    });

    it("should have promise method helpers", () => {
        const promise = client();
        expect(typeof promise.then).to.be.equal("function");
        expect(typeof promise.catch).to.be.equal("function");
        promise.catch(() => {});
    });

    it("should have defaults", () => {
        expect(typeof client.defaults).to.be.equal("object");
        expect(typeof client.defaults.headers).to.be.equal("object");
    });

    it("should have interceptors", () => {
        expect(typeof client.interceptors.request).to.be.equal("object");
        expect(typeof client.interceptors.response).to.be.equal("object");
    });

    it("should have factory method", () => {
        expect(typeof client.create).to.be.equal("function");
    });

    it("should have Cancel, CancelToken, and isCancel properties", () => {
        expect(typeof client.Cancel).to.be.equal("function");
        expect(typeof client.CancelToken).to.be.equal("function");
        expect(typeof client.isCancel).to.be.equal("function");
    });
});

describe("instance api", () => {
    const instance = client.create();

    it("should have request methods", () => {
        expect(typeof instance.get).to.be.equal("function");
        expect(typeof instance.head).to.be.equal("function");
        expect(typeof instance.delete).to.be.equal("function");
        expect(typeof instance.post).to.be.equal("function");
        expect(typeof instance.put).to.be.equal("function");
        expect(typeof instance.patch).to.be.equal("function");
    });

    it("should have interceptors", () => {
        expect(typeof instance.interceptors.request).to.be.equal("object");
        expect(typeof instance.interceptors.response).to.be.equal("object");
    });
});
