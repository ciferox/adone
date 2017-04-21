const ProgressBar = adone.cui.Progress;

const contentLength = 128 * 1024;

const bar = new ProgressBar({
    schema: " Downloading [:bar] :percent :eta",
    width: 80,
    total: contentLength
});

(function next() {

    if (contentLength) {

        const chunk = Math.round(Math.random() * 10 * 1024);

        bar.tick(chunk);

        if (!bar.completed) {
            setTimeout(next, Math.random() * 1000);
        }
    }

})();
