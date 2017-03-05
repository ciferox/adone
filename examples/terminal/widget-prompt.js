// import adone from "adone";

const screen = new adone.terminal.Screen({
    smartCSR: true,
    dump: `${__dirname}/logs/prompt.log`,
    autoPadding: true,
    warnings: true
});

const prompt = new adone.terminal.widget.Prompt({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: " {blue-fg}Prompt{/blue-fg} ",
    tags: true,
    keys: true,
    vi: true
});

const question = new adone.terminal.widget.Question({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: " {blue-fg}Question{/blue-fg} ",
    tags: true,
    keys: true,
    vi: true
});

const msg = new adone.terminal.widget.Message({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: " {blue-fg}Message{/blue-fg} ",
    tags: true,
    keys: true,
    hidden: true,
    vi: true
});

const loader = new adone.terminal.widget.Loading({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: " {blue-fg}Loader{/blue-fg} ",
    tags: true,
    keys: true,
    hidden: true,
    vi: true
});

prompt.readInput("Question?", "", (err, value) => {
    question.ask("Question?", (err, value) => {
        msg.display("Hello world!", 3, (err) => {
            msg.display("Hello world again!", -1, (err) => {
                loader.load("Loading...");
                setTimeout(() => {
                    loader.stop();
                    screen.destroy();
                }, 3000);
            });
        });
    });
});

screen.key("q", () => {
    screen.destroy();
});

screen.render();
