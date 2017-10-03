import mm from "./support/match";

describe("util", "match", "globstars", () => {
    it("with char classes", () => {
        const fixtures = ["a.b", "a,b", "a:b", "a-b", "a;b", "a b", "a_b"];
        mm(fixtures, "a[^[:alnum:]]b", fixtures);
        mm(fixtures, "a@([^[:alnum:]])b", fixtures);
        mm(fixtures, "a@([-.,:; _])b", fixtures);

        mm(fixtures, "a@([^x])b", ["a,b", "a:b", "a-b", "a;b", "a b", "a_b"]);
        mm(fixtures, "a+([^[:alnum:]])b", fixtures);
    });
});
