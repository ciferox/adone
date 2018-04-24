adone.app.run({
    main() {
        const bar = adone.runtime.term.progress();

        const iv = setInterval(() => {
            bar.tick();

            if (bar.completed) {
                clearInterval(iv);
            }
        }, 100);
    }
});
