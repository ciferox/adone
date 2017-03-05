const screen = new adone.terminal.Screen({
    dump: `${__dirname}/logs/textarea.log`,
    fullUnicode: true,
    warnings: true
});

const box = new adone.terminal.widget.TextArea({
    parent: screen,
    // Possibly support:
    // align: 'center',
    style: {
        bg: "blue"
    },
    height: "half",
    width: "half",
    top: "center",
    left: "center",
    tags: true
});

screen.render();

screen.key("q", () => {
    screen.destroy();
});

screen.key("i", () => {
    box.readInput(() => { });
});

screen.key("e", () => {
    box.readEditor(() => { });
});
