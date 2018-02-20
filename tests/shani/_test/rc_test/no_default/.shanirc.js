export const fn = async (ctx) => {
    await adone.promise.delay(100);

    ctx.beforeEach(() => {
        throw new Error();
    });
};
