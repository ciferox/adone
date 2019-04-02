export default (ctx) => {
    ctx.prefix("http", "client");

    const {
        assertion
    } = adone;

    assertion.use(assertion.extension.dirty);
};
