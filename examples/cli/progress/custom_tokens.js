adone.app.run({
    async main() {
        const bar = adone.cli.progress({
            schema: ":spinner hello :custom (:elapsed)"
        });
        for (let i = 0; i < 100; ++i) {
            bar.update(i / 100, {
                custom: `world ${i}`
            });
            await adone.promise.delay(300);
        }
    }
});
