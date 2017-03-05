// import adone from "adone";

const screen = new adone.terminal.Screen({
    smartCSR: true,
    dump: `${__dirname}/logs/obscure-sides.log`,
    autoPadding: true,
    warnings: true
});

const box = new adone.terminal.widget.Element({
    parent: screen,
    scrollable: true,
    alwaysScroll: true,
    border: {
        type: "bg",
        ch: " "
    },
    style: {
        bg: "blue",
        border: {
            inverse: true
        },
        scrollbar: {
            bg: "white"
        }
    },
    height: 10,
    width: 30,
    top: "center",
    left: "center",
    cwd: process.env.HOME,
    keys: true,
    vi: true,
    scrollbar: {
        ch: " "
    }
});

const child = new adone.terminal.widget.Element({
    parent: box,
    content: "hello",
    style: {
        bg: "green"
    },
    // border: 'line',
    height: 5,
    width: 20,
    top: 2,
    left: 15
});

const child2 = new adone.terminal.widget.Element({
    parent: box,
    content: "hello",
    style: {
        bg: "green"
    },
    border: "line",
    height: 5,
    width: 20,
    top: 25,
    left: -5
});

box.focus();

screen.render();

screen.key("q", () => {
    screen.destroy();
});
