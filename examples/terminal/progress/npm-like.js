const ProgressBar = adone.cui.Progress;

const bar = new ProgressBar({
    schema: "╢:bar╟ :current/:total :percent :elapsed :eta",
    blank: "░",
    filled: "█"
});


var iv = setInterval(() => {

    bar.tick();

    if (bar.completed) {
        clearInterval(iv);
    }

}, 100);
