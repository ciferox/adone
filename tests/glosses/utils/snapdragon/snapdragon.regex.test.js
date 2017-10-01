const { Snapdragon } = adone.util;
const { capture } = Snapdragon;
let snapdragon;

describe("util", "Snapdragon", "parser", () => {
    beforeEach(() => {
        snapdragon = new Snapdragon();
        snapdragon.use(capture());
    });

    describe(".regex():", () => {
        it("should expose a regex cache with regex from registered parsers", () => {
            snapdragon.capture("dot", /^\./);
            snapdragon.capture("text", /^\w+/);
            snapdragon.capture("all", /^.+/);

            assert(snapdragon.regex.has("dot"));
            assert(snapdragon.regex.has("all"));
            assert(snapdragon.regex.has("text"));
        });
    });
});
