const { transformData } = adone.net.http.client;

describe("net", "http", "client", "core", "transformData", () => {
    it("should support a single transformer", () => {
        const data = transformData(undefined, undefined, undefined, () => {
            return "foo";
        });

        expect(data).to.be.equal("foo");
    });

    it("should support an array of transformers", () => {
        let data = "";
        data = transformData(data, undefined, undefined, [function (data) {
            data += "f";
            return data;
        }, function (data) {
            data += "o";
            return data;
        }, function (data) {
            data += "o";
            return data;
        }]);

        expect(data).to.be.equal("foo");
    });
});
