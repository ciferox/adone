const {
    http: { server }
} = adone;

const sget = require("simple-get").concat;

describe("trust proxy", () => {
    const sgetForwardedRequest = (app, forHeader, path) => {
        sget({
            method: "GET",
            headers: {
                "X-Forwarded-For": forHeader,
                "X-Forwarded-Host": "example.com"
            },
            url: `http://localhost:${app.server.address().port}${path}`
        }, () => { });
    };

    const testRequestValues = (req, options) => {
        if (options.ip) {
            if (options.modifyCoreObjects) {
                assert.ok(req.raw.ip, "ip is defined");
                assert.equal(req.raw.ip, options.ip, "gets ip from x-forwarded-for");
            }
            assert.ok(req.ip, "ip is defined");
            assert.equal(req.ip, options.ip, "gets ip from x-forwarded-for");
        }
        if (options.hostname) {
            if (options.modifyCoreObjects) {
                assert.ok(req.raw.hostname, "hostname is defined");
                assert.equal(req.raw.hostname, options.hostname, "gets hostname from x-forwarded-host");
            }
            assert.ok(req.hostname, "hostname is defined");
            assert.equal(req.hostname, options.hostname, "gets hostname from x-forwarded-host");
        }
        if (options.ips) {
            if (options.modifyCoreObjects) {
                assert.deepEqual(req.raw.ips, options.ips, "gets ips from x-forwarded-for");
            }
            assert.deepEqual(req.ips, options.ips, "gets ips from x-forwarded-for");
        }
    };

    it("trust proxy, add properties to node req", (done) => {
        const modifyCoreObjects = true;
        const app = server({
            trustProxy: true,
            modifyCoreObjects
        });

        expect(2).checks(() => {
            app.close();
            done();
        });

        app.get("/trustproxy", (req, reply) => {
            expect(true).to.be.ok.mark();
            testRequestValues(req, { ip: "1.1.1.1", hostname: "example.com", modifyCoreObjects });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });
        });

        app.get("/trustproxychain", (req, reply) => {
            expect(true).to.be.ok.mark();
            testRequestValues(req, { ip: "2.2.2.2", ips: ["127.0.0.1", "1.1.1.1", "2.2.2.2"], modifyCoreObjects });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });
        });

        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "1.1.1.1", "/trustproxy");
            sgetForwardedRequest(app, "2.2.2.2, 1.1.1.1", "/trustproxychain");
        });
    });

    it("trust proxy, not add properties to node req", (done) => {
        const app = server({
            trustProxy: true
        });

        expect(2).checks(done);

        app.get("/trustproxy", (req, reply) => {
            expect(true).to.be.ok.mark();
            testRequestValues(req, { ip: "1.1.1.1", hostname: "example.com" });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });
        });

        app.get("/trustproxychain", (req, reply) => {
            expect(true).to.be.ok.mark();
            testRequestValues(req, { ip: "2.2.2.2", ips: ["127.0.0.1", "1.1.1.1", "2.2.2.2"] });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });
        });
        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "1.1.1.1", "/trustproxy");
            sgetForwardedRequest(app, "2.2.2.2, 1.1.1.1", "/trustproxychain");
        });
    });

    it("trust proxy chain", (done) => {
        const app = server({
            trustProxy: ["127.0.0.1", "192.168.1.1"]
        });

        app.get("/trustproxychain", (req, reply) => {
            testRequestValues(req, { ip: "1.1.1.1" });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });

            app.close();
            done();
        });

        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "192.168.1.1, 1.1.1.1", "/trustproxychain");
        });
    });

    it("trust proxy function", (done) => {
        const app = server({
            trustProxy: (address) => address === "127.0.0.1"
        });
        app.get("/trustproxyfunc", (req, reply) => {
            testRequestValues(req, { ip: "1.1.1.1" });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });

            app.close();
            done();
        });

        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "1.1.1.1", "/trustproxyfunc");
        });
    });

    it("trust proxy number", (done) => {
        const app = server({
            trustProxy: 1
        });
        app.get("/trustproxynumber", (req, reply) => {
            testRequestValues(req, { ip: "1.1.1.1", ips: ["127.0.0.1", "1.1.1.1"] });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });

            app.close();
            done();
        });

        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "2.2.2.2, 1.1.1.1", "/trustproxynumber");
        });
    });

    it("trust proxy IP addresses", (done) => {
        const app = server({
            trustProxy: "127.0.0.1, 2.2.2.2"
        });
        app.get("/trustproxyipaddrs", (req, reply) => {
            testRequestValues(req, { ip: "1.1.1.1", ips: ["127.0.0.1", "1.1.1.1"] });
            reply.code(200).send({ ip: req.ip, hostname: req.hostname });

            app.close();
            done();
        });

        app.listen(0, (err) => {
            app.server.unref();
            assert.notExists(err);
            sgetForwardedRequest(app, "3.3.3.3, 2.2.2.2, 1.1.1.1", "/trustproxyipaddrs");
        });
    });
});
