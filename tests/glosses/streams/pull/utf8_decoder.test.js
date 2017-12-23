describe("stream", "pull", "utf8decoder", () => {
    const fs = require("fs");
    const file = fs.readFileSync(__filename, "utf-8").split(/(\n)/).map((e) => {
        return Buffer.from(e);
    });
    const { stream: { pull } } = adone;
    const { utf8decoder: decode } = pull;

    //handle old node and new node
    const A = (buf) => {
        return [].slice.call(buf);
    };

    it("lines", (done) => {
        pull(
            pull.values(file),
            decode("utf8"),
            pull.collect((err, ary) => {
                if (err) {
                    throw err;

                }
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

        const rSplit = () => {
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

        let N = 100;
        let i = 0;
        while (N--) {
            pull(
                pull.values(rSplit()),
                decode(),
                pull.collect((err, ary) => {
                    assert.equal(ary.join(""), expected);
                    if (++i === 100) {
                        done();
                    }
                })
            );
        }

    });
});
