const screen = new adone.cui.Screen({
    dump: `${__dirname}/logs/textarea.log`,
    fullUnicode: true,
    warnings: true
});

const box = new adone.cui.widget.TextArea({
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
    box.readInput(adone.noop);
});

screen.key("e", () => {
    box.readEditor(adone.noop);
});
