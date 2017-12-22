describe("fast", "transform", "angular", "templateCache", () => {
    const { std: { path }, fast } = adone;
    const { File, Stream } = fast;

    it("should build valid $templateCache from multiple source-files", async () => {
        const [file] = await new Stream([
            new File({
                base: __dirname,
                path: path.join(__dirname, "template-a.html"),
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            }),
            new File({
                base: __dirname,
                path: path.join(__dirname, "template-b.html"),
                contents: Buffer.from("<h1 id=\"template-b\">I'm template B!</h1>")
            })
        ]).angularTemplateCache("templates.js");

        expect(path.normalize(file.path)).to.be.equal(path.normalize(path.join(__dirname, "/templates.js")));
        expect(file.relative).to.be.equal("templates.js");
        expect(file.contents.toString()).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');\n$templateCache.put('/template-b.html','<h1 id=\"template-b\">I\\'m template B!</h1>');}]);");
    });

    it("should allow options as first parameter if no filename is specified", async () => {
        const [file] = await new Stream([
            new File({
                base: __dirname,
                path: `${__dirname}/template-a.html`,
                contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
            })
        ]).angularTemplateCache({
            standalone: true,
            root: "/views"
        });

        expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
        expect(file.relative).to.be.equal("templates.js");
        expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
    });

    context("options.root", () => {
        it("should set root", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                root: "/views"
            });
            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should preserve the \"./\" if there is one in front of the root", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                root: "./"
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('./template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should preserve the \".\" if there is one in front of the root", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                root: "."
            });
            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('./template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should preserve the root as is, if the root folder name start with a \".\" character", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                root: ".root/"
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('.root/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.transformUrl", () => {
        it("should change the URL to the output of the function", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                transformUrl(url) {
                    return url.replace(/template/, "tpl");
                }
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/tpl-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should set the final url, after any root option has been applied", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                root: "./views",
                transformUrl() {
                    return "/completely/transformed/final";
                }
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/completely/transformed/final','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.standalone", () => {
        it("should create standalone Angular module", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                standalone: true
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.filename", () => {
        it("should default to templates.js if not specified", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache();

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
        });

        it("should set filename", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache({
                standalone: true,
                root: "/views",
                filename: "foobar.js"
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/foobar.js`));
            expect(file.relative).to.be.equal("foobar.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.base", () => {
        it("should set base url", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache({
                standalone: true,
                root: "/views",
                base: path.resolve(__dirname, "..")
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/angular/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should allow functions", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache({
                standalone: true,
                root: "/templates",
                base(file) {
                    return `/all/${file.relative}`;
                }
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/templates/all/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.moduleSystem", () => {
        it("should support Browserify-style exports", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                moduleSystem: "Browserify",
                standalone: true
            });

            expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("'use strict'; module.exports = angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });

        it("should support RequireJS-style exports", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                moduleSystem: "RequireJS"
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("define(['angular'], function(angular) { 'use strict'; return angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);});");
        });

        it("should support ES6-style exports", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("<h1 id=\"template-a\">I'm template A!</h1>")
                })
            ]).angularTemplateCache("templates.js", {
                moduleSystem: "ES6"
            });

            expect(path.normalize(file.path)).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("import angular from 'angular'; export default angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });

    context("options.templateHeader & options.templateFooter", () => {
        it("should override TEMPLATE_HEADER & TEMPLATE_FOOTER", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("yoo")
                })
            ]).angularTemplateCache("templates.js", {
                templateHeader: "var template = \"",
                templateFooter: "\";"
            });

            expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("var template = \"$templateCache.put('/template-a.html','yoo');\";");
        });
    });

    context("options.templateBody", () => {
        it("should override TEMPLATE_BODY", async () => {
            const [file] = await new Stream([
                new File({
                    base: __dirname,
                    path: `${__dirname}/template-a.html`,
                    contents: Buffer.from("yoo")
                })
            ]).angularTemplateCache("templates.js", {
                templateBody: "$templateCache.put('<%= url %>','<%= contents %>');"
            });

            expect(file.path).to.be.equal(path.normalize(`${__dirname}/templates.js`));
            expect(file.relative).to.be.equal("templates.js");
            expect(file.contents.toString("utf8")).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','yoo');}]);");
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
            await root.addFile("template-a.html", { contents: "<h1 id=\"template-a\">I'm template A!</h1>" });
            await root.addFile("template-b.html", { contents: "<h1 id=\"template-b\">I'm template B!</h1>" });

            const files = await fast.src(root.getFile("**", "*").path())
                .angularTemplateCache("templates.js")
                .dest(root.path(), { produceFiles: true });
            expect(files).to.have.lengthOf(1);
            const file = root.getFile("templates.js");
            expect(await file.exists()).to.be.true();
            expect(await file.contents()).to.be.equal("angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');\n$templateCache.put('/template-b.html','<h1 id=\"template-b\">I\\'m template B!</h1>');}]);");
        });

        it("should set filename", async () => {
            await root.addFile("template-a.html", { contents: "<h1 id=\"template-a\">I'm template A!</h1>" });

            const files = await fast.src(root.getFile("**", "*").path())
                .angularTemplateCache({
                    standalone: true,
                    root: "/views",
                    filename: "foobar.js"
                })
                .dest(root.path(), { produceFiles: true });
            expect(files).to.have.lengthOf(1);
            const file = root.getFile("foobar.js");
            expect(await file.exists()).to.be.true();
            expect(await file.contents()).to.be.equal("angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('/views/template-a.html','<h1 id=\"template-a\">I\\'m template A!</h1>');}]);");
        });
    });
});
