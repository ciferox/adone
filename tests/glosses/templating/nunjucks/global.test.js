import * as util from "./util";

describe("glosses", "templating", "nunjucks", "global", () => {
    const { std: { path }, templating: { nunjucks: { FileSystemLoader: Loader, Environment } } } = adone;
    const { equal, render, finish } = util;
    const templatesPath = path.resolve(__dirname, "templates");

    it("should have range", (done) => {
        equal("{% for i in range(0, 10) %}{{ i }}{% endfor %}", "0123456789");
        equal("{% for i in range(10) %}{{ i }}{% endfor %}", "0123456789");
        equal("{% for i in range(5, 10) %}{{ i }}{% endfor %}", "56789");
        equal("{% for i in range(-2, 0) %}{{ i }}{% endfor %}", "-2-1");
        equal("{% for i in range(5, 10, 2) %}{{ i }}{% endfor %}", "579");
        equal("{% for i in range(5, 10, 2.5) %}{{ i }}{% endfor %}", "57.5");
        equal("{% for i in range(5, 10, 2.5) %}{{ i }}{% endfor %}", "57.5");

        equal("{% for i in range(10, 5, -1) %}{{ i }}{% endfor %}", "109876");
        equal("{% for i in range(10, 5, -2.5) %}{{ i }}{% endfor %}", "107.5");

        finish(done);
    });

    it("should have cycler", (done) => {
        equal('{% set cls = cycler("odd", "even") %}' +
            "{{ cls.next() }}" +
            "{{ cls.next() }}" +
            "{{ cls.next() }}",
            "oddevenodd");

        equal('{% set cls = cycler("odd", "even") %}' +
            "{{ cls.next() }}" +
            "{{ cls.reset() }}" +
            "{{ cls.next() }}",
            "oddodd");

        equal('{% set cls = cycler("odd", "even") %}' +
            "{{ cls.next() }}" +
            "{{ cls.next() }}" +
            "{{ cls.current }}",
            "oddeveneven");

        finish(done);
    });

    it("should have joiner", (done) => {
        equal("{% set comma = joiner() %}" +
            "foo{{ comma() }}bar{{ comma() }}baz{{ comma() }}",
            "foobar,baz,");

        equal('{% set pipe = joiner("|") %}' +
            "foo{{ pipe() }}bar{{ pipe() }}baz{{ pipe() }}",
            "foobar|baz|");

        finish(done);
    });

    it("should allow addition of globals", (done) => {
        const env = new Environment(new Loader(templatesPath));

        env.addGlobal("hello", (arg1) => {
            return `Hello ${arg1}`;
        });

        equal('{{ hello("World!") }}', "Hello World!", env);

        finish(done);
    });

    it("should allow chaining of globals", (done) => {
        const env = new Environment(new Loader(templatesPath));

        env.addGlobal("hello", (arg1) => {
            return `Hello ${arg1}`;
        }).addGlobal("goodbye", (arg1) => {
            return `Goodbye ${arg1}`;
        });

        equal('{{ hello("World!") }}', "Hello World!", env);
        equal('{{ goodbye("World!") }}', "Goodbye World!", env);

        finish(done);
    });

    it("should allow getting of globals", (done) => {
        const env = new Environment(new Loader(templatesPath));
        const hello = function (arg1) {
            return `Hello ${arg1}`;
        };

        env.addGlobal("hello", hello);

        expect(env.getGlobal("hello")).to.be.equal(hello);

        finish(done);
    });

    it("should allow getting boolean globals", (done) => {
        const env = new Environment(new Loader(templatesPath));
        const hello = false;

        env.addGlobal("hello", hello);

        expect(env.getGlobal("hello")).to.be.equal(hello);

        finish(done);
    });

    it("should fail on getting non-existent global", (done) => {
        const env = new Environment(new Loader(templatesPath));

        // Using this format instead of .withArgs since env.getGlobal uses 'this'
        expect(() => {
            env.getGlobal("hello");
        }).to.throw();

        finish(done);
    });

    it("should pass context as this to global functions", (done) => {
        const env = new Environment(new Loader(templatesPath));

        env.addGlobal("hello", function () {
            return `Hello ${this.lookup("user")}`;
        });

        equal("{{ hello() }}", { user: "James" }, "Hello James", env);
        finish(done);
    });

    it("should be exclusive to each environment", (done) => {
        const env = new Environment(new Loader(templatesPath));

        env.addGlobal("hello", "konichiwa");
        const env2 = new Environment(new Loader(templatesPath));

        // Using this format instead of .withArgs since env2.getGlobal uses 'this'
        expect(() => {
            env2.getGlobal("hello");
        }).to.throw();

        finish(done);
    });

    it("should return errors from globals", (done) => {
        const env = new Environment(new Loader(templatesPath));

        env.addGlobal("err", () => {
            throw new Error("Global error");
        });

        try {
            render("{{ err() }}", null, {}, env);
        } catch (e) {
            expect(e).to.be.an("Error");
        }

        finish(done);
    });
});
