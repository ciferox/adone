describe("net", "http", "server", "util", "user agent", "samples", () => {
    const {
        is, fs, util,
        data: { json },
        net: { http: { server: { util: { userAgent } } } }
    } = adone;

    const msg = (name, actual, expected, string) => {
        string = (string ? `${string}\n` : "");
        return `${string}${name}\n     is: ${JSON.stringify(actual)}\n should: ${JSON.stringify(expected)}`;
    };

    const shallowMerge = (a, b) => {
        const c = util.clone(a);
        for (const k of util.keys(b)) {
            if (is.propertyDefined(a, k)) {
                if (!is.propertyDefined(b, k)) {
                    c[k] = a[k];
                    continue;
                }
                const [v1, v2] = [a[k], b[k]];
                if (!is.object(v1) || !is.object(v2)) {
                    c[k] = v1;
                    continue;
                }
                c[k] = shallowMerge(v1, v2);
            } else {
                c[k] = b[k];
            }
        }
        return c;
    };

    for (const ftype of ["big"]) {
        specify(ftype, async function test() {
            if (ftype === "big") {
                this.timeout(120000);
            }
            const file = new fs.File(__dirname, "fixtures", "samples", `${ftype}.json`);
            const lines = (await file.contents()).split("\n");

            if (lines[lines.length - 1] === "") {
                lines.pop();
            }

            const parser = userAgent.createParser();

            const empty = parser.parse("");

            for (const line of lines) {
                const expected = shallowMerge(
                    shallowMerge(json.decode(line), empty),
                    { os: { patchMinor: null } }
                );
                const actual = parser.parse(expected.string);

                for (const type of ["ua", "os", "engine", "device"]) {
                    if (type === "os") {
                        actual[type].patchMinor = actual[type].patchMinor || null;
                    }
                    assert.deepEqual(
                        actual[type],
                        expected[type],
                        msg(type, actual[type], expected[type])
                    );
                }
            }
        });
    }
});
