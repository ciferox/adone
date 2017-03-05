const fs = adone.std.fs;

const screen = new adone.terminal.Screen({
    dump: `${__dirname}/logs/record.log`,
    smartCSR: true,
    warnings: true
});

const btext = new adone.terminal.widget.Element({
    parent: screen,
    left: "center",
    top: "center",
    width: "80%",
    height: "80%",
    style: {
        bg: "green"
    },
    border: "line",
    content: "CSR should still work."
});

const text = new adone.terminal.widget.ScrollableText({
    parent: screen,
    content: fs.readFileSync(`${__dirname}/data/git.diff`, "utf8"),
    border: "line",
    left: "center",
    top: "center",
    draggable: true,
    width: "50%",
    height: "50%",
    mouse: true,
    keys: true,
    vi: true
});

text.focus();

const frames = [];

const timer = setInterval(() => {
    frames.push(screen.screenshot());
}, 100);

screen.key("C-q", () => {
    fs.writeFileSync(`${__dirname}/data/frames.json`, JSON.stringify(frames));
    clearInterval(timer);
    return screen.destroy();
});

screen.render();
