const fp = adone.http.server.plugin;

module.exports = fp((fastify, opts, next) => {
    fastify.decorate("test", () => {});
    next();
});
