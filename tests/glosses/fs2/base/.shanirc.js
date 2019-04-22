export default (ctx) => {
    ctx.prefix("fs2", "base");

    const {
        assertion
    } = adone;
    assertion.use(assertion.extension.checkmark);
};
