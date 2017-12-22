import { createConnection } from "../../common";

describe("database", "mysql", "functional", "config", "connect timeout", function connectTimeout() {
    this.timeout(180000);

    it("should throw ETIMEDOUT error", async () => {
        const err = await createConnection({
            host: "www.google.com"
        }).then(() => null, (e) => e);
        expect(err).not.to.be.null();
        expect(err.code).to.be.equal("ETIMEDOUT");
    });
});
