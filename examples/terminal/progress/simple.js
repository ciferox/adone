const bar = adone.terminal.progress();

const iv = setInterval(() => {
    bar.tick();

    if (bar.completed) {
        clearInterval(iv);
    }
}, 100);
