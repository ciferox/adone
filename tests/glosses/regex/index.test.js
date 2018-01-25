const { regex } = adone;

describe("regex", () => {
    it("posix filename", () => {
        const valids = [
            "index.js",
            "filename",
            "file_name",
            "file-name",
            "file name"
        ];

        const invalids = [
            "C:\\foo\\bar\\",
            "foo\\file",
            "index.js\\",
            "/foo/bar",
            ":foobar",
            "foo/bar:"
        ];

        for (let i = 0; i < invalids.length; i++) {
            assert.true(regex.filename().test(valids[i]));
        }

        for (let i = 0; i < invalids.length; i++) {
            assert.false(regex.filename().test(invalids[i]));
        }
    });

    describe("shebang", () => {
        it("with", () => {
            assert.true(regex.shebang().test('#!/usr/bin/env node\nconsole.log("unicorns");'));
            assert.equal(regex.shebang().exec("#!/usr/bin/env node")[1], "/usr/bin/env node");
        });

        it("without", () => {
            assert.equal(regex.shebang().exec("abc"), null);
        });
    });
});
