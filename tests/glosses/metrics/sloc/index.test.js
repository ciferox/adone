const sloc = adone.metrics.sloc;
const fs = adone.std.fs;
const path = adone.std.path;

let i;
import langs from "./languages.fixtures";
const manyLines = ((() => {
    const result = [];
    for (i = 0; i < 10000; i++) {
        result.push("# \n");
    }
    return result;
})()).join("");
const longLine = ((() => {
    const result1 = [];
    for (i = 0; i < 10000; i++) {
        result1.push("### ###");
    }
    return result1;
})()).join("");

describe("metrics", "sloc", () => {

    it("should be a function", () => {
        expect(sloc).to.be.a("function");
    });

    it("should count all lines", () => {
        expect(sloc("a\nb\nc", "js").total).to.be.equal(3);
    });

    it("should handle CRLF line endings", () =>
        expect(sloc("a\r\nb\r\nc", "js")).to.be.deep.equal({
            block: 0,
            comment: 0,
            empty: 0,
            mixed: 0,
            single: 0,
            source: 3,
            todo: 0,
            total: 3
        })
    );

    it("should handle CR line endings", () => {
        expect(sloc("a\rb\rc", "js").total).to.be.equal(3);
    });

    describe("language support", () => {
        langs.map((l) => ((l) =>
            l.names.map((n) => ((n) =>
                it(`should support ${n}`, () => {
                    const res = sloc(l.code, n);
                    expect(sloc.extensions.includes(n)).to.be.equal(true);
                    if (l.total) {
                        expect(res.total).to.be.equal(l.total, "Total");
                    }
                    if (l.source) {
                        expect(res.source).to.be.equal(l.source, "Source");
                    }
                    if (l.comment) {
                        expect(res.comment).to.be.equal(l.comment, "Comment");
                    }
                    if (l.single) {
                        expect(res.single).to.be.equal(l.single, "Single");
                    }
                    if (l.block) {
                        expect(res.block).to.be.equal(l.block, "Block");
                    }
                    if (l.empty) {
                        expect(res.empty).to.be.equal(l.empty, "Empty");
                    }
                    if (l.mixed) {
                        expect(res.mixed).to.be.equal(l.mixed, "Mixed");
                    }
                    if (l.todo) {
                        return expect(res.todo).to.be.equal(l.todo, "To Do");
                    }
                })
            )(n))
        )(l));
    });

    it("should throw an error", () => {
        expect(() => sloc("foo", "foobar")).to.throw();
        expect(() => sloc(null, "coffee")).to.throw();
    });

    it("keeps an array with all supported extensions", () => {
        expect(sloc.extensions).to.be.be.an("array");
        langs.map((l) => {
            l.names.map((n) => {
                expect(sloc.extensions.includes(n)).to.be.true();
            });
        });
    });

    it("keeps an array with all supported keys", () => {
        const keys = [
            "total",
            "source",
            "comment",
            "single",
            "block",
            "mixed",
            "empty",
            "todo"
        ];
        expect(sloc.keys).to.be.be.an("array");
        sloc.keys.map((k) => expect(keys.includes(k)).to.be.true);
    });

    it("can handle at least 10.000 lines", () => {
        expect(() => sloc(manyLines, "coffee")).not.throw();
    });

    it("can handle lines with at least 10.000 characters", () => {
        expect(() => sloc(longLine, "coffee")).not.throw();
    });

    it("evaluates the testfiles correctly", (done) =>
        fs.readFile(path.resolve(__dirname, "./testfiles/test.js"), "utf-8", (err, code) => {
            expect(err).to.be.null();
            let res = sloc(code, "js");
            expect(res.total).to.be.equal(175);
            expect(res.single).to.be.equal(0);
            expect(res.block).to.be.equal(165);
            expect(res.mixed).to.be.equal(0);
            expect(res.comment).to.be.equal(165);
            expect(res.empty).to.be.equal(26);
            expect(res.source).to.be.equal(8);
            expect(res.todo).to.be.equal(4);

            fs.readFile(path.resolve(__dirname, "./testfiles/test2.js"), "utf-8", (err, code) => {
                res = sloc(code, "js");
                expect(res.source).to.be.equal(0);
                expect(res.empty).to.be.equal(5);
                expect(res.block).to.be.equal(13);
                expect(res.total).to.be.equal(13);
                expect(res.todo).to.be.equal(0);
                done();
            });
        })
    );

    it("evaluates an empty file correctly", (done) =>
        fs.readFile(path.resolve(__dirname, "./testfiles/empty.js"), "utf-8", (err, code) => {
            const res = sloc(code, "js");
            expect(res.empty).to.be.equal(1);
            expect(res.source).to.be.equal(0);
            expect(res.total).to.be.equal(1);
            expect(res.todo).to.be.equal(0);
            done();
        })
    );

    it("ignores the last newline char", () => {
        const res = sloc("foo\nbar\n", "js");
        expect(res.empty).to.be.equal(0);
        expect(res.source).to.be.equal(2);
        expect(res.total).to.be.equal(2);
    });
});
