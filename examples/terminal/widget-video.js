import adone from "adone";

const screen = new adone.terminal.Screen({
    smartCSR: true,
    dump: `${__dirname}/logs/video.log`,
    warnings: true
});

const video = new adone.terminal.widget.Video({
    parent: screen,
    left: 1,
    top: 1,
    width: "90%",
    height: "90%",
    border: "line",
    file: process.argv[2]
});

video.focus();

screen.render();

screen.key(["q", "C-q", "C-c"], () => {
    screen.destroy();
});
