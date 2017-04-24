// import adone from "adone";

const screen = new adone.cui.Screen({
    dump: `${__dirname}/logs/padding.log`,
    warnings: true
});

new adone.cui.widget.Element({
    parent: screen,
    border: "line",
    style: {
        bg: "red"
    },
    content: "hello world\nhi",
    align: "center",
    left: "center",
    top: "center",
    width: 22,
    height: 10,
    padding: 2
});

screen.key("q", () => {
    return screen.destroy();
});

screen.render();
