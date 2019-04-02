const fp = adone.web.server.plugin;

module.exports = fp((fastify, opts, next) => {
    fastify.decorate("test", () => {});
    next();
});
