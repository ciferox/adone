const { transformData } = adone.net.http.client;

describe("glosses", "net", "http", "client", "core", "transformData", () => {
    it("should support a single transformer", () => {
        let data;
        data = transformData(data, null, (data) => {
            data = "foo";
            return data;
        });

        expect(data).to.be.equal("foo");
    });

    it("should support an array of transformers", () => {
        let data = "";
        data = transformData(data, null, [function (data) {
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
