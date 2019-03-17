export default (ctx) => {
    ctx.prefix("ipfs");

    const {
        assertion
    } = adone;
    assertion.use(assertion.extension.dirty);
};
