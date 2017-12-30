export default (ctx) => {
    ctx.prefix("postgres");

    if (ctx.runtime.getTestDialect() !== "postgres") {
        ctx.disable();
    }
};
