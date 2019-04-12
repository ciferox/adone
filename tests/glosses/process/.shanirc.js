export default async (ctx) => {
    const {
        assertion
    } = adone;

    assertion.use(assertion.extension.dirty);
};
