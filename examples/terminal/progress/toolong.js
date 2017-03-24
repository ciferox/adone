const ProgressBar = adone.terminal.Progress;

// simulated download, passing the chunk lengths to tick()

const bar = new ProgressBar({
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
