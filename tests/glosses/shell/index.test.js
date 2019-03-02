import utils from "./utils/utils";

const {
    is,
    shell,
    std: { fs, path, os }
} = adone;

shell.config.silent = true;

const fixture = (name = "") => path.join(__dirname, "resources", name);

describe("shell", () => {
    describe("cat", () => {
        //
        // Invalids
        //

        it("no paths given", () => {
            const result = shell.cat();
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.match(result.stderr, /cat: no paths given/);
        });

        it("nonexistent file", () => {
            assert.isFalse(fs.existsSync("/asdfasdf")); // sanity check
            const result = shell.cat("/asdfasdf"); // file does not exist
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.match(result.stderr, /cat: no such file or directory: \/asdfasdf/);
        });

        it("directory", () => {
            const result = shell.cat(fixture("cat"));
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.match(result.stderr, /\/cat: Is a directory/);
        });

        //
        // Valids
        //

        it("simple", () => {
            const result = shell.cat(fixture("cat/file1"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "test1\n");
        });

        it("multiple files", () => {
            const result = shell.cat(fixture("cat/file2"), fixture("cat/file1"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "test2\ntest1\n");
        });

        it("multiple files, array syntax", () => {
            const result = shell.cat([fixture("cat/file2"), fixture("cat/file1")]);
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "test2\ntest1\n");
        });

        it("glob", () => {
            const result = shell.cat(fixture("file*.txt"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.isTrue(result.search("test1") > -1); // file order might be random
            assert.isTrue(result.search("test2") > -1);
        });

        it("without EOF", () => {
            const result = shell.cat(fixture("cat/file3"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "test3");
        });

        it("empty", () => {
            const result = shell.cat(fixture("cat/file5"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "");
        });

        //
        // With numbers
        //

        it("simple with numbers", () => {
            const result = shell.cat("-n", fixture("cat/file1"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "     1\ttest1\n");
        });

        it("simple twelve lines file with numbers", () => {
            const result = shell.cat("-n", fixture("cat/file4"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "     1\ttest4-01\n     2\ttest4-02\n     3\ttest4-03\n     4\ttest4-04\n     5\ttest4-05\n     6\ttest4-06\n     7\ttest4-07\n     8\ttest4-08\n     9\ttest4-09\n    10\ttest4-10\n    11\ttest4-11\n    12\ttest4-12\n");
        });

        it("multiple with numbers", () => {
            const result = shell.cat("-n", fixture("cat/file2"), fixture("cat/file1"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "     1\ttest2\n     2\ttest1\n");
        });

        it("simple numbers without EOF", () => {
            const result = shell.cat("-n", fixture("cat/file3"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "     1\ttest3");
        });

        it("multiple numbers without EOF", () => {
            const result = shell.cat("-n", fixture("cat/file3"), fixture("cat/file2"), fixture("cat/file1"));
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(result.toString(), "     1\ttest3test2\n     2\ttest1\n");
        });
    });

    describe("cd", () => {
        const cur = shell.pwd().toString();
        let tmp;

        beforeEach(() => {
            tmp = utils.getTempDir();
            shell.config.resetForTesting();
            process.chdir(cur);
            shell.mkdir(tmp);
        });

        afterEach(() => {
            process.chdir(cur);
            shell.rm("-rf", tmp);
        });

        //
        // Invalids
        //

        it("nonexistent directory", () => {
            assert.isFalse(fs.existsSync("/asdfasdf"));
            const result = shell.cd("/asdfasdf"); // dir does not exist
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.strictEqual(result.stderr, "cd: no such file or directory: /asdfasdf");
        });

        it("file not dir", () => {
            assert.isTrue(fs.existsSync(fixture("file1"))); // sanity check
            const result = shell.cd(fixture("file1")); // file, not dir
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.match(result.stderr, /cd: not a directory: /);
        });

        it("no previous dir", () => {
            const result = shell.cd("-"); // Haven't changed yet, so there is no previous directory
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            assert.strictEqual(result.stderr, "cd: could not find previous directory");
        });

        //
        // Valids
        //

        it("relative path", () => {
            const result = shell.cd(tmp);
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(path.basename(process.cwd()), path.basename(tmp));
        });

        it("absolute path", () => {
            const result = shell.cd("/");
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(process.cwd(), path.resolve("/"));
        });

        it("previous directory (-)", () => {
            shell.cd("/");
            const result = shell.cd("-");
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(process.cwd(), path.resolve(cur.toString()));
        });

        it("cd + other commands", () => {
            assert.isFalse(fs.existsSync(`${tmp}/file1`));
            let result = shell.cd(fixture());
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            result = shell.cp("file1", tmp);
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            result = shell.cd(tmp);
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.isTrue(fs.existsSync("file1"));
        });

        it("Tilde expansion", () => {
            shell.cd("~");
            assert.strictEqual(process.cwd(), os.homedir());
            shell.cd("..");
            assert.notStrictEqual(process.cwd(), os.homedir());
            shell.cd("~"); // Change back to home
            assert.strictEqual(process.cwd(), os.homedir());
        });

        it("Goes to home directory if no arguments are passed", () => {
            const result = shell.cd();
            assert.isNull(shell.error());
            assert.strictEqual(result.code, 0);
            assert.strictEqual(process.cwd(), os.homedir());
        });
    });

    describe.todo("chmod", () => {
        const { common } = shell;

        let TMP;
        const BITMASK = parseInt("777", 8);

        before(() => {
            TMP = utils.getTempDir();
            shell.cp("-r", fixture(), TMP);
            shell.config.silent = true;
        });

        after(() => {
            shell.rm("-rf", TMP);
        });

        //
        // Invalids
        //

        it("invalid permissions", () => {
            let result = shell.chmod("blah");
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
            result = shell.chmod("893", `${TMP}/chmod`); // invalid permissions - mode must be in octal
            assert.isTrue(is.string(shell.error()));
            assert.strictEqual(result.code, 1);
        });

        it("Basic usage with octal codes", () => {
            if (!is.windows) {
                let result = shell.chmod("755", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("755", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("644", 8)
                );
            }
        });

        it("symbolic mode", () => {
            if (!is.windows) {
                let result = shell.chmod("o+x", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("007", 8),
                    parseInt("005", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("symbolic mode, without group", () => {
            if (!is.windows) {
                let result = shell.chmod("+x", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("755", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("Test setuid", () => {
            if (!is.windows) {
                let result = shell.chmod("u+s", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("4000", 8),
                    parseInt("4000", 8)
                );
                result = shell.chmod("u-s", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("644", 8)
                );

                // according to POSIX standards at http://linux.die.net/man/1/chmod,
                // setuid is never cleared from a directory unless explicitly asked for.
                assert.strictEqual(result.code, 0);
                result = shell.chmod("u+s", `${TMP}/chmod/c`);

                result = shell.chmod("755", `${TMP}/chmod/c`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/c`).mode & parseInt("4000", 8),
                    parseInt("4000", 8)
                );
                result = shell.chmod("u-s", `${TMP}/chmod/c`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("Test setgid", () => {
            if (!is.windows) {
                let result = shell.chmod("g+s", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("2000", 8),
                    parseInt("2000", 8)
                );
                result = shell.chmod("g-s", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("644", 8)
                );
            }
        });

        it("Test sticky bit", () => {
            if (!is.windows) {
                let result = shell.chmod("+t", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("1000", 8),
                    parseInt("1000", 8)
                );
                result = shell.chmod("-t", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & BITMASK,
                    parseInt("644", 8)
                );
                assert.strictEqual(common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("1000", 8), 0);
            }
        });

        it("Test directories", () => {
            if (!is.windows) {
                let result = shell.chmod("a-w", `${TMP}/chmod/b/a/b`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/b/a/b`).mode & BITMASK,
                    parseInt("555", 8)
                );
                result = shell.chmod("755", `${TMP}/chmod/b/a/b`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("Test recursion", () => {
            if (!is.windows) {
                let result = shell.chmod("-R", "a+w", `${TMP}/chmod/b`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/b/a/b`).mode & BITMASK,
                    BITMASK
                );
                result = shell.chmod("-R", "755", `${TMP}/chmod/b`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/b/a/b`).mode & BITMASK,
                    parseInt("755", 8)
                );
            }
        });

        it("Test symbolic links w/ recursion  - WARNING: *nix only", () => {
            if (!is.windows) {
                fs.symlinkSync(`${TMP}/chmod/b/a`, `${TMP}/chmod/a/b/c/link`, "dir");
                let result = shell.chmod("-R", "u-w", `${TMP}/chmod/a/b`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/a/b/c`).mode & parseInt("700", 8),
                    parseInt("500", 8)
                );
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/b/a`).mode & parseInt("700", 8),
                    parseInt("700", 8)
                );
                result = shell.chmod("-R", "u+w", `${TMP}/chmod/a/b`);
                assert.strictEqual(result.code, 0);
                fs.unlinkSync(`${TMP}/chmod/a/b/c/link`);
            }
        });

        it("Test combinations", () => {
            let result = shell.chmod("a-rwx", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("000", 8),
                parseInt("000", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("multiple symbolic modes", () => {
            let result = shell.chmod("a-rwx,u+r", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("400", 8),
                parseInt("400", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("multiple symbolic modes #2", () => {
            let result = shell.chmod("a-rwx,u+rw", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("600", 8),
                parseInt("600", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("multiple symbolic modes #3", () => {
            if (!is.windows) {
                let result = shell.chmod("a-rwx,u+rwx", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("700", 8),
                    parseInt("700", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("u+rw", () => {
            let result = shell.chmod("000", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("u+rw", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("600", 8),
                parseInt("600", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("u+wx", () => {
            if (!is.windows) {
                let result = shell.chmod("000", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                result = shell.chmod("u+wx", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("300", 8),
                    parseInt("300", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("Multiple symbolic modes at once", () => {
            if (!is.windows) {
                let result = shell.chmod("000", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                result = shell.chmod("u+r,g+w,o+x", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("421", 8),
                    parseInt("421", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("u+rw,g+wx", () => {
            if (!is.windows) {
                let result = shell.chmod("000", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                result = shell.chmod("u+rw,g+wx", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("630", 8),
                    parseInt("630", 8)
                );
                result = shell.chmod("644", `${TMP}/chmod/file1`);
                assert.strictEqual(result.code, 0);
            }
        });

        it("u-x,g+rw", () => {
            let result = shell.chmod("700", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("u-x,g+rw", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("660", 8),
                parseInt("660", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("a-rwx,u+rw", () => {
            let result = shell.chmod("a-rwx,u+rw", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("600", 8),
                parseInt("600", 8)
            );
            result = shell.chmod("a-rwx,u+rw", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
            assert.strictEqual(
                common.statFollowLinks(`${TMP}/chmod/file1`).mode & parseInt("600", 8),
                parseInt("600", 8)
            );
            result = shell.chmod("644", `${TMP}/chmod/file1`);
            assert.strictEqual(result.code, 0);
        });

        it("Numeric modes", () => {
            let result = shell.chmod("744", `${TMP}/chmod/xdir`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("644", `${TMP}/chmod/xdir/file`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("744", `${TMP}/chmod/xdir/deep`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("644", `${TMP}/chmod/xdir/deep/file`);
            assert.strictEqual(result.code, 0);
            result = shell.chmod("-R", "a+X", `${TMP}/chmod/xdir`);
            assert.strictEqual(result.code, 0);
        });

        it("Make sure chmod succeeds for a variety of octal codes", () => {
            if (!is.windows) {
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/xdir`).mode & parseInt("755", 8),
                    parseInt("755", 8)
                );
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/xdir/file`).mode & parseInt("644", 8),
                    parseInt("644", 8)
                );
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/xdir/deep`).mode & parseInt("755", 8),
                    parseInt("755", 8)
                );
                assert.strictEqual(
                    common.statFollowLinks(`${TMP}/chmod/xdir/deep/file`).mode & parseInt("644", 8),
                    parseInt("644", 8)
                );
            }
        });
    });

    describe.only("which", () => {

        shell.config.silent = true;

        //
        // Invalids
        //

        it("no args", () => {
            shell.which();
            assert.isTrue(is.string(shell.error()));
        });

        it("command does not exist in the path", () => {
            const result = shell.which("asdfasdfasdfasdfasdf"); // what are the odds...
            assert.isNull(shell.error());
            assert.isNull(result);
        });

        //
        // Valids
        //

        // TODO(nate): make sure this does not have a false negative if 'git' is missing
        it("basic usage", () => {
            const git = shell.which("git");
            assert.strictEqual(git.code, 0);
            assert.isNull(git.stderr);
            assert.isNull(shell.error());
            assert.isTrue(fs.existsSync(git.toString()));
        });

        it("Windows can search with or without a .exe extension", () => {
            if (is.windows) {
                // This should be equivalent on Windows
                const node = shell.which("node");
                const nodeExe = shell.which("node.exe");
                assert.isFalse(shell.error());
                // If the paths are equal, then this file *should* exist, since that's
                // already been checked.
                assert.strictEqual(node.toString(), nodeExe.toString());
            }
        });

        it("Searching with -a flag returns an array", () => {
            const commandName = "node"; // Should be an existing command
            const result = shell.which("-a", commandName);
            assert.isNull(shell.error());
            assert.isTrue(is.array(result));
            assert.notStrictEqual(result.length, 0);
        });

        it("Searching with -a flag for not existing command returns an empty array", () => {
            const notExist = "6ef25c13209cb28ae465852508cc3a8f3dcdc71bc7bcf8c38379ba38me";
            const result = shell.which("-a", notExist);
            assert.isNull(shell.error());
            assert.strictEqual(result.length, 0);
        });

        it("Searching with -a flag returns an array with first item equals to the regular search", () => {
            const commandName = "node"; // Should be an existing command
            const resultForWhich = shell.which(commandName);
            const resultForWhichA = shell.which("-a", commandName);
            assert.isNull(shell.error());
            assert.exists(resultForWhich);
            assert.isTrue(is.array(resultForWhichA));
            assert.strictEqual(resultForWhich.toString(), resultForWhichA[0].toString());
        });
    });
});
