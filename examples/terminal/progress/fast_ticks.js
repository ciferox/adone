adone.application.run({
    async main() {
        const N = 5000;

        const bar = adone.runtime.term.progress({
            total: N,
            schema: ":bar :spinner :current/:total (:elapsed)",
            spinner: {
                active: "bouncingBar"
            },
            timeFormatter: (d) => adone.datetime.utc(d).format("HH:mm:ss")
        });

        bar.tick(0);

        for (let i = 0; i < N; ++i) {
            bar.tick(1);
            adone.info(`${i + 1}) hello ${bar.current} ${bar.total}`);
            await adone.promise.delay(20);
        }

        return 0;
    }
});
