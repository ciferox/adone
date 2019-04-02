export default (ctx) => {
    const {
        assertion
    } = adone;
    assertion.use(assertion.extension.checkmark);
    
    ctx.prefix("http", "server");
};
