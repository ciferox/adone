import * as util from "./util";

describe("templating", "nunjucks", "runtime", () => {
    const { finish, render } = util;

    it("should report the failed function calls to symbols", (done) => {
        render('{{ foo("cvan") }}', {}, { noThrow: true }, (err) => {
            expect(err).to.match(/Unable to call `foo`, which is undefined/);
        });

        finish(done);
    });

    it("should report the failed function calls to lookups", (done) => {
        render('{{ foo["bar"]("cvan") }}', {}, { noThrow: true }, (err) => {
            expect(err).to.match(/foo\["bar"\]/);
        });

        finish(done);
    });

    it("should report the failed function calls to calls", (done) => {
        render('{{ foo.bar("second call") }}', {}, { noThrow: true }, (err) => {
            expect(err).to.match(/foo\["bar"\]/);
        });

        finish(done);
    });

    it("should report full function name in error", (done) => {
        render("{{ foo.barThatIsLongerThanTen() }}", {}, { noThrow: true }, (err) => {
            expect(err).to.match(/foo\["barThatIsLongerThanTen"\]/);
        });

        finish(done);
    });

    it("should report the failed function calls w/multiple args", (done) => {
        render('{{ foo.bar("multiple", "args") }}', {}, { noThrow: true }, (err) => {
            expect(err).to.match(/foo\["bar"\]/);
        });

        render('{{ foo["bar"]["zip"]("multiple", "args") }}',
            {},
            { noThrow: true },
            (err) => {
                expect(err).to.match(/foo\["bar"\]\["zip"\]/);
            });

        finish(done);
    });

    it("should allow for undefined macro arguments in the last position", (done) => {
        render("{% macro foo(bar, baz) %}" +
            "{{ bar }} {{ baz }}{% endmacro %}" +
            '{{ foo("hello", nosuchvar) }}',
        {},
        { noThrow: true },
        (err, res) => {
            expect(err).to.equal(null);
            expect(typeof res).to.be.equal("string");
        });

        finish(done);
    });

    it("should allow for objects without a prototype macro arguments in the last position", (done) => {
        const noProto = Object.create(null);
        noProto.qux = "world";

        render("{% macro foo(bar, baz) %}" +
            "{{ bar }} {{ baz.qux }}{% endmacro %}" +
            '{{ foo("hello", noProto) }}',
        { noProto },
        { noThrow: true },
        (err, res) => {
            expect(err).to.equal(null);
            expect(res).to.equal("hello world");
        });

        finish(done);
    });
});
