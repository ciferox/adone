export default (ctx) => {
    ctx.prefix("mysql");

    if (ctx.runtime.getTestDialect() !== "mysql") {
        ctx.disable();
    }
};
