const ProgressBar = adone.terminal.Progress;

const bar = new ProgressBar({
    schema: " Progress [:bar] :percent :eta"
});

let i = 0, steps = [0.1, 0.25, 0.6, 0.8, 0.4, 0.5, 0.6, 0.2, 0.8, 1.0];

(function next() {
    if (i >= steps.length) {
    } else {
        bar.update(steps[i++]);
        setTimeout(next, 500);
    }
})();
