adone.application.run({
    async main() {
        const progressFormat = "%s:spinner {gray-fg}%s{/} (:elapsed)";

        for (let i = 0; i < 300; i++) {
            const tabs = " ".repeat(adone.math.random(4, 20));
            const message = adone.text.random(adone.math.random(20, 80));
            const schema = adone.sprintf(progressFormat, tabs, message);
            const bar = adone.runtime.term.progress({
                schema
            });

            let delayHalf;
            const tm = adone.math.random(300, 1000);
            try {
                if (adone.math.random(0, 2) === 1) {
                    delayHalf = adone.promise.delay(tm / 2);
                }
                if (adone.is.promise(delayHalf)) {
                    await delayHalf;
                    throw new adone.error.Runtime(adone.text.random(adone.math.random(20, 80)));
                }
            } catch (err) {
                adone.logInfo(err);
                adone.logError(err);
            }
            await adone.promise.delay(tm);
            bar.complete(adone.math.random(0, 2) === 1);
        }
    }
});
