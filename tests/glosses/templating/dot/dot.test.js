import { test, doT } from "./util";

describe("templaing", "dot", () => {
    const basictemplate = "<div>{{!it.foo}}</div>";
    const basiccompiled = doT.template(basictemplate);

    describe(".name", () => {
        it("should have a name", () => {
            assert.strictEqual(doT.name, "doT");
        });
    });

    describe("#template()", () => {
        it("should return a function", () => {
            assert.equal(typeof basiccompiled, "function");
        });
    });

    describe("#()", () => {
        it("should render the template", () => {
            assert.equal(basiccompiled({ foo: "http" }), "<div>http</div>");
            assert.equal(basiccompiled({ foo: "http://abc.com" }), "<div>http:&#47;&#47;abc.com</div>");
            assert.equal(basiccompiled({}), "<div></div>");
        });
    });

    describe("encoding with doNotSkipEncoded=false", () => {
        it("should not replace &", () => {
            global._encodeHTML = undefined;
            doT.templateSettings.doNotSkipEncoded = false;
            const fn = doT.template("<div>{{!it.foo}}</div>");
            assert.equal(fn({ foo: "&amp;" }), "<div>&amp;</div>");
        });
    });

    describe("interpolate 2 numbers", () => {
        it("should print numbers next to each other", () => {
            test([
                "{{=it.one}}{{=it.two}}",
                "{{= it.one}}{{= it.two}}",
                "{{= it.one }}{{= it.two }}"
            ], { one: 1, two: 2 }, "12");
        });
    });

    describe("evaluate JavaScript", () => {
        it("should print numbers next to each other", () => {
            test([
                "{{ it.one = 1; it.two = 2; }}{{= it.one }}{{= it.two }}"
            ], {}, "12");
        });
    });

    describe("encoding with doNotSkipEncoded=true", () => {
        it("should replace &", () => {
            global._encodeHTML = undefined;
            doT.templateSettings.doNotSkipEncoded = true;
            assert.equal(doT.template("<div>{{!it.foo}}</div>")({ foo: "&amp;" }), "<div>&#38;amp;</div>");
            assert.equal(doT.template("{{!it.a}}")({ a: "& < > / ' \"" }), "&#38; &#60; &#62; &#47; &#39; &#34;");
            assert.equal(doT.template('{{!"& < > / \' \\""}}')(), "&#38; &#60; &#62; &#47; &#39; &#34;");
        });
    });

    describe("invalid JS in templates", () => {
        it("should throw error", () => {
            assert.throws(() => {
                doT.template("<div>{{= foo + }}</div>");
            });
        });
    });
});
