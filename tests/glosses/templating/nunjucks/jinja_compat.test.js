import { jinjaEqual as equal, finish } from "./util";

describe("templating", "nunjucks", "jinja-compat", () => {
    const arr = ["a", "b", "c", "d", "e", "f", "g", "h"];

    it("should support array slices with start and stop", (done) => {
        equal("{% for i in arr[1:4] %}{{ i }}{% endfor %}",
                  { arr },
                  "bcd");
        finish(done);
    });
    it("should support array slices using expressions", (done) => {
        equal("{% for i in arr[n:n+3] %}{{ i }}{% endfor %}",
                  { n: 1, arr },
                  "bcd");
        finish(done);
    });
    it("should support array slices with start", (done) => {
        equal("{% for i in arr[3:] %}{{ i }}{% endfor %}",
                  { arr },
                  "defgh");
        finish(done);
    });
    it("should support array slices with negative start", (done) => {
        equal("{% for i in arr[-3:] %}{{ i }}{% endfor %}",
                  { arr },
                  "fgh");
        finish(done);
    });
    it("should support array slices with stop", (done) => {
        equal("{% for i in arr[:4] %}{{ i }}{% endfor %}",
                  { arr },
                  "abcd");
        finish(done);
    });
    it("should support array slices with negative stop", (done) => {
        equal("{% for i in arr[:-3] %}{{ i }}{% endfor %}",
                  { arr },
                  "abcde");
        finish(done);
    });
    it("should support array slices with step", (done) => {
        equal("{% for i in arr[::2] %}{{ i }}{% endfor %}",
                  { arr },
                  "aceg");
        finish(done);
    });
    it("should support array slices with negative step", (done) => {
        equal("{% for i in arr[::-1] %}{{ i }}{% endfor %}",
                  { arr },
                  "hgfedcba");
        finish(done);
    });
    it("should support array slices with start and negative step", (done) => {
        equal("{% for i in arr[4::-1] %}{{ i }}{% endfor %}",
                  { arr },
                  "edcba");
        finish(done);
    });
    it("should support array slices with negative start and negative step", (done) => {
        equal("{% for i in arr[-5::-1] %}{{ i }}{% endfor %}",
                  { arr },
                  "dcba");
        finish(done);
    });
    it("should support array slices with stop and negative step", (done) => {
        equal("{% for i in arr[:3:-1] %}{{ i }}{% endfor %}",
                  { arr },
                  "hgfe");
        finish(done);
    });
    it("should support array slices with start and step", (done) => {
        equal("{% for i in arr[1::2] %}{{ i }}{% endfor %}",
                  { arr },
                  "bdfh");
        finish(done);
    });
    it("should support array slices with start, stop, and step", (done) => {
        equal("{% for i in arr[1:7:2] %}{{ i }}{% endfor %}",
                  { arr },
                  "bdf");
        finish(done);
    });
});
