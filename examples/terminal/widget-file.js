// import adone from "adone";

const screen = new adone.terminal.Screen({
    smartCSR: true,
    dump: `${__dirname}/logs/file.log`,
    warnings: true
});

const fm = new adone.terminal.widget.FileManager({
    parent: screen,
    border: "line",
    style: {
        selected: {
            bg: "blue"
        }
    },
    height: "half",
    width: "half",
    top: "center",
    left: "center",
    label: " {blue-fg}%path{/blue-fg} ",
    cwd: process.env.HOME,
    keys: true,
    vi: true,
    scrollbar: {
        bg: "white",
        ch: " "
    }
});

const box = new adone.terminal.widget.Element({
    parent: screen,
    style: {
        bg: "green"
    },
    border: "line",
    height: "half",
    width: "half",
    top: "center",
    left: "center",
    hidden: true
});

fm.refresh();

screen.render();

screen.key("q", () => {
    screen.destroy();
});

screen.key(["s", "p"], () => {
    fm.hide();
    screen.render();
    setTimeout(() => {
        fm.pick((err, file) => {
            box.show();
            box.setContent(err ? String(err) : file);
            screen.render();
            setTimeout(() => {
                box.hide();
                fm.reset(() => {
                    fm.show();
                    screen.render();
                });
            }, 2000);
        });
    }, 2000);
});
