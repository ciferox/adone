export default (ctx) => {
    ctx.prefix("mssql");

    if (ctx.runtime.getTestDialect() !== "mssql") {
        ctx.disable();
    }
};
