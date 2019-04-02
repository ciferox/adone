const {
    http: { server }
} = adone;

describe("throw", () => {
    it("Fastify should throw on wrong options", (done) => {
        try {
            server("lol");
            assert.fail();
        } catch (e) {
            assert.equal(e.message, "Options must be an object");
            done();
        }
    });

    it("Fastify should throw on multiple assignment to the same route", (done) => {
        const fastify = server();
        fastify.get("/", () => { });
        fastify.get("/", () => { });

        fastify.ready((err) => {
            assert.equal(err.message, "Method 'GET' already declared for route '/'");
            done();
        });
    });

    it("Should throw on unsupported method", (done) => {
        const fastify = server();
        try {
            fastify.route({
                method: "TROLL",
                url: "/",
                schema: {},
                handler(req, reply) { }
            });
            assert.fail();
        } catch (e) {
            done();
        }
    });

    it("Should throw on missing handler", (done) => {
        const fastify = server();
        try {
            fastify.route({
                method: "GET",
                url: "/"
            });
            assert.fail();
        } catch (e) {
            done();
        }
    });

    it("Should throw if one method is unsupported", (done) => {
        const fastify = server();
        try {
            fastify.route({
                method: ["GET", "TROLL"],
                url: "/",
                schema: {},
                handler(req, reply) { }
            });
            assert.fail();
        } catch (e) {
            done();
        }
    });

    it("Should throw on duplicate content type parser", (done) => {
        const fastify = server();
        function customParser(req, done) {
            done(null, "");
        }

        fastify.addContentTypeParser("application/qq", customParser);
        try {
            fastify.addContentTypeParser("application/qq", customParser);
            assert.fail();
        } catch (e) {
            done();
        }
    });

    it("Should throw on duplicate decorator", (done) => {
        const fastify = server();
        const fooObj = {};

        fastify.decorate("foo", fooObj);
        try {
            fastify.decorate("foo", fooObj);
            assert.fail();
        } catch (e) {
            done();
        }
    });

    it("Should not throw on duplicate decorator encapsulation", (done) => {
        const fastify = server();
        const foo2Obj = {};

        fastify.decorate("foo2", foo2Obj);

        fastify.register((fastify, opts, next) => {
            fastify.decorate("foo2", foo2Obj);
            done();
            next();
        });

        fastify.ready();
    });

    it("Should throw on duplicate request decorator", (done) => {
        const fooObj = {};
        const fastify = server();

        fastify.decorateRequest("foo", fooObj);
        try {
            fastify.decorateRequest("foo", fooObj);
            assert.fail();
        } catch (e) {
            assert.equal(e.code, "FST_ERR_DEC_ALREADY_PRESENT");
            assert.equal(e.message, "FST_ERR_DEC_ALREADY_PRESENT: The decorator 'foo' has already been added!");
            done();
        }
    });

    it("Should throw if request decorator dependencies are not met", (done) => {
        const fastify = server();
        const fooObj = {};

        try {
            fastify.decorateRequest("bar", fooObj, ["world"]);
            assert.fail();
        } catch (e) {
            assert.equal(e.code, "FST_ERR_DEC_MISSING_DEPENDENCY");
            assert.equal(e.message, "FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency 'world'.");
            done();
        }
    });

    it("Should throw on duplicate reply decorator", (done) => {
        const fastify = server();
        const fooObj = {};

        fastify.decorateReply("foo", fooObj);
        try {
            fastify.decorateReply("foo", fooObj);
            assert.fail();
        } catch (e) {
            assert.ok(/has already been added/.test(e.message));
            done();
        }
    });

    it("Should throw if reply decorator dependencies are not met", (done) => {
        const fastify = server();
        const fooObj = {};

        try {
            fastify.decorateReply("bar", fooObj, ["world"]);
            assert.fail();
        } catch (e) {
            assert.ok(/missing dependency/.test(e.message));
            done();
        }
    });

    it("Should throw if handler as the third parameter to the shortcut method is missing and the second parameter is not a function and also not an object", (done) => {
        const fastify = server();

        expect(5).checks(done);

        try {
            fastify.get("/foo/1", "");
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/2", 1);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/3", []);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/4", undefined);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/5", null);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }
    });

    it("Should throw if handler as the third parameter to the shortcut method is missing and the second parameter is not a function and also not an object", (done) => {
        expect(5).checks(done);

        const fastify = server();

        try {
            fastify.get("/foo/1", "");
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/2", 1);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/3", []);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/4", undefined);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/5", null);
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }
    });

    it("Should throw if there is handler function as the third parameter to the shortcut method and options as the second parameter is not an object", (done) => {
        expect(5).checks(done);

        const fastify = server();

        try {
            fastify.get("/foo/1", "", (req, res) => { });
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/2", 1, (req, res) => { });
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/3", [], (req, res) => { });
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/4", undefined, (req, res) => { });
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }

        try {
            fastify.get("/foo/5", null, (req, res) => { });
            assert.fail();
        } catch (e) {
            expect(true).to.be.ok.mark();
        }
    });

    it("Should throw if found duplicate handler as the third parameter to the shortcut method and in options", (done) => {
        const fastify = server();

        try {
            fastify.get("/foo/abc", {
                handler: (req, res) => { }
            }, (req, res) => { });
            assert.fail();
        } catch (e) {
            done();
        }
    });
});
