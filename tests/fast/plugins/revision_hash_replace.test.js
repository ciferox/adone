describe("fast", "transform", "revision hash replace", () => {
    const { fast, std: { path } } = adone;
    const { File } = fast;

    const svgFileBody = "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg xmlns=\"http://www.w3.org/2000/svg\"></svg>";
    const cssFileBody = "@font-face { font-family: 'test'; src: url('/fonts/font.svg'); }\nbody { color: red; }";
    const jsFileBody = "console.log(\"Hello world\"); //# sourceMappingURL=app.js.map";
    const htmlFileBody = "<html><head><link rel=\"stylesheet\" href=\"/css/style.css\" /></head><body><img src=\"images/image.png\" /><img src=\"images/image.png\" /></body></html>";

    const src = ({ cwd = process.cwd(), read = true, buffer = true, stream = false } = {}) => {
        // just an empty source
        return new fast.LocalStream(null, { read, buffer, stream, cwd });
    };

    it("should by default replace filenames in .css and .html files", async () => {
        const stream = src()
            .stash((x) => x.extname === ".html")
            .revisionHash()
            .unstash()
            .revisionHashReplace();
        stream.write(new File({
            path: path.join("css", "style.css"),
            contents: Buffer.from(cssFileBody)
        }));
        stream.write(new File({
            path: path.join("fonts", "font.svg"),
            contents: Buffer.from(svgFileBody)
        }));
        stream.write(new File({
            path: "images/image.png",
            contents: Buffer.from("PNG")
        }));
        stream.write(new File({
            path: "index.html",
            contents: Buffer.from(htmlFileBody)
        }));
        stream.end(true);
        const files = await stream;
        expect(files).to.have.lengthOf(4);
        const unreplacedCSSFilePattern = /style\.css/;
        const unreplacedSVGFilePattern = /font\.svg/;
        const unreplacedPNGFilePattern = /image\.png/;
        for (const file of files) {
            const contents = file.contents.toString();
            const extension = path.extname(file.path);

            if (extension === ".html") {
                expect(!unreplacedCSSFilePattern.test(contents)).to.be.true(););
                expect(!unreplacedPNGFilePattern.test(contents)).to.be.true(););
            } else if (extension === ".css") {
                expect(!unreplacedSVGFilePattern.test(contents)).to.be.true(););
            } else if (extension === ".svg") {
                expect(contents === svgFileBody).to.be.true(););
            }
        }
    });

    it("should not replace filenames in extensions not in replaceInExtensions", async () => {
        const stream = src()
            .stash((x) => x.extname !== ".css")
            .revisionHash()
            .unstash()
            .revisionHashReplace({ replaceInExtensions: [".svg"] });

        stream.write(new File({
            path: "css\\style.css",
            contents: Buffer.from(cssFileBody)
        }));
        stream.write(new File({
            path: "index.html",
            contents: Buffer.from(htmlFileBody)
        }));
        stream.end(true);

        const files = await stream;
        expect(files).to.have.lengthOf(2);
        const unreplacedCSSFilePattern = /style\.css/;
        for (const file of files) {
            const contents = file.contents.toString();
            const extension = path.extname(file.path);
            if (extension === ".html") {
                expect(unreplacedCSSFilePattern.test(contents)).to.be.true(););
            }
        }
    });

    it("should not canonicalize URIs when option is off", async () => {
        const stream = src()
            .stash((x) => x.extname !== ".css")
            .revisionHash()
            .unstash()
            .revisionHashReplace({ replaceInExtensions: [".svg"] });

        stream.write(new File({
            path: "css\\style.css",
            contents: Buffer.from(cssFileBody)
        }));
        stream.write(new File({
            path: "index.html",
            contents: Buffer.from(htmlFileBody)
        }));
        stream.end(true);

        const files = await stream;
        expect(files).to.have.lengthOf(2);
        const unreplacedCSSFilePattern = /style\.css/;
        for (const file of files) {
            const contents = file.contents.toString();
            const extension = path.extname(file.path);
            if (extension === ".html") {
                expect(unreplacedCSSFilePattern.test(contents)).to.be.true(););
            }
        }
    });

    it("should add prefix to path", async () => {
        const stream = src()
            .stash((x) => x.extname !== ".css")
            .revisionHash()
            .unstash()
            .revisionHashReplace({ prefix: "http://example.com" });

        stream.write(new File({
            path: "css/style.css",
            contents: Buffer.from(cssFileBody)
        }));
        stream.write(new File({
            path: "index.html",
            contents: Buffer.from(htmlFileBody)
        }));
        stream.end(true);

        const files = await stream;
        expect(files).to.have.lengthOf(2);
        const replacedCSSFilePattern = /"http:\/\/example\.com\/css\/style-[^\.]+\.css"/;
        for (const file of files) {
            const contents = file.contents.toString();
            const extension = path.extname(file.path);
            if (extension === ".html") {
                expect(replacedCSSFilePattern.test(contents)).to.be.true(););
            }
        }
    });

    it("should stop at first longest replace", async () => {
        const jsFileBody = "var loadFile = \"nopestyle.css\"";
        const replacedJsFileBody = "var loadFile = \"nopestyle-19269897ba.css\"";

        const stream = src()
            .stash((x) => x.extname !== ".css")
            .revisionHash()
            .unstash()
            .revisionHashReplace({ canonicalUris: false });
        stream.write(new File({
            path: "style.css",
            contents: Buffer.from(cssFileBody)
        }));
        stream.write(new File({
            path: "nopestyle.css",
            contents: Buffer.from("boooooo")
        }));
        stream.write(new File({
            path: "script.js",
            contents: Buffer.from(jsFileBody)
        }));
        stream.end(true);

        const files = await stream;
        expect(files).to.have.lengthOf(3);
        for (const file of files) {
            if (file.path === "script.js") {
                expect(file.contents.toString()).to.be.equal(replacedJsFileBody);
            }
        }
    });

    describe("manifest option", () => {
        it("should replace filenames from manifest files", async () => {
            const manifest = src();
            manifest.write(new File({
                path: "/project/rev-manifest.json",
                contents: Buffer.from(JSON.stringify({
                    "/css/style.css": "/css/style-12345.css"
                }))
            }));
            manifest.write(new File({
                path: "/project/rev-image-manifest.json",
                contents: Buffer.from(JSON.stringify({
                    "images/image.png": "images/image-12345.png",
                    "/fonts/font.svg": "/fonts/font-12345.svg"
                }))
            }));
            manifest.end(true);

            const stream = src()
                .revisionHashReplace({ manifest });

            stream.write(new File({
                path: path.join("css", "style.css"),
                contents: Buffer.from(cssFileBody)
            }));
            stream.write(new File({
                path: path.join("fonts", "font.svg"),
                contents: Buffer.from(svgFileBody)
            }));
            stream.write(new File({
                path: "index.html",
                contents: Buffer.from(htmlFileBody)
            }));

            stream.end(true);

            const files = await stream;
            expect(files).to.have.lengthOf(3);
            const replacedCSSFilePattern = /style-12345\.css/;
            const replacedSVGFilePattern = /font-12345\.svg/;
            const replacedPNGFilePattern = /image-12345\.png/;

            for (const file of files) {
                const contents = file.contents.toString();
                const extension = path.extname(file.path);

                if (extension === ".html") {
                    expect(replacedCSSFilePattern.test(contents)).to.be.true(););
                    expect(replacedPNGFilePattern.test(contents)).to.be.true(););
                } else if (extension === ".css") {
                    expect(replacedSVGFilePattern.test(contents)).to.be.true(););
                } else if (extension === ".svg") {
                    expect(contents === svgFileBody).to.be.true(););
                }
            }
        });

        it("should add prefix to path", async () => {
            const manifest = src();
            manifest.write(new File({
                path: "/project/rev-manifest.json",
                contents: Buffer.from(JSON.stringify({
                    "/css/style.css": "/css/style-12345.css"
                }))
            }));
            manifest.end(true);

            const stream = src()
                .revisionHashReplace({ prefix: "http://example.com", manifest });
            stream.write(new File({
                path: "index.html",
                contents: Buffer.from(htmlFileBody)
            }));
            stream.end(true);

            const files = await stream;
            expect(files).to.have.lengthOf(1);

            const replacedCSSFilePattern = /"http:\/\/example\.com\/css\/style-12345\.css"/;
            for (const file of files) {
                const contents = file.contents.toString();
                const extension = path.extname(file.path);
                if (extension === ".html") {
                    expect(replacedCSSFilePattern.test(contents)).to.be.true(););
                }
            }
        });
    });

    describe("modifyUnreved and modifyReved options", () => {
        it("should modify the names of reved and un-reved files", async () => {
            const manifest = src();
            manifest.write(new File({
                path: "/project/rev-manifest.json",
                contents: Buffer.from(JSON.stringify({
                    "js/app.js.map": "js/app-12345.js.map",
                    "css/style.css": "css/style-12345.css"
                }))
            }));
            manifest.end(true);

            const replaceJsIfMap = (filename) => {
                if (filename.indexOf(".map") > -1) {
                    return filename.replace("js/", "");
                }
                return filename;
            };

            const stream = src()
                .revisionHashReplace({ manifest, modifyUnreved: replaceJsIfMap, modifyReved: replaceJsIfMap });
            stream.write(new File({
                path: path.join("js", "app.js"),
                contents: Buffer.from(jsFileBody)
            }));
            stream.write(new File({
                path: "index.html",
                contents: Buffer.from(htmlFileBody)
            }));

            stream.end(true);

            const replacedJSMapFilePattern = /sourceMappingURL\=app-12345\.js\.map/;
            const replacedCSSFilePattern = /css\/style-12345\.css/;

            const files = await stream;
            expect(files).to.have.lengthOf(2);

            for (const file of files) {
                const contents = file.contents.toString();
                const extension = path.extname(file.path);

                if (extension === ".js") {
                    expect(replacedJSMapFilePattern.test(contents)).to.be.true(););
                } else if (extension === ".html") {
                    expect(replacedCSSFilePattern.test(contents)).to.be.true(););
                }
            }
        });
    });
});
