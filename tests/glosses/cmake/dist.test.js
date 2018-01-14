const {
    cmake: { Dist }
} = adone;

describe("cmake", "Dist", () => {
    it("should download dist files if needed", async function () {
        this.timeout(60000);
        const dist = new Dist();
        await dist.ensureDownloaded();
    });

});
