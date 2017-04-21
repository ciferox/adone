const ProgressBar = adone.cui.Progress;

const bar = new ProgressBar({
    schema: " :bar :title",
    total: 10
});

var iv = setInterval(() => {
    const randomTitle = ["some", "random", "title"][Math.random() * 3 | 0];
    bar.tick({ title: randomTitle });
    if (bar.completed) {
        clearInterval(iv);
        bar2();
    }
}, 100);

function bar2() {
    const bar = new ProgressBar({
        schema: " processing: [:bar]",
        completed: "*",
        blank: " ",
        total: 15
    });

    var iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar3();
        }
    }, 100);
}

function bar3() {
    const bar = new ProgressBar({
        schema: " download |:bar| :percent",
        completed: "=",
        blank: " ",
        width: 40,
        total: 20
    });

    var iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar4();
        }
    }, 100);
}

function bar4() {
    const bar = new ProgressBar({
        schema: " :current of :total :percent",
        total: 20
    });

    var iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar5();
        }
    }, 100);
}

function bar5() {
    const bar = new ProgressBar({
        schema: " [:bar] :elapsed elapsed, eta :eta",
        width: 8,
        total: 50
    });

    var iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
        }
    }, 300);
}
