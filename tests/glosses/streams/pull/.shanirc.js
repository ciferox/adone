export default (ctx) => {
    const {
        assertion
    } = adone;

    ctx.prefix("stream", "pull");

    assertion
        .use(assertion.extension.dirty)
        .use(assertion.extension.checkmark);
};
