import * as util from "./util";

describe("templating", "nunjucks", "api", () => {
    const { std: { path }, templating: { nunjucks: { Environment, FileSystemLoader: Loader } } } = adone;
    const templatesPath = path.resolve(__dirname, "templates");


    it("should always force compilation of parent template", () => {
        const env = new Environment(new Loader(templatesPath));

        const child = env.getTemplate("base-inherit.njk");
        expect(child.render()).to.be.equal("Foo*Bar*BazFizzle");
    });

    it("should handle correctly relative paths", () => {
        const env = new Environment(new Loader(templatesPath));

        const child1 = env.getTemplate("relative/test1.njk");
        const child2 = env.getTemplate("relative/test2.njk");

        expect(child1.render()).to.be.equal("FooTest1BazFizzle");
        expect(child2.render()).to.be.equal("FooTest2BazFizzle");
    });

    it("should handle correctly cache for relative paths", () => {
        const env = new Environment(new Loader(templatesPath));

        const test = env.getTemplate("relative/test-cache.njk");

        expect(util.normEOL(test.render())).to.be.equal("Test1\nTest2");
    });

    it("should handle correctly relative paths in renderString", () => {
        const env = new Environment(new Loader(templatesPath));
        expect(env.renderString('{% extends "./relative/test1.njk" %}{% block block1 %}Test3{% endblock %}', {}, {
            path: path.resolve(templatesPath, "string.njk")
        })).to.be.equal("FooTest3BazFizzle");
    });
});
