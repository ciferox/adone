describe("fast", "transform", "wiredep", () => {
    const { fast, std: { fs } } = adone;

    const fixturesDir = adone.std.path.resolve(__dirname, "fixture");

    require.uncache = function (moduleName) {
        let mod = require.resolve(moduleName);
        if (mod && ((mod = require.cache[mod]) !== undefined)) {
            (function run(mod) {
                mod.children.forEach((child) => {
                    run(child);
                });
                delete require.cache[mod.id];
            })(mod);
        }

        const modulePath = adone.std.path.resolve(__dirname, moduleName);
        for (const cacheKey of module.cache.keys()) {
            if (cacheKey.includes(modulePath)) {
                module.cache.delete(cacheKey);
            }
        }
    };

    const getFilePaths = (fileName, fileType) => {
        const extension = fileType.match(/([^/]*)[/]*/)[1];
        const filePaths = {
            expected: adone.std.path.resolve(fileType, `${fileName}-expected.${extension}`),
            actual: adone.std.path.resolve(fileType, `${fileName}-actual.${extension}`),
            read: (type) => {
                return fs.readFileSync(filePaths[type], { encoding: "utf8" });
            }
        };

        return filePaths;
    };


    let wiredep;
    let prevWorkDir;
    let fixturesCopyDir;

    beforeEach(() => {
        // wtf
        wiredep = require("../../../../../lib/glosses/fast/transforms/wiredep").default;
    });

    afterEach(() => {
        require.uncache("../../../../../lib/glosses/fast/transforms/wiredep");
    });

    before(async () => {
        fixturesCopyDir = adone.std.path.resolve(__dirname, ".tmp");
        await fast.src(adone.std.path.join(fixturesDir, "**", "*"), { stream: true, dot: true })
            .dest(fixturesCopyDir);
        prevWorkDir = process.cwd();
        process.chdir(fixturesCopyDir);
    });

    after(async () => {
        process.chdir(prevWorkDir);
        await adone.fs.rm(fixturesCopyDir);
    });

    describe("replace functionality", () => {
        function testReplace(fileType) {
            return async function () {
                const filePaths = getFilePaths("index", fileType);

                await wiredep({ src: [filePaths.actual] });

                assert.deepEqual(
                    filePaths.read("expected").split("\n"),
                    filePaths.read("actual").split("\n")
                );
            };
        }

        it("should work in FAST chains", async () => {
            const filePaths = getFilePaths("index", "html");

            await fast.src([filePaths.actual]).wiredep()
                .dest(adone.std.path.dirname(filePaths.actual));

            assert.deepEqual(
                filePaths.read("expected").split("\n"),
                filePaths.read("actual").split("\n")
            );
        });

        it("should work with html files", testReplace("html"));
        it("should work with jade files (buffered comments)", testReplace("jade"));

        it("should work with jade files (unbuffered comments)", async () => {
            const filePaths = getFilePaths("index-unbuffered-comments", "jade");

            await wiredep({ src: [filePaths.actual] });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });

        it("should work with pug files (buffered comments)", testReplace("pug"));

        it("should work with pug files (unbuffered comments)", async () => {
            const filePaths = getFilePaths("index-unbuffered-comments", "pug");

            await wiredep({ src: [filePaths.actual] });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });
        it("should work with sass files", testReplace("sass"));
        it("should work with scss files", testReplace("scss"));
        it("should work with yml files", testReplace("yml"));
        it("should work with slim files", testReplace("slim"));
        it("should work with js files", testReplace("js"));
        it("should work with haml files", testReplace("haml"));
        it("should work with unrecognized file types", testReplace("unrecognized"));
        it("should correctly handle relative paths", testReplace("html/deep/nested"));

        it("should detect and use quotation marks", async () => {
            const filePaths = getFilePaths("index-detect-quotation-marks", "html");

            await wiredep({ src: [filePaths.actual] });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });

        it("should support globbing", async () => {
            await wiredep({ src: ["html/index-actual.*", "jade/index-actual.*", "slim/index-actual.*", "haml/index-actual.*"] });

            [
                {
                    actual: "html/index-actual.html",
                    expected: "html/index-expected.html"
                },
                {
                    actual: "jade/index-actual.jade",
                    expected: "jade/index-expected.jade"
                },
                {
                    actual: "slim/index-actual.slim",
                    expected: "slim/index-expected.slim"
                },
                {
                    actual: "haml/index-actual.haml",
                    expected: "haml/index-expected.haml"
                }
            ].forEach((testObject) => {
                assert.equal(
                    fs.readFileSync(testObject.actual, { encoding: "utf8" }),
                    fs.readFileSync(testObject.expected, { encoding: "utf8" })
                );
            });
        });
    });

    describe("second run (identical files)", () => {
        function testReplaceSecondRun(fileType) {
            return async function () {
                const filePaths = getFilePaths("index-second-run", fileType);

                await wiredep({ src: [filePaths.actual] });

                assert.equal(filePaths.read("expected"), filePaths.read("actual"));
            };
        }

        it("should replace html after second run", testReplaceSecondRun("html"));
        it("should replace jade after second run", testReplaceSecondRun("jade"));
        it("should replace less after second run", testReplaceSecondRun("less"));
        it("should replace sass after second run", testReplaceSecondRun("sass"));
        it("should replace scss after second run", testReplaceSecondRun("scss"));
        it("should replace styl after second run", testReplaceSecondRun("styl"));
        it("should replace yml after second run", testReplaceSecondRun("yml"));
        it("should replace slim after second run", testReplaceSecondRun("slim"));
        it("should replace haml after second run", testReplaceSecondRun("haml"));
    });

    describe("excludes", () => {
        function testReplaceWithExcludedSrc(fileType) {
            return async function () {
                const filePaths = getFilePaths("index-excluded-files", fileType);

                await wiredep({
                    src: [filePaths.actual],
                    exclude: ["bower_components/bootstrap/dist/js/bootstrap.js", /codecode/]
                });

                assert.equal(filePaths.read("expected"), filePaths.read("actual"));
            };
        }

        it("should handle html with excludes specified", testReplaceWithExcludedSrc("html"));
        it("should handle jade with excludes specified", testReplaceWithExcludedSrc("jade"));
        it("should handle yml with excludes specified", testReplaceWithExcludedSrc("yml"));
        it("should handle slim with excludes specified", testReplaceWithExcludedSrc("slim"));
        it("should handle haml with excludes specified", testReplaceWithExcludedSrc("haml"));
    });

    describe("after uninstalls", () => {
        describe("after uninstalling one package", () => {
            function testReplaceAfterUninstalledPackage(fileType) {
                return async function () {
                    const filePaths = getFilePaths("index-after-uninstall", fileType);

                    await wiredep({ src: [filePaths.actual] });

                    await wiredep({
                        bowerJson: JSON.parse(fs.readFileSync("./bower_after_uninstall.json")),
                        src: [filePaths.actual]
                    });

                    assert.equal(filePaths.read("expected"), filePaths.read("actual"));
                };
            }

            it("should work with html", testReplaceAfterUninstalledPackage("html"));
            it("should work with jade", testReplaceAfterUninstalledPackage("jade"));
            it("should work with slim", testReplaceAfterUninstalledPackage("slim"));
            it("should work with haml", testReplaceAfterUninstalledPackage("haml"));
        });

        describe("after uninstalling all packages", () => {
            function testReplaceAfterUninstallingAllPackages(fileType) {
                return async function () {
                    const filePaths = getFilePaths("index-after-uninstall-all", fileType);

                    await wiredep({ src: [filePaths.actual] });

                    await wiredep({
                        bowerJson: JSON.parse(fs.readFileSync("./bower_after_uninstall_all.json")),
                        src: [filePaths.actual]
                    });

                    assert.equal(filePaths.read("expected"), filePaths.read("actual"));
                };
            }

            it("should work with html", testReplaceAfterUninstallingAllPackages("html"));
            it("should work with jade", testReplaceAfterUninstallingAllPackages("jade"));
            it("should work with slim", testReplaceAfterUninstallingAllPackages("slim"));
            it("should work with haml", testReplaceAfterUninstallingAllPackages("haml"));
        });
    });

    describe("custom format", () => {
        function testReplaceWithCustomFormat(fileType, fileTypes) {
            return async function () {
                const filePaths = getFilePaths("index-custom-format", fileType);

                await wiredep({
                    src: [filePaths.actual],
                    fileTypes
                });

                assert.equal(filePaths.read("expected"), filePaths.read("actual"));
            };
        }

        it("should work with html", testReplaceWithCustomFormat("html", {
            html: {
                replace: {
                    js: "<script type=\"text/javascript\" src=\"{{filePath}}\"></script>",
                    css: "<link href=\"{{filePath}}\" rel=\"stylesheet\">"
                }
            }
        }));

        it("should work with jade", testReplaceWithCustomFormat("jade", {
            jade: {
                replace: {
                    js: "script(type='text/javascript', src='{{filePath}}')",
                    css: "link(href='{{filePath}}', rel='stylesheet')"
                }
            }
        }));

        it("should work with yml", testReplaceWithCustomFormat("yml", {
            yml: {
                replace: {
                    css: "- \"{{filePath}}\" #css",
                    js: "- \"{{filePath}}\""
                }
            }
        }));

        it("should work with slim", testReplaceWithCustomFormat("slim", {
            slim: {
                replace: {
                    js: "script type='text/javascript' src='{{filePath}}'",
                    css: "link href='{{filePath}}' rel='stylesheet'"
                }
            }
        }));

        it("should work with haml", testReplaceWithCustomFormat("haml", {
            haml: {
                replace: {
                    js: "%script{type:'text/javascript', src:'{{filePath}}'}",
                    css: "%link{href:'{{filePath}}', rel:'stylesheet'}"
                }
            }
        }));

    });

    describe("devDependencies", () => {
        it("should wire devDependencies if specified", async () => {
            const filePaths = getFilePaths("index-with-dev-dependencies", "html");

            await wiredep({
                dependencies: false,
                devDependencies: true,
                src: [filePaths.actual]
            });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });
    });

    describe("overrides", () => {
        it("should allow configuration overrides to specify a `main`", async () => {
            const filePaths = getFilePaths("index-packages-without-main", "html");
            const bowerJson = JSON.parse(fs.readFileSync("./bower_packages_without_main.json"));
            const overrides = bowerJson.overrides;
            delete bowerJson.overrides;

            await wiredep({
                bowerJson,
                overrides,
                src: [filePaths.actual],
                exclude: ["fake-package-without-main-and-confusing-file-tree"]
            });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });

        it("should allow configuration overrides to specify `dependencies`", async () => {
            const filePaths = getFilePaths("index-override-dependencies", "html");
            const bowerJson = JSON.parse(fs.readFileSync("./bower_packages_without_dependencies.json"));
            const overrides = bowerJson.overrides;
            delete bowerJson.overrides;

            await wiredep({
                bowerJson,
                overrides,
                src: [filePaths.actual]
            });

            assert.equal(filePaths.read("expected"), filePaths.read("actual"));
        });
    });

    describe("events", () => {
        const filePath = "html/index-emitter.html";
        let fileData;

        before((done) => {
            fs.readFile(filePath, (err, file) => {
                fileData = file;
                done(err || null);
            });
        });

        beforeEach((done) => {
            fs.writeFile(filePath, fileData, done);
        });

        it("should send injected file data", (done) => {
            let injected = 0;
            const paths = ["bootstrap.css", "codecode.css", "bootstrap.js", "codecode.js", "jquery.js"];

            wiredep({
                src: filePath,
                onPathInjected: (file) => {
                    assert(typeof file.block !== "undefined");
                    assert.equal(file.file, filePath);
                    assert(paths.indexOf(file.path.split("/").pop()) > -1);

                    if (++injected === paths.length) {
                        done();
                    }
                }
            });
        });

        it("should send updated file path", (done) => {
            wiredep({
                src: filePath,
                onFileUpdated: (path) => {
                    assert.equal(path, filePath);
                    done();
                }
            });
        });

        it("should send package name when main is not found", (done) => {
            const bowerJson = JSON.parse(fs.readFileSync("./bower_packages_without_main.json"));
            const packageWithoutMain = "fake-package-without-main-and-confusing-file-tree";

            wiredep({
                bowerJson,
                src: filePath,
                onMainNotFound: (pkg) => {
                    assert.equal(pkg, packageWithoutMain);
                    done();
                }
            });
        });

        it("should throw an error when component is not found", async () => {
            const bowerJson = JSON.parse(fs.readFileSync("./bower_with_missing_component.json"));
            const missingComponent = "missing-component";

            try {
                await wiredep({
                    bowerJson,
                    src: filePath
                });
            } catch (e) {
                assert.isOk(e);
                assert.instanceOf(e, adone.x.NotFound);
                assert.equal(e.message, `${missingComponent} is not installed. Try running \`bower install\` or remove the component from your bower.json file.`);
                return;
            }
            assert.fail("Didn't throw any exceptions");
        });
    });

    it("should allow specifying a custom replace function", async () => {
        const filePaths = getFilePaths("index-with-custom-replace-function", "html");

        await wiredep({
            src: [filePaths.actual],
            fileTypes: {
                html: {
                    replace: {
                        js: (filePath) => {
                            return `<script src="${filePath}" class="yay"></script>`;
                        }
                    }
                }
            }
        });

        assert.equal(filePaths.read("expected"), filePaths.read("actual"));
    });

    it("should return a useful object", async () => {
        const returnedObject = await wiredep();

        assert.equal(typeof returnedObject.js, "object");
        assert.equal(typeof returnedObject.css, "object");
        assert.equal(typeof returnedObject.less, "object");
        assert.equal(typeof returnedObject.scss, "object");
        assert.equal(typeof returnedObject.styl, "object");
        assert.equal(typeof returnedObject.packages, "object");
    });

    it("should respect the directory specified in a `.bowerrc`", () => {
        const filePaths = getFilePaths("index-with-custom-bower-directory", "html");

        wiredep({
            bowerJson: JSON.parse(fs.readFileSync("./bowerrc/bower.json")),
            cwd: "./bowerrc",
            src: [filePaths.actual]
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });

    it("should support inclusion of main files from top-level bower.json", async () => {
        const filePaths = getFilePaths("index-include-self", "html");

        await wiredep({
            bowerJson: JSON.parse(fs.readFileSync("./bower_with_main.json")),
            src: [filePaths.actual],
            includeSelf: true
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });

    it("should support inclusion of main files from bower.json in some other dir", async () => {
        const filePaths = getFilePaths("index-cwd-include-self", "html");

        await wiredep({
            src: [filePaths.actual],
            cwd: "cwd_includeself",
            includeSelf: true
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });

    it("should support inclusion of main files from some other dir with manually loaded bower.json", async () => {
        const filePaths = getFilePaths("index-cwd-include-self", "html");

        await wiredep({
            bowerJson: JSON.parse(fs.readFileSync("./cwd_includeself/bower.json")),
            src: [filePaths.actual],
            cwd: "cwd_includeself",
            includeSelf: true
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });

    it("should support inclusion of glob main files from bower.json", async () => {
        const filePaths = getFilePaths("index-include-glob", "html");

        await wiredep({
            bowerJson: JSON.parse(fs.readFileSync("./glob_main/bower.json")),
            src: [filePaths.actual],
            cwd: "glob_main"
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });

    it("include-self: true should support inclusion of glob main files from own bower.json", async () => {
        const filePaths = getFilePaths("index-include-self-glob", "html");

        await wiredep({
            bowerJson: JSON.parse(fs.readFileSync("./bower_with_main_glob.json")),
            src: [filePaths.actual],
            includeSelf: true
        });

        assert.equal(filePaths.read("actual"), filePaths.read("expected"));
    });
});
