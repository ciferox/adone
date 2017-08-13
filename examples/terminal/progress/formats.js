let bar = null;
let bar2 = null;
let bar3 = null;
let bar4 = null;
let bar5 = null;

bar2 = () => {
    const bar = adone.terminal.progress({
        schema: " processing: [:bar]",
        completed: "*",
        blank: " ",
        total: 15
    });

    const iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar3();
        }
    }, 100);
};

bar3 = () => {
    const bar = adone.terminal.progress({
        schema: " download |:bar| :percent",
        completed: "=",
        blank: " ",
        width: 40,
        total: 20
    });

    const iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar4();
        }
    }, 100);
};

bar4 = () => {
    const bar = adone.terminal.progress({
        schema: " :current of :total :percent",
        total: 20
    });

    const iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
            bar5();
        }
    }, 100);
};

bar5 = () => {
    const bar = adone.terminal.progress({
        schema: " [:bar] :elapsed elapsed, eta :eta",
        width: 8,
        total: 50
    });

    const iv = setInterval(() => {
        bar.tick();
        if (bar.completed) {
            clearInterval(iv);
        }
    }, 300);
};

adone.application.run({
    main() {
        bar = adone.terminal.progress({
            schema: " :bar :title",
            total: 10
        });
        const iv = setInterval(() => {
            const randomTitle = ["some", "random", "title"][Math.random() * 3 | 0];
            bar.tick({ title: randomTitle });
            if (bar.completed) {
                clearInterval(iv);
                bar2();
            }
        }, 100);
    }
});
