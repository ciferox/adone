export default (ctx) => {
    const {
        assertion
    } = adone;

    assertion
        .use(assertion.extension.dirty)
        .use(assertion.extension.checkmark);
};
