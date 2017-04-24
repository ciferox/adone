const bar = adone.terminal.progress({
    schema: " :title [:bar] :percent"
});

function forward() {
    bar.tick(1, { title: "Forward " });
    if (bar.current > 60) {
        backward();
    } else {
        setTimeout(forward, 20);
    }
}

function backward() {
    bar.tick(-1, { title: "Backward" });
    if (bar.current === 0) {
        bar.terminate();
    } else {
        setTimeout(backward, 10);
    }
}

forward();
