adone.app.run({
    main() {
        // simulated download, passing the chunk lengths to tick()

        const bar = adone.runtime.term.progress({
            schema: " downloading [:bar] :percent :etas",
            completed: "=",
            blank: " ",
            width: 1024, /* something longer than the terminal width */
            total: 100
        });

        (function next() {
            bar.tick(1);

            if (!bar.completed) {
                setTimeout(next, 10);
            }
        })();
    }
});
