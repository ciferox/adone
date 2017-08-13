const { std: { fs } } = adone;

adone.application.run({
    main() {
        const argv = {};

        process.argv = process.argv.map((arg, i) => {
            if (/^--\w+=/.test(arg)) {
                arg = arg.split("=");
                if (/^[0-9.]+$/.test(arg[1])) {
                    arg[1] = Number(arg[1]);
                }
                argv[arg[0].replace(/^--/, "")] = arg[1];
                return undefined;
            }
            if (arg.indexOf("--") === 0) {
                arg = arg.slice(2);
                argv[arg] = true;
                return undefined;
            }
            return arg;
        }).filter(Boolean);

        const screen = new adone.cui.Screen({
            smartCSR: true,
            dump: `${__dirname}/logs/png.log`,
            warnings: true
        });

        new adone.cui.widget.Element({
            parent: screen,
            left: 4,
            top: 3,
            width: 10,
            height: 6,
            border: "line",
            style: {
                bg: "green"
            },
            content: fs.readFileSync(`${__dirname}/data/lorem.txt`, "utf8")
        });

        new adone.cui.widget.Element({
            parent: screen,
            left: 20,
            top: 8,
            width: 40,
            height: 15,
            border: "line",
            style: {
                bg: "green"
            },
            content: fs.readFileSync(`${__dirname}/data/lorem.txt`, "utf8")
        });

        let file = process.argv[2];
        const testImage = `${__dirname}/data/test-image.png`;
        const spinfox = `${__dirname}/data/spinfox.png`;

        // XXX I'm not sure of the license of this file,
        // so I'm not going to redistribute it in the repo.
        const url = "https://people.mozilla.org/~dolske/apng/spinfox.png";

        if (!file) {
            try {
                if (!fs.existsSync(spinfox)) {
                    const buf = new adone.cui.widget.ANSIImage.curl(url);
                    fs.writeFileSync(spinfox, buf);
                }
                file = spinfox;
            } catch (e) {
                file = testImage;
            }
        }

        if (!argv.width && !argv.height && !argv.scale) {
            argv.width = 20;
        }

        const png = new adone.cui.widget.ANSIImage({
            parent: screen,
            // border: 'line',
            width: argv.width,
            height: argv.height,
            top: 2,
            left: 0,
            file,
            draggable: true,
            scale: argv.scale,
            ascii: argv.ascii,
            optimization: argv.optimization,
            speed: argv.speed
        });

        const timeout = setInterval(() => {
            if (png.right <= 0) {
                clearInterval(timeout);
                return;
            }
            png.left++;
            screen.render();
        }, 100);

        if (timeout.unref) {
            timeout.unref();
        }

        screen.key("q", () => {
            clearInterval(timeout);
            screen.destroy();
        });

        screen.key(["h", "left"], () => {
            png.left -= 2;
            screen.render();
        });

        screen.key(["k", "up"], () => {
            png.top -= 2;
            screen.render();
        });

        screen.key(["l", "right"], () => {
            png.left += 2;
            screen.render();
        });

        screen.key(["j", "down"], () => {
            png.top += 2;
            screen.render();
        });

        screen.on("keypress", () => {
            clearInterval(timeout);
        });

        png.on("mousedown", () => {
            clearInterval(timeout);
        });

        screen.render();
    }
});
