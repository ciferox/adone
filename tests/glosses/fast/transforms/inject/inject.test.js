describe("fast", "transforms", "inject", () => {
    const { fast, std: { fs, path } } = adone;
    const { transform: { inject }, File } = fast;

    const expectedFile = (file) => {
        const filepath = path.resolve(__dirname, "expected", file);
        return new File({
            path: filepath,
            cwd: __dirname,
            base: path.resolve(__dirname, "expected", path.dirname(file)),
            contents: fs.readFileSync(filepath)
        });
    };

    const streamShouldContain = (stream, files, done) => {
        let received = 0;

        stream.on("error", (err) => {
            assert.isOk(err);
            done(err);
        });

        const contents = files.map((file) => {
            return String(expectedFile(file).contents);
        });

        stream.on("data", (newFile) => {
            assert.isOk(newFile);
            assert.isOk(newFile.contents);

            if (contents.length === 1) {
                assert.equal(String(newFile.contents), contents[0]);
            } else {
                assert.include(contents, String(newFile.contents));
                // contents.should.containEql(String(newFile.contents));
            }

            if (++received === files.length) {
                done();
            }
        });

        stream.resume();
    };

    const fixture = (file, read) => {
        const filepath = path.resolve(__dirname, "fixtures", file);
        return new File({
            path: filepath,
            cwd: __dirname,
            base: path.resolve(__dirname, "fixtures", path.dirname(file)),
            contents: read ? fs.readFileSync(filepath) : null
        });
    };

    const src = (files, options = {}) => {
        return adone.core(files.map((file) => {
            return fixture(file, options.read);
        }));
    };

    it("should throw an error when the old api with target as string is used", () => {
        assert.throw(() => {
            inject("fixtures/template.html");
        });
    });

    it("should throw an error if sources stream is undefined", () => {
        assert.throw(() => {
            inject();
        });
    });

    it("should throw an error if `templateString` option is specified", () => {
        assert.throw(() => {
            fast.src(["template.html"], { read: true })
                .pipe(inject(src(["file.js"]), { templateString: "<html></html>" }));
        });
    });

    it("should inject stylesheets, scripts, images, jsx and html components into desired file", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css",
            "image.png",
            "lib.jsx"
        ], { read: false });

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.html"], done);
    });

    it("should inject sources into multiple targets", (done) => {
        const target = src(["template.html", "template2.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css",
            "image.png",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.html", "defaults2.html"], done);
    });

    it("should inject stylesheets, scripts and html components with `ignorePath` removed from file path", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js",
            "styles.css",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { ignorePath: "/fixtures" }));

        streamShouldContain(stream, ["ignorePath.html"], done);
    });

    it("should inject stylesheets, scripts and html components with relative paths to target file if `relative` is truthy", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "../../folder/lib.js",
            "../../another/component.html",
            "../a-folder/lib2.js",
            "../../yet-another/styles.css",
            "../components/lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { relative: true }));

        streamShouldContain(stream, ["relative.html"], done);
    });

    it("should inject stylesheets, scripts and html components with `addPrefix` added to file path", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js",
            "styles.css",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { addPrefix: "my-test-dir" }));

        streamShouldContain(stream, ["addPrefix.html"], done);
    });

    // Причина пропуска: поддержка опции addSuffix вносит изрядной путаницы в код,
    // нужна ли она вообще?
    it.skip("should inject stylesheets, scripts and html components with `addSuffix` added to file path", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js",
            "styles.css",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { addSuffix: "?my-test=suffix" }));

        streamShouldContain(stream, ["addSuffix.html"], done);
    });

    it("should inject stylesheets and html components with self closing tags if `selfClosingTag` is truthy", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources, { selfClosingTag: true }));

        streamShouldContain(stream, ["selfClosingTag.html"], done);
    });

    it("should inject stylesheets, scripts and html components without root slash if `addRootSlash` is `false`", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { addRootSlash: false }));

        streamShouldContain(stream, ["noRootSlash.html"], done);
    });

    it("should inject stylesheets, scripts and html components without root slash if `addRootSlash` is `false` and `ignorePath` is set", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "a/folder/lib.js",
            "a/folder/component.html",
            "a/folder/styles.css",
            "a/folder/lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { addRootSlash: false, ignorePath: "fixtures" }));

        streamShouldContain(stream, ["noRootSlashWithIgnorePath.html"], done);
    });

    it("should use starttag and endtag if specified", (done) => {
        const target = src(["templateCustomTags.html"], { read: true });
        const sources = src([
            "lib.js",
            "lib2.js",
            "style.css"
        ]);

        const stream = target.pipe(inject(sources, {
            ignorePath: "fixtures",
            starttag: "<!DOCTYPE html>",
            endtag: "<h1>"
        }));

        streamShouldContain(stream, ["customTags.html"], done);
    });

    it("should use starttag and endtag with specified name if specified", (done) => {
        const target = src(["templateCustomName.html"], { read: true });
        const sources = src([
            "lib.js",
            "lib2.js"
        ]);

        const stream = target.pipe(inject(sources, { name: "head" }));

        streamShouldContain(stream, ["customName.html"], done);
    });

    it("should replace {{ext}} in starttag and endtag with current file extension if specified", (done) => {
        const target = src(["templateTagsWithExt.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js"
        ]);

        const stream = target.pipe(inject(sources, {
            ignorePath: "fixtures",
            starttag: "<!-- {{ext}}: -->",
            endtag: "<!-- /{{ext}} -->"
        }));

        streamShouldContain(stream, ["customTagsWithExt.html"], done);
    });

    it("should replace {{path}} in starttag and endtag with current file path if specified", (done) => {
        const target = src(["templateTagsWithPath.html"], { read: true });
        const sources = src([
            "template.html",
            "partial.html",
            "template2.html"
        ], { read: true });

        const stream = target.pipe(inject(sources, {
            starttag: "<!-- {{path}}: -->",
            endtag: "<!-- :{{path}} -->",
            transform: (filePath, file) => {
                return file.contents.toString("utf8");
            }
        }));

        streamShouldContain(stream, ["customTagsWithPath.html"], done);
    });

    it("should replace existing data within start and end tag", (done) => {
        const target = src(["templateWithExistingData.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources, {
            ignorePath: "fixtures"
        }));

        streamShouldContain(stream, ["existingData.html"], done);
    });

    it("should use custom transform function for each file if specified", (done) => {
        const target = src(["template.json"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "lib2.js",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources, {
            ignorePath: "fixtures",
            starttag: "\"{{ext}}\": [",
            endtag: "]",
            transform: (srcPath, file, i, length) => {
                return `  "${srcPath}"${i + 1 < length ? "," : ""}`;
            }
        }));

        streamShouldContain(stream, ["customTransform.json"], done);
    });

    it("should use special default tags when injecting into jsx files", (done) => {
        const target = src(["template.jsx"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.jsx"], done);
    });

    it("should use special default tags when injecting into jade files", (done) => {
        const target = src(["template.jade"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.jade"], done);
    });

    it("should use special default tags when injecting into pug files", (done) => {
        const target = src(["template.pug"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.pug"], done);
    });

    it("should be able to inject jsx into jade files (Issue #144)", (done) => {
        const target = src(["issue144.jade"], { read: true });
        const sources = src([
            "lib.js",
            "component.jsx"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["issue144.jade"], done);
    });

    it("should be able to inject jsx into pug files (Issue #144)", (done) => {
        const target = src(["issue144.pug"], { read: true });
        const sources = src([
            "lib.js",
            "component.jsx"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["issue144.pug"], done);
    });

    it("should use special default tags when injecting into slm files", (done) => {
        const target = src(["template.slm"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.slm"], done);
    });

    it("should use special default tags when injecting into slim files", (done) => {
        const target = src(["template.slim"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.slim"], done);
    });

    it("should use special default tags when injecting into haml files", (done) => {
        const target = src(["template.haml"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.haml"], done);
    });

    it("should use special default tags when injecting into less files", (done) => {
        const target = src(["template.less"], { read: true });
        const sources = src([
            "lib.css",
            "component.less",
            "styles.less"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.less"], done);
    });

    it("should use special default tags when injecting into sass files", (done) => {
        const target = src(["template.sass"], { read: true });
        const sources = src([
            "lib.css",
            "component.sass",
            "styles.sass",
            "component.scss",
            "styles.scss"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.sass"], done);
    });

    it("should use special default tags when injecting into scss files", (done) => {
        const target = src(["template.scss"], { read: true });
        const sources = src([
            "lib.css",
            "component.sass",
            "styles.sass",
            "component.scss",
            "styles.scss"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["defaults.scss"], done);
    });

    it("should be able to chain inject calls with different names without overrides (Issue #39)", (done) => {
        const target = src(["issue39.html"], { read: true });
        const sources1 = src([
            "lib1.js",
            "lib3.js"
        ]);
        const sources2 = src([
            "lib2.js",
            "lib4.js"
        ]);

        const stream = target
            .pipe(inject(sources1, { name: "head" }))
            .pipe(inject(sources2));

        streamShouldContain(stream, ["issue39.html"], done);
    });

    it.skip("should be able to inject hashed files (Issue #71)", (done) => {
        const target = src(["issue71.html"], { read: true });
        const sources = src([
            "lib.js?abcdef0123456789",
            "styles.css?0123456789abcdef"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["issue71.html"], done);
    });

    it("should be able to inject when tags are missing whitespace (Issue #56)", (done) => {
        const target = src(["issue56.html"], { read: true });
        const sources = src([
            "lib.js"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["issue56.html"], done);
    });

    it("should not crash when transform function returns undefined (Issue #74)", (done) => {
        const target = src(["issue74.html"], { read: true });
        const sources = src([
            "lib.js"
        ]);

        const stream = target.pipe(inject(sources, { transform: adone.noop }));

        streamShouldContain(stream, ["issue74.html"], done);
    });

    it("should be able to remove tags if removeTags option is set", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css",
            "image.png",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { removeTags: true }));

        streamShouldContain(stream, ["removeTags.html"], done);
    });

    it("should be able to remove tags without removing whitespace (issue #177)", (done) => {
        const target = src(["template.html"], { read: true });
        const sources = src([
            "lib.js",
            "component.html",
            "styles.css",
            "morestyles.css",
            "andevenmore.css",
            "image.png",
            "lib.jsx"
        ]);

        const stream = target.pipe(inject(sources, { removeTags: true }));

        streamShouldContain(stream, ["issue177.html"], done);
    });

    // Причина пропуска: не ясно, как экспортировать inject.transform
    it.skip("should be able to modify only the filepath (Issue #107)", function (done) {
        const version = "1.0.0";

        const target = src(["issue107.html"], { read: true });
        const sources = src([
            "lib.js"
        ]);

        const stream = target.pipe(inject(sources, {
            transform: (filepath) => {
                arguments[0] = `${filepath}?v=${version}`;
                return inject.transform.apply(inject.transform, arguments);
            }
        }));

        streamShouldContain(stream, ["issue107.html"], done);
    });

    it("should be able to inject source maps (Issue #176)", (done) => {
        const target = src(["issue176.html"], { read: true });
        const sources = src([
            "lib.js",
            "lib.js.map"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["issue176.html"], done);
    });

    it("should be able to empty tags when there are no files for that tag and empty option is set", (done) => {
        const target = src(["templateWithExistingData2.html"], { read: true });
        const sources = src([
            "lib.js"
        ]);

        const stream = target.pipe(inject(sources, { empty: true }));

        streamShouldContain(stream, ["emptyTags.html"], done);
    });

    it("should be able both leave and replace tag contents when there are no files for some tags and empty option is not set", (done) => {
        const target = src(["templateWithExistingData2.html"], { read: true });
        const sources = src([
            "picture.png"
        ]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["existingDataAndReplaced.html"], done);
    });

    it("should be able to empty all tags when there are no files at all and empty option is set", (done) => {
        const target = src(["templateWithExistingData2.html"], { read: true });
        const sources = src([]);

        const stream = target.pipe(inject(sources, { empty: true }));

        streamShouldContain(stream, ["emptyTags2.html"], done);
    });

    it("should leave all tags when there are no files at all and empty option is not set", (done) => {
        const target = src(["templateWithExistingData2.html"], { read: true });
        const sources = src([]);

        const stream = target.pipe(inject(sources));

        streamShouldContain(stream, ["templateWithExistingData2.html"], done);
    });

    it("should be able to remove and empty tags when there are no files for that tag and empty and removeTags option is set", (done) => {
        const target = src(["templateWithExistingData2.html"], { read: true });
        const sources = src([
            "lib.js"
        ]);

        const stream = target.pipe(inject(sources, { empty: true, removeTags: true }));

        streamShouldContain(stream, ["removeAndEmptyTags.html"], done);
    });

    it("should work in chains", (done) => {
        const sources = [
            "lib.js",
            "component.html",
            "styles.css",
            "image.png",
            "lib.jsx"
        ];

        const stream = src(["template.html"], { read: true })
            .pipe(inject(src(sources, { read: false })));

        streamShouldContain(stream, ["defaults.html"], done);
    });
});
