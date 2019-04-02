const {
    web: { server }
} = adone;

const split = require("split2");

describe("skip reply send", () => {
    it("skip automatic reply.send() with reply.sent = true and a body", (done) => {
        const stream = split(JSON.parse);
        const app = server({
            logger: {
                stream
            }
        });

        expect(3).checks(done);
    
        stream.on("data", (line) => {
            assert.notEqual(line.level, 40); // there are no errors
            assert.notEqual(line.level, 50); // there are no errors
            expect(true).to.be.ok.mark();
        });
    
        app.get("/", (req, reply) => {
            reply.sent = true;
            reply.res.end("hello world");
    
            return Promise.resolve("this will be skipped");
        });
    
        return app.inject({
            method: "GET",
            url: "/"
        }).then((res) => {
            assert.equal(res.statusCode, 200);
            assert.equal(res.body, "hello world");
            expect(true).to.be.ok.mark();
        });
    });
    
    it("skip automatic reply.send() with reply.sent = true and no body", (done) => {
        const stream = split(JSON.parse);
        const app = server({
            logger: {
                stream
            }
        });

        expect(3).checks(done);
    
        stream.on("data", (line) => {
            assert.notEqual(line.level, 40); // there are no error
            assert.notEqual(line.level, 50); // there are no error
            expect(true).to.be.ok.mark();
        });
    
        app.get("/", (req, reply) => {
            reply.sent = true;
            reply.res.end("hello world");
    
            return Promise.resolve();
        });
    
        return app.inject({
            method: "GET",
            url: "/"
        }).then((res) => {
            assert.equal(res.statusCode, 200);
            assert.equal(res.body, "hello world");
            expect(true).to.be.ok.mark();
        });
    });
    
    it("skip automatic reply.send() with reply.sent = true and an error", (done) => {
        const stream = split(JSON.parse);
        const app = server({
            logger: {
                stream
            }
        });

        expect(2).checks(done);
    
        let errorSeen = false;
    
        stream.on("data", (line) => {
            if (line.level === 50) {
                errorSeen = true;
                assert.equal(line.err.message, "kaboom");
                assert.equal(line.msg, "Promise errored, but reply.sent = true was set");
                expect(true).to.be.ok.mark();
            }
        });
    
        app.get("/", (req, reply) => {
            reply.sent = true;
            reply.res.end("hello world");
    
            return Promise.reject(new Error("kaboom"));
        });
    
        return app.inject({
            method: "GET",
            url: "/"
        }).then((res) => {
            assert.equal(errorSeen, true);
            assert.equal(res.statusCode, 200);
            assert.equal(res.body, "hello world");
            expect(true).to.be.ok.mark();
        });
    });    
});
