const ProgressBar = adone.terminal.Progress;

const bar = new ProgressBar();


var iv = setInterval(() => {

    bar.tick();

    if (bar.completed) {
        clearInterval(iv);
    }

}, 100);
