adone.app.run({
    main() {
        const bar0 = adone.runtime.term.progress({
            schema: " Bar-0: [:bar]",
            current: 0
        });

        const bar1 = adone.runtime.term.progress({
            schema: " Bar-1: [:bar]",
            current: 10
        });

        const bar2 = adone.runtime.term.progress({
            schema: " Bar-2: [:bar]",
            current: 20,
            tough: true
        });

        const bar3 = adone.runtime.term.progress({
            schema: " Bar-3: [:bar]",
            current: 30

        });

        const bar4 = adone.runtime.term.progress({
            schema: " Bar-4: [:bar]",
            current: 40
        });

        const bar5 = adone.runtime.term.progress({
            schema: " Bar-5: [:bar]",
            current: 50,
            tough: true
        });

        const timer = setInterval(() => {
            bar0.tick();
            bar1.tick();
            bar2.tick();
            bar3.tick();
            bar4.tick();
            bar5.tick();
            console.log(new Date());
            if (bar0.completed
                && bar1.completed
                && bar2.completed
                && bar3.completed
                && bar4.completed
                && bar5.completed) {
                clearInterval(timer);

                setInterval(() => {
                    console.log(new Date());
                }, 100);

            }
        }, 100);
    }
});
