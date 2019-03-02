export default async (ctx) => {
    ctx.prefix("netron");

    const {
        assertion
    } = adone;

    assertion.use(assertion.extension.dirty);
};
