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

// var mouseMode = 1;

// term.on("key", function (name, matches, data) {
//     console.log("'key' event:", name, matches, Buffer.isBuffer(data.code) ? data.code : data.code.toString(16), data.codepoint ? data.codepoint.toString(16) : "");

//     if (matches.indexOf("CTRL_C") >= 0) {
//         term.print("{green-fg}CTRL-C received...{/}\n");
//         terminate();
//     }

//     if (matches.indexOf("CTRL_R") >= 0) {
//         term.print("{green-fg}CTRL-R received... asking terminal some information...{/}\n");
//         term.requestCursorLocation().requestScreenSize();
//     }

//     if (matches.indexOf("CTRL_D") >= 0) {
//         term.print("{green-fg}CTRL-D received: {/}");
//         mouseMode = (mouseMode + 1) % 4;

//         switch (mouseMode) {
//             case 0:
//                 term.print("{green-fg}turn mouse off{/}\n");
//                 term.grabInput({ mouse: false, focus: true });
//                 break;
//             case 1:
//                 term.print("{green-fg}mouse in button mode{/}\n");
//                 term.grabInput({ mouse: "button", focus: true });
//                 break;
//             case 2:
//                 term.print("{green-fg}mouse in drag mode{/}\n");
//                 term.grabInput({ mouse: "drag", focus: true });
//                 break;
//             case 3:
//                 term.print("{green-fg}mouse in motion mode{/}\n");
//                 term.grabInput({ mouse: "motion", focus: true });
//                 break;
//         }
//     }
// });

// term.on("terminal", function (name, data) {
//     console.log("'terminal' event:", name, data);
// });

// term.on("mouse", function (name, data) {
//     console.log("'mouse' event:", name, data);
// });

// term.on("resize", (width, height) => {
//     console.log(`resize: ${width}x${height}`);
// });

// term.on("unknown", function (buffer) {
//     console.log("'unknown' event, buffer:", buffer);
// });