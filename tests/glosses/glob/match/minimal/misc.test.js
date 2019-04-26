import nm from "./support/match";
import parse from "./support/parse";

const { is } = adone;

const path = require("path");
const fixtures = parse("*.txt", { cwd: path.join(__dirname, "fixtures") });

describe("glob", "match", "minimal", "misc", () => {
    for (const [filename, lines] of Object.entries(fixtures)) {
        describe(`${filename}:`, () => {
            lines.forEach((line) => {
                if (is.string(line)) {
                    console.log(line);
                    return;
                }

                const fixture = line[0];
                const pattern = line[1];
                const expected = line[2];

                const title = `"${fixture}" should${expected ? "" : " not"} match "${pattern}"`;

                it(title, () => {
                    const msg = fixture + (expected ? " === " : " !== ") + pattern;
                    const nmRes = nm.isMatch(fixture, pattern);
                    const mmRes = nm.minimatch.isMatch(fixture, pattern);
                    let actual = nmRes === mmRes;

                    // tie-breaker
                    if (actual === false) {
                        actual = nmRes === nm.bash.isMatch(fixture, pattern);
                    }

                    assert(actual, msg);
                });
            });
        });
    }
});
