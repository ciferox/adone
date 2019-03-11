adone.app.run({
    main() {
        const bar0 = adone.runtime.term.progress({
            current: 0
        });

        const bar1 = adone.runtime.term.progress({
            current: 10
        });

        const bar2 = adone.runtime.term.progress({
            current: 20
        });

        const bar3 = adone.runtime.term.progress({
            current: 30
        });

        const bar4 = adone.runtime.term.progress({
            current: 40
        });

        const bar5 = adone.runtime.term.progress({
            current: 50
        });

        const timer = setInterval(() => {
            bar0.tick();
            bar1.tick();
            bar2.tick();
            bar3.tick();
            bar4.tick();
            bar5.tick();
            if (bar0.completed
                && bar1.completed
                && bar2.completed
                && bar3.completed
                && bar4.completed
                && bar5.completed) {
                clearInterval(timer);
            }
        }, 100);
    }
});
