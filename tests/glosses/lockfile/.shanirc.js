export default (ctx) => {
    ctx.prefix("lockfile");

    const { 
        assertion
    } = adone;
    assertion.use(assertion.extension.checkmark);
};
