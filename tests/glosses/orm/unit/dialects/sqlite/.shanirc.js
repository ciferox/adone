export default (ctx) => {
    ctx.prefix("sqlite");

    if (ctx.runtime.getTestDialect() !== "sqlite") {
        ctx.disable();
    }
};
