const ProgressBar = adone.terminal.Progress;

const bar1 = new ProgressBar({
    schema: "progress: \n[:bar]",
    current: 10
});

//var bar2 = new ProgressBar();
//bar1.tick()

var iv = setInterval(() => {

    bar1.tick(1);
    //bar2.tick();
    console.log(new Date());

    if (bar1.current === 110 || bar1.completed) {
        clearInterval(iv);

        setInterval(() => {
            console.log(new Date());
        }, 100);
    }

}, 100);

