const {
    p2p: { stream: { pull, utf8Decoder } },
    std: { fs }
} = adone;

const file = fs.readFileSync(__filename, "utf-8").split(/(\n)/).map((e) => Buffer.from(e));

// console.log(file);

//handle old node and new node
// eslint-disable-next-line func-style
function A(buf) {
    return [].slice.call(buf);
}

describe("pull", "utf8Decoder", () => {
    it("lines", (done) => {

        pull(
            pull.values(file),
            utf8Decoder("utf8"),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;
                }
                console.log(ary.join(""));
                assert.equal(file.map(String).join(""), ary.join(""));
                done();
            })
        );

    });

    it("utf-8", (done) => {
        const expected = "cents:¢\neuros:€";

        const coinage = [
            A(Buffer.from("cents:")),
            [0xC2, 0xA2],
            A(Buffer.from("\n")),
            A(Buffer.from("euros:")),
            [0xE2, 0x82, 0xAC]
        ].reduce((a, b) => {
            return a.concat(b);
        });

        const rSplit = function () {
            const s = coinage.slice();
            const a = [];
            while (s.length) {
                const n = ~~(Math.random() * s.length) + 1;
                a.push(s.splice(0, n));
            }
            return a.map((e) => {
                return Buffer.from(e);
            });
        };

        expect(100).checks(done);
        let N = 100;

        while (N--) {
            pull(
                pull.values(rSplit()),
                utf8Decoder(),
                pull.collect((err, ary) => {
                    expect(ary.join("")).to.equal(expected).mark();
                })
            );
        }
    });
});
