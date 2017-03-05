const util = adone.std.util;

adone.terminal.setupLogger(`${__dirname}/logs/mouse.log`, true);
const program = adone.terminal;
adone.terminal.listen();

program.alternateScreenBuffer(true);
program.enableMouse();
program.hideCursor();
program.setMouse({ sendFocus: true }, true);

program.on("mouse", (data) => {
    program.cursorPos(data.y, data.x);
    program.print(" ", "blue bg");
    program.cursorPos(0, 0);
    program.print(util.inspect(data));
});

program.on("resize", (data) => {
    setTimeout(() => {
        program.clear();
        program.cursorPos(0, 0);
        program.print(util.inspect({ cols: program.cols, rows: program.rows }));
    }, 200);
});

process.on("SIGWINCH", (data) => {
    setTimeout(() => {
        program.cursorPos(1, 0);
        program.print(util.inspect({ winch: true, cols: program.cols, rows: program.rows }));
    }, 200);
});

program.on("focus", (data) => {
    program.clear();
    program.cursorPos(0, 0);
    program.print("FOCUSIN");
});

program.on("blur", (data) => {
    program.clear();
    program.cursorPos(0, 0);
    program.print("FOCUSOUT");
});

program.key(["q", "escape", "C-c"], () => {
    program.showCursor();
    program.disableMouse();
    program.alternateScreenBuffer(false);
    process.exit(0);
});

program.on("keypress", (ch, data) => {
    if (data.name === "mouse") {
        return;
    }
    program.clear();
    program.cursorPos(0, 0);
    program.print(util.inspect(data));
});
