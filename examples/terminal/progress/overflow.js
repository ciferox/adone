adone.application.run({
    async main() {
        const bars = adone.util.range(100).map(() => adone.terminal.progress({
            schema: "hello"
        }));
        for (const bar of bars) {
            bar.update(0);
            await adone.promise.delay(20);
        }
        for (const [idx, bar] of adone.util.enumerate(bars)) {
            if (idx > bars.length - adone.terminal.rows + 10) {
                break;
            }
            bar.setSchema(`${idx} hello`);
            bar.update(0.5);
            await adone.promise.delay(20);
        }
    }
});