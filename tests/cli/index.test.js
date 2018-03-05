const {
    std
} = adone;

const fixture = std.path.join.bind(std.path, __dirname, "fixtures");

describe("cli", () => {
    const ADONE_CLI_PATH = std.path.join(adone.ROOT_PATH, "bin", "adone.js");
    describe("'run' command", () => {
        it("simple script", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("raw.js")]);
            assert.strictEqual(result.stdout, "start\nstop");
        });

        it("adone simplified application", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("active_simple_app.js")]);
            assert.strictEqual(result.stdout, "0\n1\n2\n3");
        });

        it("adone application", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("active_app.js")]);
            assert.strictEqual(result.stdout, "0\n1\n2\n3");
        });

        it("evaluate script", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "adone.log(process.versions)"]);
            assert.deepEqual(adone.data.json5.decode(result.stdout), process.versions);
        });

        it("evaluate script with default export", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export default { a: 1, b: 2, c: 3 };"]);
            assert.deepEqual(adone.data.json5.decode(result.stdout), {
                a: 1,
                b: 2,
                c: 3
            });
        });

        it("evaluate script with export", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export const data = { a: 1, b: 2, c: 3 };"]);
            assert.deepEqual(adone.data.json5.decode(result.stdout), {
                data: {
                    a: 1,
                    b: 2,
                    c: 3
                }
            });
        });

        it("evaluate script with function default export", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export default function () { adone.log(['use', 'simple', 'powerful', 'tools']); }"]);
            const parts = result.stdout.split("\n");
            assert.sameMembers(adone.data.json5.decode(parts[0]), ["use", "simple", "powerful", "tools"]);
            assert.strictEqual(parts[1], "undefined");
        });

        it("evaluate script with function default export that retrun value", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export default function () { return ['use', 'simple', 'powerful', 'tools']; }"]);
            assert.sameMembers(adone.data.json5.decode(result.stdout), ["use", "simple", "powerful", "tools"]);
        });

        it("evaluate script with async function default export", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export default function () { adone.log(['use', 'simple', 'powerful', 'tools']); }"]);
            const parts = result.stdout.split("\n");
            assert.sameMembers(adone.data.json5.decode(parts[0]), ["use", "simple", "powerful", "tools"]);
            assert.strictEqual(parts[1], "undefined");
        });

        it("evaluate script with async function default export that retrun value", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", "-e", "export default function () { return ['use', 'simple', 'powerful', 'tools']; }"]);
            assert.sameMembers(adone.data.json5.decode(result.stdout), ["use", "simple", "powerful", "tools"]);
        });

        it("script with default function export ", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("function_export.js")]);
            assert.strictEqual(result.stdout, `adone v${adone.package.version}`);
        });

        it("script with default async function export ", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("async_function_export.js")]);
            assert.strictEqual(result.stdout, `adone v${adone.package.version}`);
        });

        it("script with commonjs function export ", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("commonjs_function_export.js")]);
            assert.strictEqual(result.stdout, `adone v${adone.package.version}`);
        });

        it("run adone application in a path", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("app")]);
            assert.strictEqual(result.stdout, "app running");
        });

        it("run task", async () => {
            const result = await forkProcess(ADONE_CLI_PATH, ["run", fixture("task.js")]);
            assert.strictEqual(result.stdout, `adone v${adone.package.version}`);
        });
    });
});
