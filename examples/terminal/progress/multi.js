const ProgressBar = adone.cui.Progress;

const bar0 = new ProgressBar({
    current: 0
});

const bar1 = new ProgressBar({
    current: 10
});

const bar2 = new ProgressBar({
    current: 20
});

const bar3 = new ProgressBar({
    current: 30
});

const bar4 = new ProgressBar({
    current: 40
});

const bar5 = new ProgressBar({
    current: 50
});

var timer = setInterval(() => {

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
