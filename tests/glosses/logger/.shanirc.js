export default (ctx) => {
    ctx.prefix("logger");

    const {
        assertion
    } = adone;
    assertion.use(assertion.extension.checkmark);
};
