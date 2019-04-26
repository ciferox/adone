import nm from "./support/match";
import parse from "./support/parse";

const { is } = adone;

const path = require("path");

describe("glob", "match", "minimal", "bash.spec", () => {
    const fixtures = parse("*.txt", { cwd: path.join(__dirname, "fixtures") });

    for (const [filename, lines] of Object.entries(fixtures)) {
        describe(`${filename}:`, () => {
            lines.forEach((line) => {
                if (is.string(line)) {
                    return;
                }

                const fixture = line[0];
                const pattern = line[1];
                const expected = line[2];

                const title = `"${fixture}" should${expected ? "" : " not"} match "${pattern}"`;

                it(title, () => {
                    const msg = fixture + (expected ? " === " : " !== ") + pattern;
                    // assert.equal(mm.isMatch(fixture, pattern), mm.mm.isMatch(fixture, pattern), msg);
                    assert.equal(nm.isMatch(fixture, pattern), expected, msg);
                });
            });
        });
    }
});
