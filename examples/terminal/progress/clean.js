const bar = adone.terminal.progress({
    clean: true,
    schema: " [:bar] \n:current/:total \n:percent \n:elapsed :eta",
    callback() {
        console.log(123);
    }
});

const iv = setInterval(() => {
    bar.tick();
    console.log(new Date());

    if (bar.completed) {
        clearInterval(iv);
        console.log("completed");
    }

}, 10);
