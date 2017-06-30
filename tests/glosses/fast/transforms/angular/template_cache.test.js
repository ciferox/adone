
describe("fast", "transform", "angular", "templateCache", () => {
    const { std: { path }, fast } = adone;
    const { File, transform: { angularTemplateCache: templateCache } } = fast;

    it("should build valid $templateCache from multiple source-files", (cb) => {
        const stream = templateCache("templates.js");

        stream.on("data", (file) => {
            expect(path.normalize(file.path)).to.be.equal(path.normalize(path.join(__dirname, "/templates.js")));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString()).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');\n$templateCache.put('/template-b.html','<h1 id=\"template-b\">I\\'m template B!</h1>');}]);");
            cb();
        }).on("error", cb);

        stream.write(new File({
            base: __dirname,
            path: path.join(__dirname, "template-a.html"),
            contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
        }));

        stream.write(new File({
            base: __dirname,
            path: path.join(__dirname, "template-b.html"),
            contents: Buffer.from("<h1 id=\"template-b\">I'm template B!</h1>")
        }));

        stream.end();
        stream.resume();
    });

    it("should allow options as first parameter if no filename is specified", (cb) => {
        const stream = templateCache({
            standalone: true,
            root: "/views"
        });

        stream.on("data", (file) => {
            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
            cb();
        }).on("error", cb);

        stream.write(new File({
            base: __dirname,
            path: `${__dirname}/template-a.html`,
            contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
        }));

        stream.end();
        stream.resume();
    });

    context("options.root", () => {

        it("should set root", (cb) => {
            const stream = templateCache("templates.js", {
                root: "/views"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should preserve the \"./\" if there is one in front of the root", (cb) => {
            const stream = templateCache("templates.js", {
                root: "./"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('./template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should preserve the \".\" if there is one in front of the root", (cb) => {
            const stream = templateCache("templates.js", {
                root: "."
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('./template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should preserve the root as is, if the root folder name start with a \".\" character", (cb) => {
            const stream = templateCache("templates.js", {
                root: ".root/"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('.root/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.transformUrl", () => {

        it("should change the URL to the output of the function", (cb) => {
            const stream = templateCache("templates.js", {
                transformUrl(url) {
                    return url.replace(/template/, "tpl");
                }
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/tpl-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should set the final url, after any root option has been applied", (cb) => {
            const stream = templateCache("templates.js", {
                root: "./views",
                transformUrl() {
                    return "/completely/transformed/final";
                }
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/completely/transformed/final','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.standalone", () => {

        it("should create standalone Angular module", (cb) => {
            const stream = templateCache("templates.js", {
                standalone: true
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.filename", () => {

        it("should default to templates.js if not specified", (cb) => {
            const stream = templateCache();

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should set filename", (cb) => {
            const stream = templateCache({
                standalone: true,
                root: "/views",
                filename: "foobar.js"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/foobar.js`));
                expect(file.relative).to.be.equal("foobar.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));
            stream.end();
            stream.resume();
        });
    });

    context("options.base", () => {

        it("should set base url", (cb) => {
            const stream = templateCache({
                standalone: true,
                root: "/views",
                base: path.resolve(__dirname, "..")
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/angular/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should allow functions", (cb) => {
            const stream = templateCache({
                standalone: true,
                root: "/templates",
                base(file) {
                    return `/all/${file.relative}`;
                }
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/templates/all/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.moduleSystem", () => {

        it("should support Browserify-style exports", (cb) => {
            const stream = templateCache("templates.js", {
                moduleSystem: "Browserify",
                standalone: true
            });

            stream.on("data", (file) => {
                expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("'use strict'; module.exports = angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should support RequireJS-style exports", (cb) => {
            const stream = templateCache("templates.js", {
                moduleSystem: "RequireJS"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("define(['angular'], function(angular) { 'use strict'; return angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);});");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });

        it("should support ES6-style exports", (cb) => {
            const stream = templateCache("templates.js", {
                moduleSystem: "ES6"
            });

            stream.on("data", (file) => {
                expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("import angular from 'angular'; export default angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.templateHeader & options.templateFooter", () => {

        it("should override TEMPLATE_HEADER & TEMPLATE_FOOTER", (cb) => {
            const stream = templateCache("templates.js", {
                templateHeader: "var template = \"",
                templateFooter: "\";"
            });

            stream.on("data", (file) => {
                expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("var template = \"$templateCache.put('/template-a.html','yoo');\";");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("yoo")
            }));

            stream.end();
            stream.resume();
        });
    });

    context("options.templateBody", () => {

        it("should override TEMPLATE_BODY", (cb) => {
            const stream = templateCache("templates.js", {
                templateBody: "$templateCache.put('<%= url %>','<%= contents %>');"
            });

            stream.on("data", (file) => {
                expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
                expect(file.relative).to.be.equal("templates.js");
                expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','yoo');}]);");
                cb();
            }).on("error", cb);

            stream.write(new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("yoo")
            }));

            stream.end();
            stream.resume();
        });
    });

    describe("integration", () => {
        let root;

        before(async () => {
            root = await adone.fs.Directory.createTmp();
        });

        after(async () => {
            await root.unlink();
        });

        afterEach(async () => {
            await root.clean();
        });

        it("should build valid $templateCache from multiple source-files", async () => {
            await root.addFile("template-a.html", { content: "<h1 id=\"template-a\">I'm template A!</h1>" });
            await root.addFile("template-b.html", { content: "<h1 id=\"template-b\">I'm template B!</h1>" });

            const files = await fast.src(root.getVirtualFile("**", "*").path())
                .angularTemplateCache("templates.js")
                .dest(root.path(), { produceFiles: true });
            expect(files).to.have.lengthOf(1);
            const file = root.getVirtualFile("templates.js");
            expect(await file.exists()).to.be.true;
            expect(await file.content()).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');\n$templateCache.put('/template-b.html','<h1 id=\"template-b\">I\\'m template B!</h1>');}]);");
        });

        it("should set filename", async () => {
            await root.addFile("template-a.html", { content: "<h1 id=\"template-a\">I'm template A!</h1>" });

            const files = await fast.src(root.getVirtualFile("**", "*").path())
                .angularTemplateCache({
                    standalone: true,
                    root: "/views",
                    filename: "foobar.js"
                })
                .dest(root.path(), { produceFiles: true });
            expect(files).to.have.lengthOf(1);
            const file = root.getVirtualFile("foobar.js");
            expect(await file.exists()).to.be.true;
            expect(await file.content()).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });
});
