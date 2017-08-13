adone.application.run({
    main() {
        const screen = new adone.cui.Screen({
            dump: `${__dirname}/logs/widget.log`,
            title: "widget test",
            resizeTimeout: 300,
            dockBorders: true,
            cursor: {
                artificial: true,
                shape: "line",
                blink: true,
                color: null
            },
            debug: true,
            warnings: true
        });

        screen.debugLog.parseTags = true;
        let logs = "";
        require("./tail")(`${__dirname}/logs/widget.log`).on("line", (line) => {
            // if (!screen.debugLog.hidden) return;
            logs += `${line}\n`;
        });
        screen.debugLog.on("show", () => {
            if (logs) {
                screen.debug(logs);
                logs = "";
            }
            screen.render();
        });

        screen.on("event", (event, el) => {
            const type = (el && el.type) || Object.prototype.toString.call(el).slice(8, -1);
            screen.terminal.log("emit(\"%s\", {%s})", event, type);
        });

        screen.append(new adone.cui.widget.Text({
            top: 0,
            left: 2,
            width: "100%",
            //bg: 'blue',
            content: "{green-fg}Welcome{/green-fg} to my {red-fg,ul}program{/red-fg,ul}",
            style: {
                bg: "#0000ff"
            },
            // bg: adone.tui.colors.match('#0000ff'),
            tags: true,
            align: "center"
        }));

        screen.append(new adone.cui.widget.Line({
            orientation: "horizontal",
            top: 1,
            left: 0,
            right: 0
        }));

        const list = new adone.cui.widget.List({
            align: "center",
            mouse: true,
            label: " My list ",
            border: "line",
            style: {
                fg: "blue",
                bg: "default",
                border: {
                    fg: "default",
                    bg: "default"
                },
                selected: {
                    bg: "green"
                }
            },
            width: "50%",
            height: "50%",
            top: "center",
            left: "center",
            tags: true,
            invertSelected: false,
            items: [
                "one",
                "{red-fg}two{/red-fg}",
                "three",
                "four",
                "five",
                "six",
                "seven",
                "eight",
                "nine",
                "ten"
            ],
            scrollbar: {
                ch: " ",
                track: {
                    bg: "yellow"
                },
                style: {
                    inverse: true
                }
            }
        });

        screen.append(list);
        list.select(0);

        list.items.forEach((item) => {
            item.setHover(item.getText().trim());
        });

        const item = list.items[1];
        list.removeItem(list.items[1]);
        list.insertItem(1, item.getContent());

        list.on("keypress", (ch, key) => {
            if (key.name === "up" || key.name === "k") {
                list.up();
                screen.render();
            } else if (key.name === "down" || key.name === "j") {
                list.down();
                screen.render();
            }
        });

        list.on("select", (item, select) => {
            list.setLabel(` ${item.getText()} `);
            screen.render();
        });

        const progress = new adone.cui.widget.ProgressBar({
            border: "line",
            style: {
                fg: "blue",
                bg: "default",
                bar: {
                    bg: "default",
                    fg: "blue"
                },
                border: {
                    fg: "default",
                    bg: "default"
                }
            },
            ch: ":",
            //orientation: 'vertical',
            //height: 10,
            //width: 3,
            width: "50%",
            height: 3,
            right: 0,
            bottom: 0,
            filled: 50
        });

        screen.append(progress);

        const lorem = require("fs").readFileSync(`${__dirname}/data/git.diff`, "utf8");

        //lorem = lorem.replace(/\x1b[^m]*m/g, '');

        const stext = new adone.cui.widget.ScrollableText({
            //padding: 1,
            mouse: true,
            content: lorem,
            border: "line",
            style: {
                fg: "blue",
                bg: "black",
                border: {
                    fg: "default",
                    bg: "default"
                }
            },
            width: "50%",
            //height: 4,
            height: 6,
            left: 0,
            bottom: 0,
            scrollbar: {
                inverse: true
            }
        });

        setTimeout(() => {
            stext.width = 0;
            screen.render();
            setTimeout(() => {
                stext.width = "50%";
                screen.render();
                setTimeout(() => {
                    stext.height = 0;
                    screen.render();
                    setTimeout(() => {
                        stext.height = 6;
                        screen.render();
                        setTimeout(() => {
                            stext.width = 0;
                            stext.height = 0;
                            screen.render();
                            setTimeout(() => {
                                stext.width = "50%";
                                stext.height = 6;
                                screen.render();
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);

        screen.append(stext);
        stext.on("keypress", (ch, key) => {
            if (key.name === "up" || key.name === "k") {
                stext.scroll(-1);
                screen.render();
            } else if (key.name === "down" || key.name === "j") {
                stext.scroll(1);
                screen.render();
            }
        });

        screen.on("element focus", (cur, old) => {
            if (old.border) {
                old.style.border.fg = "default";
            }
            if (cur.border) {
                cur.style.border.fg = "green";
            }
            screen.render();
        });

        const input = new adone.cui.widget.TextBox({
            label: " My Input ",
            content: "",
            border: "line",
            style: {
                fg: "blue",
                bg: "default",
                bar: {
                    bg: "default",
                    fg: "blue"
                },
                border: {
                    fg: "default",
                    bg: "default"
                }
            },
            width: "30%",
            height: 3,
            right: 0,
            top: 2,
            keys: true,
            vi: true,
            mouse: true
            //inputOnFocus: true
        });

        input.on("submit", (value) => {
            if (value) {
                screen.children[0].setContent(value);
            }
            input.clearInput();
            screen.render();
        });

        screen.append(input);

        const button = new adone.cui.widget.Button({
            //content: 'Click me!',
            content: "Click\nme!",
            shrink: true,
            mouse: true,
            border: "line",
            style: {
                fg: "red",
                bg: "blue"
            },
            //height: 3,
            right: 4,
            //bottom: 6,
            bottom: 2,
            padding: 0
        });

        button.on("press", () => {
            button.setContent("Clicked!");
            screen.render();
        });

        screen.append(button);

        screen.key("S-s", () => {
            const rand = function (min, max) {
                return Math.floor(Math.random() * (max - min)) + min;
            };
            const xi = rand(0, screen.cols - (stext.width - stext.iwidth));
            const xl = xi + stext.width - stext.iwidth;
            const yi = rand(0, screen.rows - (stext.height - stext.iheight));
            const yl = yi + stext.height - stext.iheight;
            stext.wrap = false;
            stext.setContent(screen.screenshot(xi, xl, yi, xl));
            screen.render();
        });

        screen.on("keypress", (ch, key) => {
            if (key.name === "tab") {
                return key.shift
                    ? screen.focusPrevious()
                    : screen.focusNext();
            }
            if (key.name === "escape" || key.name === "q") {
                return process.exit(0);
            }
        });

        screen.key("C-z", () => {
            screen.sigtstp();
        });

        list.focus();

        screen.render();

        setInterval(() => {
            progress.toggle();
            screen.render();
        }, 2000);

        const fill = () => {
            if (progress.filled === 100) {
                progress.reset();
            }
            progress.progress(2);
            progress.atop -= 2;
            screen.render();
            setTimeout(fill, 300);
        };
        fill();
    }
});
