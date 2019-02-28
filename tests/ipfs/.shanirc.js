const {
    assertion
} = adone;
export default async (ctx) => {
    ctx.prefix("ipfs");

    assertion.use(assertion.extension.dirty);
};
