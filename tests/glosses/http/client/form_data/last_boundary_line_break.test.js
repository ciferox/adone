describe("last boundary line break", function () {
    const {
        FormData,
        createServer,
        submit
    } = this;

    it("should be correct", async () => {
        const app = createServer();

        app.use(async (ctx) => {
            const body = await ctx.request.text();
            assert.strictEqual(body.substr(-1 * FormData.LINE_BREAK.length), FormData.LINE_BREAK);
            ctx.body = "OK";
        });

        await app.bind();

        const form = new FormData();

        form.append("field", "value");

        expect(await submit(app, form)).to.include({
            data: "OK"
        });
    });
});
