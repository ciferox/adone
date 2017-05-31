describe("shani", "util", "__", "util", "timesInWords", () => {
    const { timesInWords } = adone.shani.util.__.util;

    it("should return \"once\" for input of 1", () => {
        const result = timesInWords(1);
        assert.equal(result, "once");
    });

    it("should return \"twice\" for input of 2", () => {
        const result = timesInWords(2);
        assert.equal(result, "twice");
    });

    it("should return \"thrice\" for input of 3", () => {
        const result = timesInWords(3);
        assert.equal(result, "thrice");
    });

    it("should return \"n times\" for n larger than 3", () => {
        let result, i;

        for (i = 4; i < 100; i++) {
            result = timesInWords(i);
            assert.equal(result, `${i} times`);
        }
    });

    it("should return \"0 times\" for falsy input", () => {
        const falsies = [0, NaN, null, false, undefined, ""];
        let result, i;

        for (i = 0; i < falsies.length; i++) {
            result = timesInWords(falsies[i]);
            assert.equal(result, "0 times");
        }
    });
});
