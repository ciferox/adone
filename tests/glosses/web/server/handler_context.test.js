const {
    web: { server },
    std: { http }
} = adone;


describe("handler context", () => {
    it("handlers receive correct `this` context", (done) => {
        expect(2).checks(done);

        // simulate plugin that uses fastify-plugin
        const plugin = function (instance, opts, next) {
            instance.decorate("foo", "foo");
            next();
        };
        plugin[Symbol.for("skip-override")] = true;

        const instance = server();
        instance.register(plugin);

        instance.get("/", function (req, reply) {
            assert.ok(this.foo);
            assert.equal(this.foo, "foo");
            reply.send();
            expect(true).to.be.ok.mark();
        });

        instance.listen(0, (err) => {
            instance.server.unref();
            
            assert.ok(instance.foo);
            assert.equal(instance.foo, "foo");

            const address = `http://127.0.0.1:${instance.server.address().port}/`;
            http.get(address, () => { }).on("error", (err) => {
                assert.notExists(err);
            });
            expect(true).to.be.ok.mark();
        });
    });

    it("handlers have access to the internal context", (done) => {
        const instance = server();

        expect(2).checks(done);
        instance.get("/", { config: { foo: "bar" } }, (req, reply) => {
            assert.ok(reply.context);
            assert.ok(reply.context.config);
            assert.instanceOf(reply.context.config, Object);
            assert.ok(reply.context.config.foo);
            assert.equal(reply.context.config.foo, "bar");
            reply.send();
            expect(true).to.be.ok.mark();
        });

        instance.listen(0, (err) => {
            instance.server.unref();
            assert.notExists(err);

            const address = `http://127.0.0.1:${instance.server.address().port}/`;
            http.get(address, () => { }).on("error", (err) => {
                assert.notExists(err);
            });
            expect(true).to.be.ok.mark();
        });
    });
});
