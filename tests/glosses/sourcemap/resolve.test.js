const { sourcemap } = adone;

const map = {
    simple: {
        mappings: "AAAA",
        sources: ["foo.js"],
        names: []
    },
    sourceRoot: {
        mappings: "AAAA",
        sourceRoot: "/static/js/app/",
        sources: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        names: []
    },
    sourceRootNoSlash: {
        mappings: "AAAA",
        sourceRoot: "/static/js/app",
        sources: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        names: []
    },
    sourceRootEmpty: {
        mappings: "AAAA",
        sourceRoot: "",
        sources: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        names: []
    },
    sourcesContent: {
        mappings: "AAAA",
        sourceRoot: "/static/js/app/",
        sources: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        sourcesContent: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        names: []
    },
    mixed: {
        mappings: "AAAA",
        sources: ["foo.js", "lib/bar.js", "../vendor/dom.js", "/version.js", "//foo.org/baz.js"],
        sourcesContent: ["foo.js", null, null, "/version.js", "//foo.org/baz.js"],
        names: []
    }
};
map.simpleString = JSON.stringify(map.simple);
map.XSSIsafe = `)]}'${map.simpleString}`;

const u = (url) => `code\n/*# sourceMappingURL=${url} */`;

const code = {
    fileRelative: u("foo.js.map"),
    domainRelative: u("/foo.js.map"),
    schemeRelative: u("//foo.org/foo.js.map"),
    absolute: u("https://foo.org/foo.js.map"),
    dataUri: u("data:application/json," +
        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
    base64: u("data:application/json;base64," +
        "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W119"),
    dataUriText: u("data:text/json," +
        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
    dataUriParameter: u("data:application/json;charset=UTF-8;foo=bar," +
        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
    dataUriNoMime: u("data:,foo"),
    dataUriInvalidMime: u("data:text/html,foo"),
    dataUriInvalidJSON: u("data:application/json,foo"),
    dataUriXSSIsafe: u("data:application/json," + ")%5D%7D%27" +
        "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
        "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D"),
    dataUriEmpty: u("data:"),
    noMap: ""
};

const read = (x) => {
    return function () {
        return x;
    };
};

const identity = adone.identity;

const asyncify = (fn) => function (...args) {
    setImmediate(() => {
        const cb = args.pop();
        try {
            cb(null, fn(...args));
        } catch (err) {
            cb(err);
        }
    });
};

const Throws = (x) => {
    throw new Error(x);
};

const testResolveSourceMap = (method, sync) => {
    return async () => {
        const wrap = (sync ? identity : asyncify);

        const codeUrl = "http://example.com/a/b/c/foo.js";

        expect(method).to.be.a("function");

        if (!sync) {
            method = adone.promise.promisify(method);
        }

        {
            const result = await method(code.fileRelative, codeUrl, wrap(read(map.simpleString)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "foo.js.map",
                url: "http://example.com/a/b/c/foo.js.map",
                sourcesRelativeTo: "http://example.com/a/b/c/foo.js.map",
                map: map.simple
            });
        }
        {
            const result = await method(code.fileRelative, codeUrl, wrap(read(map.simpleString)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "foo.js.map",
                url: "http://example.com/a/b/c/foo.js.map",
                sourcesRelativeTo: "http://example.com/a/b/c/foo.js.map",
                map: map.simple
            });
        }
        {
            const result = await method(code.domainRelative, codeUrl, wrap(read(map.simpleString)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "/foo.js.map",
                url: "http://example.com/foo.js.map",
                sourcesRelativeTo: "http://example.com/foo.js.map",
                map: map.simple
            });
        }
        {
            const result = await method(code.schemeRelative, codeUrl, wrap(read(map.simpleString)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "//foo.org/foo.js.map",
                url: "http://foo.org/foo.js.map",
                sourcesRelativeTo: "http://foo.org/foo.js.map",
                map: map.simple
            });
        }
        {
            const result = await method(code.absolute, codeUrl, wrap(read(map.simpleString)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple
            });
        }
        {
            const result = await method(code.dataUri, codeUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple
            });
        }
        {
            const result = await method(code.base64, codeUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json;base64," +
                "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W119",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple
            });
        }
        {
            const result = await method(code.dataUriText, codeUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:text/json," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple
            });
        }
        {
            const result = await method(code.dataUriParameter, codeUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json;charset=UTF-8;foo=bar," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriNoMime, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
            expect(err.message).to.match(/mime type.+text\/plain/);
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriInvalidMime, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:text/html,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
            expect(err.message).to.match(/mime type.+text\/html/);
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriInvalidJSON, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:application/json,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
        }
        {
            const result = await method(code.dataUriXSSIsafe, codeUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json," + ")%5D%7D%27" +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriEmpty, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: ""
            });
            expect(err.message).to.match(/mime type.+text\/plain/);
        }
        {
            const result = await method(code.noMap, codeUrl, wrap(Throws));
            expect(result).to.be.null;
        }
        {
            const result = await method(code.absolute, codeUrl, wrap(read([map.simpleString])));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.absolute, codeUrl, wrap(read("invalid JSON")));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: "invalid JSON"
            });
        }
        {
            const result = await method(code.absolute, codeUrl, wrap(read(map.XSSIsafe)));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.absolute, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: null
            });
        }
    };
};

const testResolveSources = (method, sync) => {
    return async () => {
        const wrap = (sync ? identity : asyncify);

        const mapUrl = "http://example.com/a/b/c/foo.js.map";

        expect(method).to.be.a("function");

        if (!sync) {
            method = adone.promise.promisify(method);
        }

        let options;
        {
            const result = await method(map.simple, mapUrl, wrap(identity));
            expect(result).to.be.deep.equal({
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const result = await method(map.sourceRoot, mapUrl, wrap(identity));
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/static/js/app/foo.js",
                    "http://example.com/static/js/app/lib/bar.js",
                    "http://example.com/static/js/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "http://example.com/static/js/app/foo.js",
                    "http://example.com/static/js/app/lib/bar.js",
                    "http://example.com/static/js/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ]
            });
        }

        options = { sourceRoot: false };

        {
            const result = await method(map.sourceRoot, mapUrl, wrap(identity), options);
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/a/b/c/foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "http://example.com/a/b/c/foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ]
            });
        }

        options = { sourceRoot: "/static/js/" };

        {
            const result = await method(map.sourceRoot, mapUrl, wrap(identity), options);
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/static/js/foo.js",
                    "http://example.com/static/js/lib/bar.js",
                    "http://example.com/static/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "http://example.com/static/js/foo.js",
                    "http://example.com/static/js/lib/bar.js",
                    "http://example.com/static/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ]
            });
        }
        {
            const result = await method(map.sourceRootNoSlash, mapUrl, wrap(identity));
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/static/js/app/foo.js",
                    "http://example.com/static/js/app/lib/bar.js",
                    "http://example.com/static/js/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "http://example.com/static/js/app/foo.js",
                    "http://example.com/static/js/app/lib/bar.js",
                    "http://example.com/static/js/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ]
            });
        }
        {
            const result = await method(map.sourceRootEmpty, mapUrl, wrap(identity));
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/a/b/c/foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "http://example.com/a/b/c/foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ]
            });
        }
        {
            const result = await method(map.sourcesContent, mapUrl, wrap(Throws));
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/static/js/app/foo.js",
                    "http://example.com/static/js/app/lib/bar.js",
                    "http://example.com/static/js/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "foo.js",
                    "lib/bar.js",
                    "../vendor/dom.js",
                    "/version.js",
                    "//foo.org/baz.js"
                ]
            });
        }
        {
            const result = await method(map.mixed, mapUrl, wrap(identity));
            expect(result).to.be.deep.equal({
                sourcesResolved: [
                    "http://example.com/a/b/c/foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "http://example.com/version.js",
                    "http://foo.org/baz.js"
                ],
                sourcesContent: [
                    "foo.js",
                    "http://example.com/a/b/c/lib/bar.js",
                    "http://example.com/a/b/vendor/dom.js",
                    "/version.js",
                    "//foo.org/baz.js"
                ]
            });
        }
        {
            const result = await method(map.simple, mapUrl, wrap(read(["non", "string"])));
            expect(result).to.be.deep.equal({
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["non,string"]
            });
        }
        {
            const result = await method(map.mixed, mapUrl, wrap(Throws));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ]);
            const sourcesContent = result.sourcesContent;
            for (let index = 0, len = sourcesContent.length; index < len; index++) {
                const item = sourcesContent[index];
                if (item instanceof Error) {
                    sourcesContent[index] = null;
                }
            }
            expect(sourcesContent).to.be.deep.equal([
                "foo.js",
                null,
                null,
                "/version.js",
                "//foo.org/baz.js"
            ]);
        }
    };
};


const testResolve = (method, sync) => {
    return async () => {
        const wrap = (sync ? identity : asyncify);
        const wrapMap = function (mapFn, fn) {
            return wrap((url) => {
                if (/\.map$/.test(url)) {
                    return mapFn(url);
                }
                return fn(url);
            });
        };

        const codeUrl = "http://example.com/a/b/c/foo.js";

        expect(method).to.be.a("function");

        if (!sync) {
            method = adone.promise.promisify(method);
        }

        const readSimple = wrapMap(read(map.simpleString), identity);

        {
            const result = await method(code.fileRelative, codeUrl, readSimple);
            expect(result).to.be.deep.equal({
                sourceMappingURL: "foo.js.map",
                url: "http://example.com/a/b/c/foo.js.map",
                sourcesRelativeTo: "http://example.com/a/b/c/foo.js.map",
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const result = await method(code.domainRelative, codeUrl, readSimple);
            expect(result).to.be.deep.equal({
                sourceMappingURL: "/foo.js.map",
                url: "http://example.com/foo.js.map",
                sourcesRelativeTo: "http://example.com/foo.js.map",
                map: map.simple,
                sourcesResolved: ["http://example.com/foo.js"],
                sourcesContent: ["http://example.com/foo.js"]
            });
        }
        {
            const result = await method(code.schemeRelative, codeUrl, readSimple);
            expect(result).to.be.deep.equal({
                sourceMappingURL: "//foo.org/foo.js.map",
                url: "http://foo.org/foo.js.map",
                sourcesRelativeTo: "http://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["http://foo.org/foo.js"],
                sourcesContent: ["http://foo.org/foo.js"]
            });
        }
        {
            const result = await method(code.absolute, codeUrl, readSimple);
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: ["https://foo.org/foo.js"]
            });
        }
        {
            const result = await method(code.dataUri, codeUrl, wrapMap(Throws, identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const result = await method(code.base64, codeUrl, wrapMap(Throws, identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json;base64," +
                "eyJtYXBwaW5ncyI6IkFBQUEiLCJzb3VyY2VzIjpbImZvby5qcyJdLCJuYW1lcyI6W119",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const result = await method(code.dataUriText, codeUrl, wrapMap(Throws, identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:text/json," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const result = await method(code.dataUriParameter, codeUrl, wrapMap(Throws, identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json;charset=UTF-8;foo=bar," +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriNoMime, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
            expect(err.message).to.match(/mime type.+text\/plain/);
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriInvalidMime, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:text/html,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
            expect(err.message).to.match(/mime type.+text\/html/);
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriInvalidJSON, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:application/json,foo",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: "foo"
            });
        }
        {
            const result = await method(code.dataUriXSSIsafe, codeUrl, wrapMap(Throws, identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "data:application/json," + ")%5D%7D%27" +
                "%7B%22mappings%22%3A%22AAAA%22%2C%22sources%22%3A%5B%22" +
                "foo.js%22%5D%2C%22names%22%3A%5B%5D%7D",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: map.simple,
                sourcesResolved: ["http://example.com/a/b/c/foo.js"],
                sourcesContent: ["http://example.com/a/b/c/foo.js"]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.dataUriEmpty, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "data:",
                url: null,
                sourcesRelativeTo: codeUrl,
                map: ""
            });
            expect(err.message).to.match(/mime type.+text\/plain/);
        }
        {
            const result = await method(code.noMap, codeUrl, wrap(Throws));
            expect(result).to.be.null;
        }
        {
            const result = await method(code.absolute, codeUrl, wrap(read([map.simpleString])));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: [map.simpleString]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.absolute, codeUrl, wrap(read("invalid JSON")));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: "invalid JSON"
            });
        }
        {
            const result = await method(code.absolute, codeUrl, wrapMap(read(map.XSSIsafe), identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: ["https://foo.org/foo.js"]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(code.absolute, codeUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: "https://foo.org/foo.js.map",
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: null
            });
            expect(err.message).to.be.equal("https://foo.org/foo.js.map");
        }

        const readMap = (what) => wrapMap(read(JSON.stringify(what)), identity);

        let options;

        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.simple));
            expect(result.sourcesResolved).to.be.deep.equal(["http://example.com/a/b/c/foo.js"]);
            expect(result.sourcesContent).to.be.deep.equal(["http://example.com/a/b/c/foo.js"]);
        }
        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourceRoot));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/static/js/app/foo.js",
                "http://example.com/static/js/app/lib/bar.js",
                "http://example.com/static/js/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ]);
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/static/js/app/foo.js",
                "http://example.com/static/js/app/lib/bar.js",
                "http://example.com/static/js/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ]);
        }

        options = { sourceRoot: false };

        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourceRoot), options);
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ]);
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ]);
        }

        options = { sourceRoot: "/static/js/" };

        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourceRoot), options);
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/static/js/foo.js",
                "http://example.com/static/js/lib/bar.js",
                "http://example.com/static/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "custom sourceRoot");
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/static/js/foo.js",
                "http://example.com/static/js/lib/bar.js",
                "http://example.com/static/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "custom sourceRoot");
        }

        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourceRootNoSlash));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/static/js/app/foo.js",
                "http://example.com/static/js/app/lib/bar.js",
                "http://example.com/static/js/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "sourceRootNoSlash");
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/static/js/app/foo.js",
                "http://example.com/static/js/app/lib/bar.js",
                "http://example.com/static/js/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "sourceRootNoSlash");
        }
        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourceRootEmpty));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "sourceRootEmpty");
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "sourceRootEmpty");
        }
        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.sourcesContent));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/static/js/app/foo.js",
                "http://example.com/static/js/app/lib/bar.js",
                "http://example.com/static/js/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "sourcesContent");
            expect(result.sourcesContent).to.be.deep.equal([
                "foo.js",
                "lib/bar.js",
                "../vendor/dom.js",
                "/version.js",
                "//foo.org/baz.js"
            ], "sourcesContent");
        }
        {
            const result = await method(code.fileRelative, codeUrl, readMap(map.mixed));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "mixed");
            expect(result.sourcesContent).to.be.deep.equal([
                "foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "/version.js",
                "//foo.org/baz.js"
            ], "mixed");
        }
        {
            const result = await method(code.fileRelative, codeUrl, wrap(read([map.simpleString])));
            expect(result.sourcesResolved).to.be.deep.equal(["http://example.com/a/b/c/foo.js"], "read non-string");
            expect(result.sourcesContent).to.be.deep.equal([map.simpleString], "read non-string");
        }

        const ThrowsMap = (what) => wrapMap(read(JSON.stringify(what)), Throws);

        {
            const result = await method(code.fileRelative, codeUrl, ThrowsMap(map.mixed));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "read throws .sourcesResolved");
            const sourcesContent = result.sourcesContent;
            for (let index = 0, len = sourcesContent.length; index < len; index++) {
                const item = sourcesContent[index];
                if (item instanceof Error) {
                    sourcesContent[index] = null;
                }
            }
            expect(sourcesContent).to.be.deep.equal([
                "foo.js",
                null,
                null,
                "/version.js",
                "//foo.org/baz.js"
            ], "read throws .sourcesContent");
        }

        let mapUrl = "https://foo.org/foo.js.map";

        {
            const result = await method(null, mapUrl, readSimple);
            expect(result).to.be.deep.equal({
                sourceMappingURL: null,
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: ["https://foo.org/foo.js"]
            });
        }
        {
            const result = await method(null, mapUrl, wrap(read([map.simpleString])));
            expect(result).to.be.deep.equal({
                sourceMappingURL: null,
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: [map.simpleString]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(null, mapUrl, wrap(read("invalid JSON")));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: null,
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: "invalid JSON"
            }, "mapUrl read invalid JSON .sourceMapData");
        }
        {
            const result = await method(null, mapUrl, wrapMap(read(map.XSSIsafe), identity));
            expect(result).to.be.deep.equal({
                sourceMappingURL: null,
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: map.simple,
                sourcesResolved: ["https://foo.org/foo.js"],
                sourcesContent: ["https://foo.org/foo.js"]
            });
        }
        {
            const err = await assert.throws(async () => {
                await method(null, mapUrl, wrap(Throws));
            });
            expect(err.sourceMapData).to.be.deep.equal({
                sourceMappingURL: null,
                url: "https://foo.org/foo.js.map",
                sourcesRelativeTo: "https://foo.org/foo.js.map",
                map: null
            });
            expect(err.message).to.be.equal("https://foo.org/foo.js.map");
        }

        mapUrl = "http://example.com/a/b/c/foo.js.map";
        options = { sourceRoot: "/static/js/" };

        {
            const result = await method(null, mapUrl, readMap(map.sourceRoot), options);
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/static/js/foo.js",
                "http://example.com/static/js/lib/bar.js",
                "http://example.com/static/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "mapUrl custom sourceRoot");
            expect(result.sourcesContent).to.be.deep.equal([
                "http://example.com/static/js/foo.js",
                "http://example.com/static/js/lib/bar.js",
                "http://example.com/static/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "mapUrl custom sourceRoot");
        }
        {
            const result = await method(null, mapUrl, readMap(map.mixed));
            expect(result.sourcesResolved).to.be.deep.equal([
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ], "mapUrl mixed");
            expect(result.sourcesContent).to.be.deep.equal([
                "foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "/version.js",
                "//foo.org/baz.js"
            ], "mapUrl mixed");
        }
    };
};

describe("sourcemap", "resolve", () => {
    specify(".resolveSourceMap", testResolveSourceMap(sourcemap.resolveSourceMap, false));

    specify(".resolveSourceMapSync", testResolveSourceMap(sourcemap.resolveSourceMapSync, true));

    specify(".resolveSources", testResolveSources(sourcemap.resolveSources, false));

    specify(".resolveSourcesSync", testResolveSources(sourcemap.resolveSourcesSync, true));

    specify(".resolveSourceMapSync no read", () => {
        const mapUrl = "http://example.com/a/b/c/foo.js.map";
        const result = sourcemap.resolveSourcesSync(map.mixed, mapUrl, null);

        expect(result).to.be.deep.equal({
            sourcesResolved: [
                "http://example.com/a/b/c/foo.js",
                "http://example.com/a/b/c/lib/bar.js",
                "http://example.com/a/b/vendor/dom.js",
                "http://example.com/version.js",
                "http://foo.org/baz.js"
            ],
            sourcesContent: []
        });
    });


    specify(".resolve", testResolve(sourcemap.resolve, false));

    specify(".resolveSync", testResolve(sourcemap.resolveSync, true));


    specify(".parseMapToJSON", () => {
        expect(sourcemap.parseMapToJSON(map.XSSIsafe)).to.be.deep.equal(map.simple);
    });
});
