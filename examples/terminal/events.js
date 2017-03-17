const term = adone.terminal;

function terminate() {
    term.print("{brightblack-fg}About to exit...{/}\n");
    //term.grabInput(false);
    term.applicationKeypad(false).bell();
    term.fullscreen(false);
    term.destroy();
    // Add a 100ms delay, so the terminal will be ready when the process effectively exit, preventing bad escape sequences drop
    setTimeout(() => {
        process.exit();
    }, 100);
}

term.fullscreen();
term.print("{bold}{cyan-fg}Key test, hit anything on the keyboard to see how it is detected...{/}\n");
term.print("{green-fg}Hit CTRL-C to quit, CTRL-D to change the mouse reporting mode{/}\n\n");

term.applicationKeypad(true);
//term.keyboardModifier() ;

//term.grabInput({ mouse: "button", focus: true });
term.listen();

term.on("keypress", (ch, key) => {
    console.log("Full:", key.full, "Name:", key.name, "Ctrl:", key.ctrl, "Shift:", key.shift, "Atl:", key.alt);

    if (key.full === "C-c") {
        term.print("{green-fg}CTRL-C received...{/}\n");
        terminate();        
    }
});

term.on("response", (out) => {
    console.log(adone.std.util.inspect(out));
});
