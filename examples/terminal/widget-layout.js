// import adone from "adone";

const screen = new adone.terminal.Screen({
    dump: `${__dirname}/logs/layout.log`,
    smartCSR: true,
    autoPadding: true,
    warnings: true
});

const layout = new adone.terminal.widget.Layout({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "50%",
    border: "line",
    layout: process.argv[2] === "grid" ? "grid" : "inline",
    style: {
        bg: "red",
        border: {
            fg: "blue"
        }
    }
});

const box1 = new adone.terminal.widget.Element({
    parent: layout,
    top: "center",
    left: "center",
    width: 20,
    height: 10,
    border: "line",
    content: "1"
});

const box2 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "2"
});

const box3 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "3"
});

const box4 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "4"
});

const box5 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "5"
});

const box6 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "6"
});

const box7 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "7"
});

const box8 = new adone.terminal.widget.Element({
    parent: layout,
    top: "center",
    left: "center",
    width: 20,
    height: 10,
    border: "line",
    content: "8"
});

const box9 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "9"
});

const box10 = new adone.terminal.widget.Element({
    parent: layout,
    top: "center",
    left: "center",
    width: 20,
    height: 10,
    border: "line",
    content: "10"
});

const box11 = new adone.terminal.widget.Element({
    parent: layout,
    top: 0,
    left: 0,
    width: 10,
    height: 5,
    border: "line",
    content: "11"
});

const box12 = new adone.terminal.widget.Element({
    parent: layout,
    top: "center",
    left: "center",
    width: 20,
    height: 10,
    border: "line",
    content: "12"
});

if (process.argv[2] !== "grid") {
    for (let i = 0; i < 10; i++) {
        new adone.terminal.widget.Element({
            parent: layout,
            // width: i % 2 === 0 ? 10 : 20,
            // height: i % 2 === 0 ? 5 : 10,
            width: Math.random() > 0.5 ? 10 : 20,
            height: Math.random() > 0.5 ? 5 : 10,
            border: "line",
            content: String(i + 1 + 12)
        });
    }
}

screen.key("q", () => {
    return screen.destroy();
});

screen.render();
