const { is, std: { fs, path } } = adone;

const checkGlobResult = (glob, done, checking) => {
    glob.toArray((result) => {
        result.sort();
        try {
            checking(result);
            done();
        } catch (error) {
            done(error);
        }
    }).on("error", done);
};

const alphasort = (a, b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
};

const cleanResults = (m) => {
    for (let i = 0; i < m.length; ++i) {
        m[i] = m[i].replace(/\/+/g, "/").replace(/\/$/, "");
    }

    if (is.windows) {
        for (let i = 0; i < m.length; ++i) {
            m[i] = m[i].replace(/^[a-zA-Z]:\\\\/, "/").replace(/\\/g, "/");
        }
    }

    return adone.util.unique(m).sort(alphasort);
};

// verify that path cache keys are all absolute
const verifyGlobCacheIsAbsolute = (glob) => {
    const caches = ["cache", "statCache", "symlinks"];
    for (const cache of caches) {
        for (const p of Object.keys(glob[cache])) {
            assert.isOk(adone.is.pathAbsolute(p), `${p} should be absolute`);
        }
    }
};

describe("fs", "glob", () => {
    const fixtureDir = path.resolve(__dirname, "fixtures");

    before(async () => {
        let files = [
            "a/.abcdef/x/y/z/a",
            "a/abcdef/g/h",
            "a/abcfed/g/h",
            "a/b/c/d",
            "a/bc/e/f",
            "a/c/d/c/b",
            "a/cb/e/f",
            "a/x/.y/b",
            "a/z/.y/b",
            "b",
            "c"
        ];

        const symlinkTo = path.resolve(fixtureDir, "a/symlink/a/b/c");
        const symlinkFrom = "../..";

        files = files.map((f) => {
            return path.resolve(fixtureDir, f);
        });

        await adone.fs.rm(fixtureDir);

        await Promise.all(files.sort().map(async (f) => {
            f = path.resolve(fixtureDir, f);
            await adone.fs.mkdir(path.dirname(f), 0o755);
            await adone.fs.writeFile(f, "i like tests");
        }));

        if (!is.windows) {
            const d = path.dirname(symlinkTo);
            await adone.fs.mkdir(d, 0o755);
            await adone.fs.symlink(symlinkFrom, symlinkTo, "dir");
        }

        await Promise.all(["foo", "bar", "baz", "asdf", "quux", "qwer", "rewq"].map((w) => {
            w = `/tmp/glob-test/${w}`;
            return adone.fs.mkdir(w);
        }));

        // generate the bash pattern test-fixtures if possible
        if (is.windows || !process.env.TEST_REGEN) {
            adone.info("Windows, or TEST_REGEN unset. Using cached fixtures.");
            return;
        }

        const globs = [
            // put more patterns here.
            // anything that would be directly in / should be in /tmp/glob-test
            "a/*/+(c|g)/./d",
            "a/**/[cg]/../[cg]",
            "a/{b,c,d,e,f}/**/g",
            "a/b/**",
            "**/g",
            "a/abc{fed,def}/g/h",
            "a/abc{fed/g,def}/**/",
            "a/abc{fed/g,def}/**///**/",
            "**/a/**/",
            "+(a|b|c)/a{/,bc*}/**",
            "*/*/*/f",
            "**/f",
            "a/symlink/a/b/c/a/b/c/a/b/c//a/b/c////a/b/c/**/b/c/**",
            "{./*/*,/tmp/glob-test/*}",
            "{/tmp/glob-test/*,*}", // evil owl face!    how you taunt me!
        ];
        if (!is.windows) {
            globs.push("a/!(symlink)/**", "a/symlink/a/**/*");
        }
        const bashOutput = {};

        const flatten = (chunks) => {
            let s = 0;
            for (const c of chunks) {
                s += c.length;
            }
            const out = new Buffer(s);
            s = 0;
            for (const c of chunks) {
                c.copy(out, s);
                s += c.length;
            }

            return out.toString().trim();
        };

        await Promise.all(globs.map((pattern) => {
            return new Promise((resolve, reject) => {
                const opts = [
                    "-O", "globstar",
                    "-O", "extglob",
                    "-O", "nullglob",
                    "-c",
                    `for i in ${pattern}; do echo $i; done`
                ];
                const cp = adone.std.child_process.spawn("bash", opts, { cwd: fixtureDir });
                let out = [];
                cp.stdout.on("data", (c) => {
                    out.push(c);
                });
                cp.stderr.pipe(process.stderr);
                cp.on("close", (code) => {
                    out = flatten(out);
                    if (!out) {
                        out = [];
                    } else {
                        out = cleanResults(out.split(/\r*\n/));
                    }

                    bashOutput[pattern] = out;
                    if (code) {
                        reject(new Error(`Bash exit with code ${code}`));
                    }
                    resolve();
                });
            });
        }));

        const fname = path.resolve(__dirname, "bash-results.json");
        const data = `${JSON.stringify(bashOutput, null, 2)}\n`;
        await adone.fs.writeFile(fname, data);
    });

    //remove the fixtures
    after(async () => {
        await adone.fs.rm(fixtureDir);
    });

    it("should end if the input is empty", async () => {
        await adone.fs.glob([]);
    });

    it("with cwd", async () => {
        await adone.fs.glob("*.js", { cwd: process.cwd() });
    });

    it("without cwd", async () => {
        await adone.fs.glob("*.js", {});
    });

    it("*", (done) => {
        const g = adone.fs.glob("*", { cwd: __dirname });

        checkGlobResult(g, done, (result) => {
            result = result.map((x) => path.join(__dirname, x));
            assert.include(result, path.resolve(__filename));
        });
    });

    describe("globs arrays", () => {
        const tests = [
            [["b", "c"], ["b", "c"], {}],
            [["*", "!c"], ["!c", "a", "b"], {}],
            [["a", "!c"], ["!c", "a"], { nonegate: true }]
        ];

        const newFixtureName = path.join(fixtureDir, "!c");

        before(() => {
            fs.writeFileSync(newFixtureName, "hello");
        });

        after(() => {
            fs.unlinkSync(newFixtureName);
        });

        for (const test of tests) {
            const [pattern, expect, opts] = test;
            opts.cwd = fixtureDir;
            it(JSON.stringify(pattern), (done) => {
                const g = adone.fs.glob(pattern, opts);

                checkGlobResult(g, done, (result) => {
                    assert.deepEqual(result, expect);
                });
            });
        }
    });

    it("absolute path", (done) => {
        const g = adone.fs.glob(path.join(__dirname, "*.js"));

        checkGlobResult(g, done, (result) => {
            if (is.windows) {
                result = result.map((p) => {
                    return path.resolve(p);
                });
            }
            assert.include(result, path.resolve(__filename));
        });
    });

    it("path to file", (done) => {
        const g = adone.fs.glob(__filename);

        checkGlobResult(g, done, (result) => {
            if (is.windows) {
                result = result.map((p) => {
                    return path.resolve(p);
                });
            }
            assert.include(result, path.resolve(__filename));
        });
    });

    it("* in root should not be recursive", async () => {
        await adone.fs.glob("*", { cwd: path.resolve("/") });
    });

    describe("bash-comparison", () => {
        // basic test
        // show that it does the same thing by default as the shell.
        const bashResults = JSON.parse(fs.readFileSync(path.join(__dirname, "./bash-results.json")));
        const globs = Object.keys(bashResults);
        const origCwd = process.cwd();

        before(async () => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        for (const pattern of globs) {
            const expect = bashResults[pattern];
            // anything regarding the symlink thing will fail on windows, so just skip it
            if (is.windows &&
                expect.some((m) => /\bsymlink\b/.test(m))) {
                return;
            }

            it(pattern, (done) => {
                adone.fs.glob(pattern, {}).toArray((matches) => {
                    // sort and unmark, just to match the shell results
                    matches = cleanResults(matches);
                    assert.deepEqual(matches, expect, pattern);
                    done();
                }).once("error", done);
            });
        }
    });

    if (!is.windows) {
        describe("broken-symlink", () => {
            const link = "a/broken-link/link";

            const patterns = [
                "a/broken-link/*",
                "a/broken-link/**",
                "a/broken-link/**/link",
                "a/broken-link/**/*",
                "a/broken-link/link",
                "a/broken-link/{link,asdf}",
                "a/broken-link/+(link|asdf)",
                "a/broken-link/!(asdf)"
            ];

            const opts = [
                undefined,
                { nonull: true },
                { mark: true },
                { stat: true },
                { follow: true }
            ];

            const cleanup = () => {
                try {
                    fs.unlinkSync("a/broken-link/link");
                    fs.rmdirSync("a/broken-link");
                    fs.rmdirSync("a");
                } catch (e) {
                    if (e.code !== "ENOENT") {
                        throw e;
                    }
                }
            };

            before(async () => {
                cleanup();
                await adone.fs.mkdir("a/broken-link");
                fs.symlinkSync("this-does-not-exist", "a/broken-link/link");
            });

            for (const pattern of patterns) {
                it(pattern, async () => {
                    for (const opt of opts) {
                        const msg = `${pattern} with opt=${JSON.stringify(opt)}`;
                        // eslint-disable-next-line no-await-in-loop
                        let res = await adone.fs.glob(pattern, opt);

                        if (opt && opt.stat) {
                            res = res.map((x) => x.path);
                        }

                        assert.isOk(res.includes(link), msg);
                    }
                });
            }

            after(cleanup);
        });
    }

    describe("cwd-test", () => {
        const origCwd = process.cwd();

        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        describe("changing cwd and searching for **/d", () => {
            it("no cwd", async () => {
                const stream = adone.fs.glob("**/d", {});
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["a/b/c/d", "a/c/d"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it("a", async () => {
                const stream = adone.fs.glob("**/d", { cwd: path.resolve("a") });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["b/c/d", "c/d"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it("a/b", async () => {
                const stream = adone.fs.glob("**/d", { cwd: path.resolve("a/b") });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["c/d"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it("a/b/", async () => {
                const stream = adone.fs.glob("**/d", { cwd: path.resolve("a/b/") });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["c/d"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it(".", async () => {
                const stream = adone.fs.glob("**/d", { cwd: process.cwd() });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["a/b/c/d", "a/c/d"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });
        });

        it("non-dir cwd should raise error", (done) => {
            const notdir = "a/b/c/d";
            const notdirRE = /a[\\\/]b[\\\/]c[\\\/]d/;
            const abs = path.resolve(notdir);
            const expect = new Error(`ENOTDIR invalid cwd ${abs}`);
            expect.code = "ENOTDIR";
            expect.path = notdirRE;
            expect.stack = undefined;

            adone.fs.glob("*", { cwd: notdir }).on("error", (error) => {
                assert.equal(error.code, expect.code);
                assert.match(error.path, expect.path);
                done();
            });
        });
    });

    describe("empty-set", () => {
        // Patterns that cannot match anything
        const patterns = [
            "# comment",
            " ",
            "\n",
            "just doesnt happen to match anything so this is a control"
        ];

        for (const p of patterns) {
            it(JSON.stringify(p), async () => {
                const result = await adone.fs.glob(p);
                assert.deepEqual(result, [], "no returned values");
            });
        }
    });

    if (!is.windows) {
        describe("follow", () => {
            const origCwd = process.cwd();

            before(() => {
                process.chdir(fixtureDir);
            });

            after(() => {
                process.chdir(origCwd);
            });

            it("follow symlinks", async () => {
                const pattern = "a/symlink/**";

                const res = await adone.fs.glob(pattern, { follow: true });
                const follow = res.sort();

                const long = "a/symlink/a/b/c/a/b/c/a/b/c/a/b/c/a/b/c/a/b/c/a/b/c";
                assert.isOk(follow.includes(long), "follow should have long entry");
            });
        });
    }

    it("globstar should not have dupe matches", async () => {
        const pattern = "a/**/[gh]";
        const matches = await adone.fs.glob(pattern, { cwd: fixtureDir });
        matches.sort();
        const uniqMatches = adone.util.unique(matches);
        assert.deepEqual(matches, uniqMatches, "should have same set of matches");
    });

    describe("instanceOf", () => {
        it("create Core-stream object through function", () => {
            assert.instanceOf(adone.fs.glob("a", { noprocess: true }), adone.fs.glob.Core);
        });

        it("create glob object without processing", () => {
            assert.instanceOf(new adone.fs.glob.Glob("a", { noprocess: true }), adone.fs.glob.Glob);
        });

        it("create Core object without processing", () => {
            assert.instanceOf(new adone.fs.glob.Core("a", { noprocess: true }), adone.fs.glob.Core);
        });
    });

    describe("ignore", () => {
        // Ignore option test
        // Show that glob ignores results matching pattern on ignore option

        // [pattern, ignore, expect, opt (object) or cwd (string)]
        const cases = [
            ["*", null, ["abcdef", "abcfed", "b", "bc", "c", "cb", "symlink", "x", "z"], "a"],
            ["*", "b", ["abcdef", "abcfed", "bc", "c", "cb", "symlink", "x", "z"], "a"],
            ["*", "b*", ["abcdef", "abcfed", "c", "cb", "symlink", "x", "z"], "a"],
            ["b/**", "b/c/d", ["b", "b/c"], "a"],
            ["b/**", "d", ["b", "b/c", "b/c/d"], "a"],
            ["b/**", "b/c/**", ["b"], "a"],
            ["**/d", "b/c/d", ["c/d"], "a"],
            ["a/**/[gh]", ["a/abcfed/g/h"], ["a/abcdef/g", "a/abcdef/g/h", "a/abcfed/g"]],
            ["*", ["c", "bc", "symlink", "abcdef"], ["abcfed", "b", "cb", "x", "z"], "a"],
            ["**", ["c/**", "bc/**", "symlink/**", "abcdef/**"], ["abcfed", "abcfed/g", "abcfed/g/h", "b", "b/c", "b/c/d", "cb", "cb/e", "cb/e/f", "x", "z"], "a"],
            ["a/**", ["a/**"], []],
            ["a/**", ["a/**/**"], []],
            ["a/b/**", ["a/b"], ["a/b/c", "a/b/c/d"]],
            ["**", ["b"], ["abcdef", "abcdef/g", "abcdef/g/h", "abcfed", "abcfed/g", "abcfed/g/h", "b/c", "b/c/d", "bc", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["b", "c"], ["abcdef", "abcdef/g", "abcdef/g/h", "abcfed", "abcfed/g", "abcfed/g/h", "b/c", "b/c/d", "bc", "bc/e", "bc/e/f", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["b**"], ["abcdef", "abcdef/g", "abcdef/g/h", "abcfed", "abcfed/g", "abcfed/g/h", "b/c", "b/c/d", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["b/**"], ["abcdef", "abcdef/g", "abcdef/g/h", "abcfed", "abcfed/g", "abcfed/g/h", "bc", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["b**/**"], ["abcdef", "abcdef/g", "abcdef/g/h", "abcfed", "abcfed/g", "abcfed/g/h", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["ab**ef/**"], ["abcfed", "abcfed/g", "abcfed/g/h", "b", "b/c", "b/c/d", "bc", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["abc{def,fed}/**"], ["b", "b/c", "b/c/d", "bc", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["**", ["abc{def,fed}/*"], ["abcdef", "abcdef/g/h", "abcfed", "abcfed/g/h", "b", "b/c", "b/c/d", "bc", "bc/e", "bc/e/f", "c", "c/d", "c/d/c", "c/d/c/b", "cb", "cb/e", "cb/e/f", "symlink", "symlink/a", "symlink/a/b", "symlink/a/b/c", "x", "z"], "a"],
            ["c/**", ["c/*"], ["c", "c/d/c", "c/d/c/b"], "a"],
            ["a/c/**", ["a/c/*"], ["a/c", "a/c/d/c", "a/c/d/c/b"]],
            ["a/c/**", ["a/c/**", "a/c/*", "a/c/*/c"], []],
            ["a/**/.y", ["a/x/**"], ["a/z/.y"]],
            ["a/**/.y", ["a/x/**"], ["a/z/.y"], { dot: true }],
            ["a/**/b", ["a/x/**"], ["a/b", "a/c/d/c/b", "a/symlink/a/b"]],
            ["a/**/b", ["a/x/**"], ["a/b", "a/c/d/c/b", "a/symlink/a/b", "a/z/.y/b"], { dot: true }],
            ["*/.abcdef", "a/**", []],
            ["a/*/.y/b", "a/x/**", ["a/z/.y/b"]]
        ];

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        for (const [i, c] of adone.util.enumerate(cases)) {
            const [pattern, ignore] = c;
            let [, , expect, opt] = c;
            expect = expect.sort();

            let name = `${i} ${pattern} ${JSON.stringify(ignore)}`;
            if (is.string(opt)) {
                opt = { cwd: opt };
            }

            if (opt) {
                name += ` ${JSON.stringify(opt)}`;
            } else {
                opt = {};
            }

            const matches = [];

            opt.ignore = ignore;

            it(name, (done) => {
                const stream = adone.fs.glob(pattern, opt);
                const glob = stream.globs[0];
                glob.on("end", (res) => {
                    if (is.windows) {
                        expect = expect.filter((f) => {
                            return !/\bsymlink\b/.test(f);
                        });
                    }

                    assert.deepEqual(res.sort(), expect, "async");
                    assert.deepEqual(matches.sort(), expect, "match events");
                    done();
                }).once("error", done);

                glob.on("match", (p) => {
                    matches.push(p);
                });
            });
        }

        describe("race condition", () => {
            const origCwd = process.cwd();
            const jumpTo = path.resolve(fixtureDir, "..");

            before(() => {
                process.chdir(jumpTo);
            });

            after(() => {
                process.chdir(origCwd);
            });

            const pattern = "fixtures/*";
            for (const dot of [true, false]) {
                for (const ignore of ["fixtures/**", null]) {
                    for (const nonull of [false, true]) {
                        for (const cwd of [false, jumpTo, "."]) {
                            const opt = { dot, ignore, nonull };
                            const expect = ignore ? [] : ["fixtures/a", "fixtures/b", "fixtures/c"];

                            if (cwd) {
                                opt.cwd = cwd;
                            }

                            it(JSON.stringify(opt), async () => {
                                const res = await adone.fs.glob(pattern, opt);
                                assert.deepEqual(res, expect);
                            });
                        }
                    }
                }
            }
        });
    });

    describe("mark", () => {
        const origCwd = process.cwd();
        const oldStat = adone.fs.glob.Glob.prototype._stat;
        before(() => {
            // expose timing issues
            let lag = 5;
            adone.fs.glob.Glob.prototype._stat = function (o) {
                return function (f, cb) {
                    setTimeout(() => {
                        o.call(this, f, cb);
                    }, lag += 5);
                };
            }(adone.fs.glob.Glob.prototype._stat);

            process.chdir(fixtureDir);
        });

        after(() => {
            adone.fs.glob.Glob.prototype._stat = oldStat;
            process.chdir(origCwd);
        });


        it("mark with cwd", async () => {
            const pattern = "*/*";
            const opt = { mark: true, cwd: "a" };

            const expect = [
                "abcdef/g/",
                "abcfed/g/",
                "b/c/",
                "bc/e/",
                "c/d/",
                "cb/e/"
            ].sort();

            if (!is.windows) {
                expect.push("symlink/a/");
            }

            const res = await adone.fs.glob(pattern, opt);
            assert.deepEqual(res.sort(), expect);
        });

        it("mark, with **", async () => {
            const pattern = "a/*b*/**";
            const opt = { mark: true };

            const expect = [
                "a/abcdef/",
                "a/abcdef/g/",
                "a/abcdef/g/h",
                "a/abcfed/",
                "a/abcfed/g/",
                "a/abcfed/g/h",
                "a/b/",
                "a/b/c/",
                "a/b/c/d",
                "a/bc/",
                "a/bc/e/",
                "a/bc/e/f",
                "a/cb/",
                "a/cb/e/",
                "a/cb/e/f"
            ];

            const results = await adone.fs.glob(pattern, opt);
            assert.deepEqual(results.sort(), expect);
        });

        it("mark, no / on pattern", (done) => {
            const pattern = "a/*";
            const opt = { mark: true };
            const stream = adone.fs.glob(pattern, opt);
            const glob = stream.globs[0];

            stream.toArray((results) => {
                const expect = [
                    "a/abcdef/",
                    "a/abcfed/",
                    "a/b/",
                    "a/bc/",
                    "a/c/",
                    "a/cb/",
                    "a/x/",
                    "a/z/"
                ];

                if (!is.windows) {
                    expect.push("a/symlink/");
                }

                assert.deepEqual(results.sort(), expect.sort());
                done();
            }).once("error", done);

            glob.on("match", (m) => {
                assert.match(m, /\/$/);
            });
        });

        it("mark=false, no / on pattern", (done) => {
            const pattern = "a/*";
            const opt = null;
            const stream = adone.fs.glob(pattern, opt);
            const glob = stream.globs[0];

            stream.toArray((results) => {
                const expect = [
                    "a/abcdef",
                    "a/abcfed",
                    "a/b",
                    "a/bc",
                    "a/c",
                    "a/cb",
                    "a/x",
                    "a/z"
                ];

                if (!is.windows) {
                    expect.push("a/symlink");
                }

                assert.deepEqual(results.sort(), expect.sort());
                done();
            }).once("error", done);

            glob.on("match", (m) => {
                assert.match(m, /[^\/]$/);
            });
        });

        it("mark=true, / on pattern", (done) => {
            const pattern = "a/*/";
            const opt = { mark: true };
            const stream = adone.fs.glob(pattern, opt);
            const glob = stream.globs[0];

            stream.toArray((results) => {
                const expect = [
                    "a/abcdef/",
                    "a/abcfed/",
                    "a/b/",
                    "a/bc/",
                    "a/c/",
                    "a/cb/",
                    "a/x/",
                    "a/z/"
                ];

                if (!is.windows) {
                    expect.push("a/symlink/");
                }

                assert.deepEqual(results, expect.sort());
                done();
            }).once("error", done);

            glob.on("match", (m) => {
                assert.match(m, /\/$/);
            });
        });

        it("mark=false, / on pattern", (done) => {
            const pattern = "a/*/";
            const opt = null;
            const stream = adone.fs.glob(pattern, opt);
            const glob = stream.globs[0];

            stream.toArray((results) => {
                const expect = [
                    "a/abcdef/",
                    "a/abcfed/",
                    "a/b/",
                    "a/bc/",
                    "a/c/",
                    "a/cb/",
                    "a/x/",
                    "a/z/"
                ];

                if (!is.windows) {
                    expect.push("a/symlink/");
                }

                assert.deepEqual(results.sort(), expect.sort());
                done();
            }).once("error", done);

            glob.on("match", (m) => {
                assert.match(m, /\/$/);
            });
        });

        const cwd = process.cwd().replace(/[\/\\]+$/, "").replace(/\\/g, "/");
        for (const mark of [true, false]) {
            for (const slash of [true, false]) {
                it(`cwd mark:${mark} slash:${slash}`, async () => {
                    const pattern = cwd + (slash ? "/" : "");
                    const results = await adone.fs.glob(pattern, { mark });

                    assert.equal(results.length, 1);
                    const res = results[0].replace(/\\/g, "/");

                    if (slash || mark) {
                        assert.equal(res, `${cwd}/`);
                    } else {
                        assert.equal(res.indexOf(cwd), 0);
                    }
                });
            }
        }
    });

    describe("absolute", () => {
        const pattern = "a/b/**";
        const bashResults = JSON.parse(fs.readFileSync(path.join(__dirname, "./bash-results.json")));

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        it("emits absolute matches if option set", (done) => {
            const g = new adone.fs.glob.Glob(pattern, { absolute: true });

            let matchCount = 0;
            g.on("match", (m) => {
                assert.isOk(is.pathAbsolute(m), "path must be absolute");
                matchCount++;
            });

            g.on("end", (results) => {
                assert.equal(matchCount, bashResults[pattern].length, "must match all files");
                assert.equal(results.length, bashResults[pattern].length, "must match all files");

                for (const m of results) {
                    assert.isOk(is.pathAbsolute(m), "path must be absolute");
                }

                done();
            });
        });
    });

    describe("match-base", () => {

        const pattern = "a*";
        const expect = [
            "a",
            "a/abcdef",
            "a/abcfed"
        ];

        if (!is.windows) {
            expect.push("a/symlink/a", "a/symlink/a/b/c/a");
        }

        it("chdir", async () => {
            const origCwd = process.cwd();
            process.chdir(fixtureDir);
            let res;

            try {
                res = await adone.fs.glob(pattern, { matchBase: true });
            } catch (e) {
                process.chdir(origCwd);
                throw e;
            }

            process.chdir(origCwd);
            assert.deepEqual(res, expect);
        });

        it("cwd", async () => {
            const res = await adone.fs.glob(pattern, { matchBase: true, cwd: fixtureDir });
            assert.deepEqual(res, expect);
        });

        it("noglobstar", () => {
            assert.throws(() => {
                adone.fs.glob(pattern, { matchBase: true, noglobstar: true });
            });
        });
    });

    describe("nocase-nomagic", () => {

        const cwd = process.cwd();
        let drive = "c";
        if (/^[a-zA-Z]:[\\\/]/.test(cwd)) {
            drive = cwd.charAt(0).toLowerCase();
        }

        const oldStat = fs.stat;
        const oldStatSync = fs.statSync;
        const oldReaddir = fs.readdir;
        const oldReaddirSync = fs.readdirSync;

        before("mock fs", () => {
            const fakeStat = (path) => {
                switch (path.toLowerCase().replace(/\\/g, "/")) {
                    case "/tmp":
                    case "/tmp/":
                    case `${drive}:\\tmp`:
                    case `${drive}:\\tmp\\`:
                        return { isDirectory: () => true };
                    case "/tmp/a": case `${drive}:/tmp/a`:
                        return { isDirectory: () => false };
                }
            };

            fs.stat = function (path, cb) {
                const f = fakeStat(path);
                if (f) {
                    process.nextTick(() => {
                        cb(null, f);
                    });
                } else {
                    oldStat.call(fs, path, cb);
                }
            };

            fs.statSync = function (path) {
                return fakeStat(path) || oldStatSync.call(fs, path);
            };

            const fakeReaddir = (path) => {
                switch (path.toLowerCase().replace(/\\/g, "/")) {
                    case "/tmp":
                    case "/tmp/":
                    case `${drive}:/tmp`:
                    case `${drive}:/tmp/`:
                        return ["a", "A"];
                    case "/":
                    case `${drive}:/`:
                        return ["tmp", "tMp", "tMP", "TMP"];
                }
            };

            fs.readdir = function (path, cb) {
                const f = fakeReaddir(path);
                if (f) {
                    process.nextTick(() => {
                        cb(null, f);
                    });
                } else {
                    oldReaddir.call(fs, path, cb);
                }
            };

            fs.readdirSync = function (path) {
                return fakeReaddir(path) || oldReaddirSync.call(fs, path);
            };
        });

        after("revert fs mock", () => {
            fs.stat = oldStat;
            fs.statSync = oldStatSync;
            fs.readdir = oldReaddir;
            fs.readdirSync = oldReaddirSync;
        });

        it("nocase, nomagic", async () => {
            let want = [
                "/TMP/A",
                "/TMP/a",
                "/tMP/A",
                "/tMP/a",
                "/tMp/A",
                "/tMp/a",
                "/tmp/A",
                "/tmp/a"
            ];
            if (is.windows) {
                want = want.map((p) => {
                    return `${drive}:${p}`;
                });
            }

            const p = [];

            for (let i = 0; i < 2; i++) {
                p.push(adone.fs.glob("/tmp/a", { nocase: true }).then((res) => {
                    if (is.windows) {
                        res = res.map((r) => {
                            return r.replace(/\\/g, "/").replace(new RegExp(`^${drive}:`, "i"), `${drive}:`);
                        });
                    }
                    assert.deepEqual(res.sort(), want);
                }));
            }

            await Promise.all(p);
        });

        it("nocase, with some magic", async () => {
            let want = [
                "/TMP/A",
                "/TMP/a",
                "/tMP/A",
                "/tMP/a",
                "/tMp/A",
                "/tMp/a",
                "/tmp/A",
                "/tmp/a"
            ];
            if (is.windows) {
                want = want.map((p) => {
                    return `${drive}:${p}`;
                });
            }

            const p = [];

            for (let i = 0; i < 2; i++) {
                p.push(adone.fs.glob("/tmp/*", { nocase: true }).then((res) => {
                    if (is.windows) {
                        res = res.map((r) => {
                            return r.replace(/\\/g, "/").replace(new RegExp(`^${drive}:`, "i"), `${drive}:`);
                        });
                    }
                    assert.deepEqual(res.sort(), want);
                }));
            }

            await Promise.all(p);
        });
    });

    describe("nodir", () => {

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        const root = path.resolve(fixtureDir, "a");

        // [pattern, options, expect]
        const cases = [
            [
                "*/**",
                { cwd: "a" },
                [
                    "abcdef/g/h",
                    "abcfed/g/h",
                    "b/c/d",
                    "bc/e/f",
                    "c/d/c/b",
                    "cb/e/f"
                ]
            ],
            [
                "a/*b*/**",
                {},
                [
                    "a/abcdef/g/h",
                    "a/abcfed/g/h",
                    "a/b/c/d",
                    "a/bc/e/f",
                    "a/cb/e/f"
                ]
            ],
            ["a/*b*/**/", {}, []],
            ["*/*", { cwd: "a" }, []],
            ["/*/*", { root }, []],
            [
                "/b*/**",
                { root },
                [
                    "/b/c/d",
                    "/bc/e/f"
                ].map((m) => {
                    return path.join(root, m).replace(/\\/g, "/");
                })
            ]
        ];

        for (const c of cases) {
            const pattern = c[0];
            const options = c[1] || {};
            options.nodir = true;
            const expect = c[2].sort();
            it(`${pattern} ${JSON.stringify(options)}`, async () => {
                const stream = adone.fs.glob(pattern, options);
                let results = await stream;
                results = results.sort();

                await new Promise((resolve) => {
                    new adone.fs.glob.Glob(pattern, options, (er, res) => {
                        res = res.sort();
                        assert.deepEqual(res, expect, "async results");
                        assert.deepEqual(results, expect, "async results");
                        verifyGlobCacheIsAbsolute(stream.globs[0]);
                        resolve();
                    });
                });
            });
        }
    });

    describe("nonull", () => {

        // [pattern, options, expect]
        const cases = [
            ["a/*NOFILE*/**/", {}, ["a/*NOFILE*/**/"]],
            ["*/*", { cwd: "NODIR" }, ["*/*"]],
            ["NOFILE", {}, ["NOFILE"]],
            ["NOFILE", { cwd: "NODIR" }, ["NOFILE"]]
        ];

        for (const c of cases) {
            const pattern = c[0];
            const options = c[1] || {};
            options.nonull = true;
            const expect = c[2].sort();
            it(`${pattern} ${JSON.stringify(options)}`, async () => {
                let res = await adone.fs.glob(pattern, options);
                res = res.sort();
                assert.deepEqual(res, expect, "async results");
            });
        }
    });

    describe("pause-resume", () => {

        // show that no match events happen while paused.
        // just some gnarly pattern with lots of matches
        const pattern = "a/!(symlink)/**";
        const bashResults = JSON.parse(fs.readFileSync(path.join(__dirname, "./bash-results.json")));

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        for (const opt of [undefined, { stats: true }]) {
            const name = `use a Glob object, and pause/resume it ${opt ? JSON.stringify(opt) : ""}`;
            it(name, (done) => {
                let globResults = [];
                const g = new adone.fs.glob.Glob(pattern, opt);
                const expect = bashResults[pattern];

                g.on("match", (m) => {
                    assert.notOk(g.paused, "must not be paused");
                    globResults.push(m);
                    g.pause();
                    assert.ok(g.paused, "must be paused");
                    setTimeout(() => g.resume(), 10);
                });

                g.on("end", (matches) => {
                    globResults = cleanResults(globResults);
                    matches = cleanResults(matches);
                    assert.deepEqual(matches, globResults,
                        "end event matches should be the same as match events");
                    assert.deepEqual(matches, expect,
                        "adone.fs.glob matches should be the same as bash results");

                    done();
                });
            });
        }
    });

    describe("readme-issue", () => {

        const dir = `${__dirname}/package`;

        before("setup", async () => {
            await adone.fs.mkdir(dir);
            fs.writeFileSync(`${dir}/package.json`, "{}", "ascii");
            fs.writeFileSync(`${dir}/README`, "x", "ascii");
        });

        it("glob", async () => {
            const opt = {
                cwd: dir,
                nocase: true,
                mark: true
            };

            const files = await adone.fs.glob("README?(.*)", opt);
            assert.deepEqual(files, ["README"]);
        });

        after("cleanup", async () => {
            await adone.fs.rm(dir);
        });
    });

    if (!is.windows) {
        describe("realpath", () => {

            // pattern to find a bunch of duplicates
            const pattern = "a/symlink/{*,**/*/*/*,*/*/**,*/*/*/*/*/*}";

            const origCwd = process.cwd();
            before(() => {
                process.chdir(fixtureDir);
            });

            after(() => {
                process.chdir(origCwd);
            });

            // options, results
            // realpath:true set on each option
            const cases = [
                [{},
                ["a/symlink", "a/symlink/a", "a/symlink/a/b"]],

                [{ mark: true },
                ["a/symlink/", "a/symlink/a/", "a/symlink/a/b/"]],

                [{ follow: true },
                ["a/symlink", "a/symlink/a", "a/symlink/a/b"]],

                [{ cwd: "a" }, ["symlink", "symlink/a", "symlink/a/b"], pattern.substr(2)],

                [{ cwd: "a" },
                [],
                    "no one here but us chickens"],

                [{ nonull: true },
                ["no one here but us chickens", "no one here but us sheep"],
                    "no one here but us {chickens,sheep}"]

                // В отличии от оригинала, опции nounique + realpath
                // не спасает от дубликатов при зацикливании симлинков
            ];

            for (const c of cases) {
                const opt = c[0];
                let expect = c[1];
                if (!(opt.nonull && expect[0].match(/^no one here/))) {
                    expect = expect.map((d) => {
                        d = `${opt.cwd ? path.join(fixtureDir, opt.cwd) : fixtureDir}/${d}`;
                        return d.replace(/\\/g, "/");
                    });
                }
                const p = c[2] || pattern;

                opt.realpath = true;

                it(`"${p}" ${JSON.stringify(opt)}`, async () => {
                    const result = await adone.fs.glob(p, opt);
                    result.sort();
                    assert.deepEqual(result, expect);
                });
            }
        });
    }

    describe("root-nomount", () => {

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        describe("changing root and searching for /b*/**", () => {
            it(".", async () => {
                const stream = adone.fs.glob("/b*/**", { root: ".", nomount: true });
                const matches = await stream;
                assert.deepEqual(matches, []);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it("a", async () => {
                const stream = adone.fs.glob("/b*/**", { root: path.resolve("a"), nomount: true });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["/b", "/b/c", "/b/c/d", "/bc", "/bc/e", "/bc/e/f"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });

            it("root=a, cwd=a/b", async () => {
                const stream = adone.fs.glob("/b*/**", { root: "a", cwd: path.resolve("a/b"), nomount: true });
                const matches = await stream;
                matches.sort();
                assert.deepEqual(matches, ["/b", "/b/c", "/b/c/d", "/bc", "/bc/e", "/bc/e/f"]);
                verifyGlobCacheIsAbsolute(stream.globs[0]);
            });
        });
    });

    describe("root", () => {

        const origCwd = process.cwd();
        before(() => {
            process.chdir(fixtureDir);
        });

        after(() => {
            process.chdir(origCwd);
        });

        it(".", async () => {
            const stream = adone.fs.glob("/b*/**", { root: "." });
            const matches = await stream;
            matches.sort();
            assert.deepEqual(matches, []);
            verifyGlobCacheIsAbsolute(stream.globs[0]);
        });


        it("a", async () => {
            const stream = adone.fs.glob("/b*/**", { root: path.resolve("a") });
            const matches = await stream;
            matches.sort();

            const expected = ["/b", "/b/c", "/b/c/d", "/bc", "/bc/e", "/bc/e/f"].map((m) => {
                return path.join(path.resolve("a"), m).replace(/\\/g, "/");
            });

            assert.deepEqual(matches, expected);
            verifyGlobCacheIsAbsolute(stream.globs[0]);
        });

        it("root=a, cwd=a/b", async () => {
            const stream = adone.fs.glob("/b*/**", { root: "a", cwd: path.resolve("a/b") });
            const matches = await stream;
            matches.sort();

            const expected = ["/b", "/b/c", "/b/c/d", "/bc", "/bc/e", "/bc/e/f"].map((m) => {
                return path.join(path.resolve("a"), m).replace(/\\/g, "/");
            });

            assert.deepEqual(matches, expected);
            verifyGlobCacheIsAbsolute(stream.globs[0]);
        });

        it("combined with absolute option", async () => {
            const stream = adone.fs.glob("/b*/**", { root: path.resolve("a"), absolute: true });
            const matches = await stream;
            matches.sort();

            const expect = ["/b", "/b/c", "/b/c/d", "/bc", "/bc/e", "/bc/e/f"].map((m) => {
                return path.join(path.resolve("a"), m).replace(/\\/g, "/");
            });

            assert.deepEqual(matches, expect);
            verifyGlobCacheIsAbsolute(stream.globs[0]);
        });

        it("cwdAbs when root=a, absolute=true", async () => {
            const stream = adone.fs.glob("/b*/**", { root: path.resolve("a"), absolute: true });
            await stream;

            assert.equal(stream.globs[0].cwdAbs, process.cwd().replace(/\\/g, "/"));
        });

        it("cwdAbs when root=a, absolute=true, cwd=__dirname", async () => {
            const stream = adone.fs.glob("/b*/**", { root: path.resolve("a"), absolute: true, cwd: __dirname });
            await stream;

            assert.equal(stream.globs[0].cwdAbs, __dirname.replace(/\\/g, "/"));
        });
    });

    describe("slash-cwd", () => {

        // regression test to make sure that slash-ended patterns
        // don't match files when using a different cwd.
        const pattern = "../{b*,a}/";
        const expect = ["../a/"];
        const cwd = path.join(fixtureDir, "a");

        const origCwd = process.cwd();
        before(() => {
            process.chdir(`${__dirname}/..`);
        });

        after(() => {
            process.chdir(origCwd);
        });

        it("slashes only match directories", async () => {
            const result = await adone.fs.glob(pattern, { cwd });
            assert.deepEqual(result, expect);
        });
    });

    describe("stat", () => {

        it("stat all the things", (done) => {
            const g = new adone.fs.glob.Glob("a/*abc*/**", { stat: true, cwd: fixtureDir });

            let matches = [];
            g.on("match", (m) => {
                matches.push(m);
            });

            let stats = [];
            g.on("match", (m, st) => {
                stats.push(m);
                assert.ok(st instanceof adone.std.fs.Stats);
            });

            g.on("end", (endMatches) => {
                stats = stats.sort();
                matches = matches.sort();
                endMatches = endMatches.sort();
                assert.deepEqual(stats, matches);
                assert.deepEqual(endMatches, matches);

                const statCache = [...g.statCache.keys()];
                assert.deepEqual(statCache.map((f) => {
                    return path.relative(fixtureDir, f).replace(/\\/g, "/");
                }).sort(), matches);

                done();
            });
        });

        it("stream stat", async () => {
            const result = await adone.fs.glob("*", { stat: true, cwd: fixtureDir });
            assert.deepEqual(result.map((x) => x.path).sort(), ["a", "b", "c"]);
        });

        describe("EPERM errors", () => {
            const expect = [
                "a/abcdef",
                "a/abcdef/g",
                "a/abcdef/g/h",
                "a/abcfed",
                "a/abcfed/g",
                "a/abcfed/g/h"
            ];

            const oldLstat = fs.lstat;
            const oldLstatSync = fs.lstatSync;
            const badPaths = /\ba[\\\/]?$|\babcdef\b/;

            before(() => {
                fs.lstat = function (path, cb) {
                    // synthetically generate a non-ENOENT error
                    if (badPaths.test(path)) {
                        const er = new Error("synthetic");
                        er.code = "EPERM";
                        return process.nextTick(cb.bind(null, er));
                    }

                    return oldLstat.call(fs, path, cb);
                };

                fs.lstatSync = function (path) {
                    // synthetically generate a non-ENOENT error
                    if (badPaths.test(path)) {
                        const er = new Error("synthetic");
                        er.code = "EPERM";
                        throw er;
                    }

                    return oldLstatSync.call(fs, path);
                };
            });

            after(() => {
                fs.lstat = oldLstat;
                fs.lstatSync = oldLstatSync;
            });

            it("stat errors other than ENOENT are ok", async () => {
                let matches = await adone.fs.glob("a/*abc*/**", { stat: true, cwd: fixtureDir });
                matches = matches.map((x) => x.path).sort();
                assert.deepEqual(matches, expect);
            });

            it("globstar with error in root", async () => {
                const expect = [
                    "a",
                    "a/abcdef",
                    "a/abcdef/g",
                    "a/abcdef/g/h",
                    "a/abcfed",
                    "a/abcfed/g",
                    "a/abcfed/g/h",
                    "a/b",
                    "a/b/c",
                    "a/b/c/d",
                    "a/bc",
                    "a/bc/e",
                    "a/bc/e/f",
                    "a/c",
                    "a/c/d",
                    "a/c/d/c",
                    "a/c/d/c/b",
                    "a/cb",
                    "a/cb/e",
                    "a/cb/e/f"
                ];

                if (!is.windows) {
                    expect.push(
                        "a/symlink",
                        "a/symlink/a",
                        "a/symlink/a/b",
                        "a/symlink/a/b/c",
                    );
                }

                expect.push("a/x", "a/z");

                const pattern = "a/**";
                const matches = await adone.fs.glob(pattern, { cwd: fixtureDir });
                matches.sort();
                assert.deepEqual(matches, expect);
            });
        });
    });

    describe("stat bug", () => {
        const createDirectories = async (n, level, p) => {
            for (let i = 0; i < n; ++i) {
                const q = path.join(p, String(i));
                if (level === 0) {
                    fs.writeFileSync(q, "hello");
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await adone.fs.mkdir(q);
                    // eslint-disable-next-line no-await-in-loop
                    await createDirectories(n, level - 1, q);
                }
            }
        };

        const hello = path.join(fixtureDir, "hello");
        const dirWidth = 4;
        const dirDepth = 1;

        before(async () => {
            await adone.fs.mkdir(hello);
            await createDirectories(dirWidth, dirDepth, hello);
        });

        after(async () => {
            await adone.fs.rm(hello);
        });

        it("should correct emit end with { stat: true }", (done) => {
            const g = new adone.fs.glob.Glob(path.join(hello, "**", "*"), { stat: true });

            let i = 0;
            g.on("match", () => {
                if (++i % 16 === 0) {
                    g.pause();
                    setTimeout(() => {
                        g.resume();
                    }, 100);
                }
            });

            g.on("end", () => {
                try {
                    assert.equal(i, Math.pow(dirWidth, dirDepth + 1) + dirWidth);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
