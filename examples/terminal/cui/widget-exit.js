adone.run({
    main() {
        const screen = new adone.cui.Screen({
            dump: `${__dirname}/logs/exit.log`,
            smartCSR: true,
            autoPadding: true,
            warnings: true,
            ignoreLocked: ["C-q"]
        });

        const box = new adone.cui.widget.Prompt({
            parent: screen,
            left: "center",
            top: "center",
            width: "70%",
            height: "shrink",
            border: "line"
        });

        screen.render();

        box.readInput("Input: ", "", (err, data) => {
            screen.destroy();
            if (process.argv[2] === "resume") {
                process.stdin.resume();
            } else if (process.argv[2] === "end") {
                process.stdin.setRawMode(false);
                process.stdin.end();
            }
            if (err) {
                throw err;
            }
            adone.log(`Input: ${data}`);
        });

        screen.key("C-q", (ch, key) => {
            return screen.destroy();
        });
    }
});
