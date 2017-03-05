const screen = new adone.terminal.Screen({
    dump: `${__dirname}/logs/valign.log`,
    smartCSR: true,
    autoPadding: false,
    warnings: true
});

const box = new adone.terminal.widget.Element({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: 5,
    align: "center",
    valign: "middle",
  // valign: 'bottom',
    content: "Foobar.",
    border: "line"
});

screen.key("q", () => {
    return screen.destroy();
});

screen.render();
