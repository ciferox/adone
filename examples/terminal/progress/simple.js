const ProgressBar = adone.cui.Progress;

const bar = new ProgressBar();


var iv = setInterval(() => {

    bar.tick();

    if (bar.completed) {
        clearInterval(iv);
    }

}, 100);
