const {
    is
} = adone;

describe("is", "extGlob", () => {
    it("should return true when the string has an extglob", () => {
        assert.isTrue(is.extGlob("?(abc)"));
        assert.isTrue(is.extGlob("@(abc)"));
        assert.isTrue(is.extGlob("!(abc)"));
        assert.isTrue(is.extGlob("*(abc)"));
        assert.isTrue(is.extGlob("+(abc)"));
        assert.isTrue(is.extGlob("xyz/?(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/@(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/!(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/*(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/+(abc)/xyz"));
        assert.isTrue(is.extGlob("?(abc|xyz)/xyz"));
        assert.isTrue(is.extGlob("@(abc|xyz)"));
        assert.isTrue(is.extGlob("!(abc|xyz)"));
        assert.isTrue(is.extGlob("*(abc|xyz)"));
        assert.isTrue(is.extGlob("+(abc|xyz)"));
    });

    it("should not match escaped extglobs", () => {
        assert.isTrue(!is.extGlob("?(abc/xyz"));
        assert.isTrue(!is.extGlob("@(abc"));
        assert.isTrue(!is.extGlob("!(abc"));
        assert.isTrue(!is.extGlob("*(abc"));
        assert.isTrue(!is.extGlob("+(abc"));
        assert.isTrue(!is.extGlob("(a|b"));
        assert.isTrue(!is.extGlob("\\?(abc)"));
        assert.isTrue(!is.extGlob("\\@(abc)"));
        assert.isTrue(!is.extGlob("\\!(abc)"));
        assert.isTrue(!is.extGlob("\\*(abc)"));
        assert.isTrue(!is.extGlob("\\+(abc)"));
        assert.isTrue(!is.extGlob("xyz/\\?(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/\\@(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/\\!(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/\\*(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/\\+(abc)/xyz"));
        assert.isTrue(!is.extGlob("\\?(abc|xyz)/xyz"));
        assert.isTrue(!is.extGlob("\\@(abc|xyz)"));
        assert.isTrue(!is.extGlob("\\!(abc|xyz)"));
        assert.isTrue(!is.extGlob("\\*(abc|xyz)"));
        assert.isTrue(!is.extGlob("\\+(abc|xyz)"));
        assert.isTrue(!is.extGlob("?\\(abc)"));
        assert.isTrue(!is.extGlob("@\\(abc)"));
        assert.isTrue(!is.extGlob("!\\(abc)"));
        assert.isTrue(!is.extGlob("*\\(abc)"));
        assert.isTrue(!is.extGlob("+\\(abc)"));
        assert.isTrue(!is.extGlob("xyz/?\\(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/@\\(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/!\\(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/*\\(abc)/xyz"));
        assert.isTrue(!is.extGlob("xyz/+\\(abc)/xyz"));
        assert.isTrue(!is.extGlob("?\\(abc|xyz)/xyz"));
        assert.isTrue(!is.extGlob("@\\(abc|xyz)"));
        assert.isTrue(!is.extGlob("!\\(abc|xyz)"));
        assert.isTrue(!is.extGlob("*\\(abc|xyz)"));
        assert.isTrue(!is.extGlob("+\\(abc|xyz)"));
    });

    it("should detect when an extglob is in the same pattern as an escaped extglob", () => {
        assert.isTrue(is.extGlob("\\?(abc)/?(abc)"));
        assert.isTrue(is.extGlob("\\@(abc)/@(abc)"));
        assert.isTrue(is.extGlob("\\!(abc)/!(abc)"));
        assert.isTrue(is.extGlob("\\*(abc)/*(abc)"));
        assert.isTrue(is.extGlob("\\+(abc)/+(abc)"));
        assert.isTrue(is.extGlob("xyz/\\?(abc)/xyz/xyz/?(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/\\@(abc)/xyz/xyz/@(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/\\!(abc)/xyz/xyz/!(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/\\*(abc)/xyz/xyz/*(abc)/xyz"));
        assert.isTrue(is.extGlob("xyz/\\+(abc)/xyz/xyz/+(abc)/xyz"));
        assert.isTrue(is.extGlob("\\?(abc|xyz)/xyz/?(abc|xyz)/xyz"));
        assert.isTrue(is.extGlob("\\@(abc|xyz)/@(abc|xyz)"));
        assert.isTrue(is.extGlob("\\!(abc|xyz)/!(abc|xyz)"));
        assert.isTrue(is.extGlob("\\*(abc|xyz)/*(abc|xyz)"));
        assert.isTrue(is.extGlob("\\+(abc|xyz)/+(abc|xyz)"));
    });

    it("should return false when the string does not have an extglob:", () => {
        assert.isTrue(!is.extGlob());
        assert.isTrue(!is.extGlob(null));
        assert.isTrue(!is.extGlob(""));
        assert.isTrue(!is.extGlob("? (abc)"));
        assert.isTrue(!is.extGlob("@.(abc)"));
        assert.isTrue(!is.extGlob("!&(abc)"));
        assert.isTrue(!is.extGlob("*z(abc)"));
        assert.isTrue(!is.extGlob("+~(abc)"));
        assert.isTrue(!is.extGlob(["**/*.js"]));
        assert.isTrue(!is.extGlob(["foo.js"]));
        assert.isTrue(!is.extGlob("*.js"));
        assert.isTrue(!is.extGlob("!*.js"));
        assert.isTrue(!is.extGlob("!foo"));
        assert.isTrue(!is.extGlob("!foo.js"));
        assert.isTrue(!is.extGlob("**/abc.js"));
        assert.isTrue(!is.extGlob("abc/*.js"));
        assert.isTrue(!is.extGlob("abc/{a,b}.js"));
        assert.isTrue(!is.extGlob("abc/{a..z}.js"));
        assert.isTrue(!is.extGlob("abc/{a..z..2}.js"));
        assert.isTrue(!is.extGlob("abc/(aaa|bbb).js"));
        assert.isTrue(!is.extGlob("abc/?.js"));
        assert.isTrue(!is.extGlob("?.js"));
        assert.isTrue(!is.extGlob("[abc].js"));
        assert.isTrue(!is.extGlob("[^abc].js"));
        assert.isTrue(!is.extGlob("a/b/c/[a-z].js"));
        assert.isTrue(!is.extGlob("[a-j]*[^c]b/c"));
        assert.isTrue(!is.extGlob("."));
        assert.isTrue(!is.extGlob("aa"));
        assert.isTrue(!is.extGlob("abc.js"));
        assert.isTrue(!is.extGlob("abc/def/ghi.js"));
    });
});
