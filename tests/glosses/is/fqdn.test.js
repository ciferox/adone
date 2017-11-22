import { test } from "./helpers";

describe("is", "fqdn", () => {
    it("should validate FQDN", () => {
        test("fqdn", {
            valid: [
                "domain.com",
                "dom.plato",
                "a.domain.co",
                "foo--bar.com",
                "xn--froschgrn-x9a.com",
                "rebecca.blackfriday"
            ],
            invalid: [
                "abc",
                "256.0.0.0",
                "_.com",
                "*.some.com",
                "s!ome.com",
                "domain.com/",
                "/more.com"
            ]
        });
    });

    it("should validate FQDN with trailing dot option", () => {
        test("fqdn", {
            args: [
                { allowTrailingDot: true }
            ],
            valid: [
                "example.com."
            ]
        });
    });
});
