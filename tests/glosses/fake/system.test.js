const {
    fake
} = adone;

describe("fake", "system", () => {
    describe("fileName()", () => {
        it("returns filenames without system path seperators", () => {
            stub(fake.random, "words").returns("24/7");
            const fileName = fake.system.fileName();
            assert.equal(fileName.indexOf("/"), -1, "generated fileNames should not have path seperators");

            fake.random.words.restore();
        });
    });

    describe("commonFileName()", () => {
        it("returns filenames without system path seperators", () => {
            stub(fake.random, "words").returns("24/7");
            const fileName = fake.system.commonFileName();
            assert.equal(fileName.indexOf("/"), -1, "generated commonFileNames should not have path seperators");

            fake.random.words.restore();
        });
    });
});
