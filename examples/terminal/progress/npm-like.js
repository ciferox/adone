adone.application.run({
    main() {
        const bar = adone.terminal.progress({
            schema: "╢:bar╟ :current/:total :percent :elapsed :eta",
            blank: "░",
            filled: "█"
        });

        const iv = setInterval(() => {
            bar.tick();

            if (bar.completed) {
                clearInterval(iv);
            }
        }, 100);
    }
});
