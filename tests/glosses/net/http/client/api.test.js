const { request, create, Cancel, CancelToken, isCancel } = adone.net.http.client;

describe("net", "http", "client", () => {
    describe("static api", () => {
        it("should have request method helpers", () => {
            expect(typeof request.get).to.be.equal("function");
            expect(typeof request.head).to.be.equal("function");
            expect(typeof request.delete).to.be.equal("function");
            expect(typeof request.post).to.be.equal("function");
            expect(typeof request.put).to.be.equal("function");
            expect(typeof request.patch).to.be.equal("function");
        });

        it("should have promise method helpers", () => {
            const promise = request();
            expect(typeof promise.then).to.be.equal("function");
            expect(typeof promise.catch).to.be.equal("function");
            promise.catch(adone.noop);
        });

        it("should have default options", () => {
            expect(typeof request.options).to.be.equal("object");
            expect(typeof request.options.headers).to.be.equal("object");
        });

        it("should have interceptors", () => {
            expect(typeof request.interceptors.request).to.be.equal("object");
            expect(typeof request.interceptors.response).to.be.equal("object");
        });

        it("should have factory method", () => {
            expect(typeof create).to.be.equal("function");
        });

        it("should have Cancel, CancelToken, and isCancel properties", () => {
            expect(typeof Cancel).to.be.equal("function");
            expect(typeof CancelToken).to.be.equal("function");
            expect(typeof isCancel).to.be.equal("function");
        });
    });

    describe("instance api", () => {
        const instance = create();

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
});
