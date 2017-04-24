// import adone from "adone";

const screen = new adone.cui.Screen({
    dump: `${__dirname}/logs/form.log`,
    warnings: true
});

const form = new adone.cui.widget.Form({
    parent: screen,
    mouse: true,
    keys: true,
    vi: true,
    left: 0,
    top: 0,
    width: "100%",
    //height: 12,
    style: {
        bg: "green",
        // border: {
        //   inverse: true
        // },
        scrollbar: {
            inverse: true
        }
    },
    content: "foobar",
    scrollable: true,
    // border: {
    //   type: 'ch',
    //   ch: ' '
    // },
    scrollbar: {
        ch: " "
    }
    //alwaysScroll: true
});

form.on("submit", (data) => {
    output.setContent(JSON.stringify(data, null, 2));
    screen.render();
});

form.key("d", () => {
    form.scroll(1, true);
    screen.render();
});

form.key("u", () => {
    form.scroll(-1, true);
    screen.render();
});

const set = new adone.cui.widget.RadioSet({
    parent: form,
    left: 1,
    top: 1,
    shrink: true,
    //padding: 1,
    //content: 'f',
    style: {
        bg: "magenta"
    }
});

const radio1 = new adone.cui.widget.RadioButton({
    parent: set,
    mouse: true,
    keys: true,
    shrink: true,
    style: {
        bg: "magenta"
    },
    height: 1,
    left: 0,
    top: 0,
    name: "radio1",
    content: "radio1"
});

const radio2 = new adone.cui.widget.RadioButton({
    parent: set,
    mouse: true,
    keys: true,
    shrink: true,
    style: {
        bg: "magenta"
    },
    height: 1,
    left: 15,
    top: 0,
    name: "radio2",
    content: "radio2"
});

const text = new adone.cui.widget.TextBox({
    parent: form,
    mouse: true,
    keys: true,
    style: {
        bg: "blue"
    },
    height: 1,
    width: 20,
    left: 1,
    top: 3,
    name: "text"
});

text.on("focus", () => {
    text.readInput();
});

const check = new adone.cui.widget.CheckBox({
    parent: form,
    mouse: true,
    keys: true,
    shrink: true,
    style: {
        bg: "magenta"
    },
    height: 1,
    left: 28,
    top: 1,
    name: "check",
    content: "check"
});

const check2 = new adone.cui.widget.CheckBox({
    parent: form,
    mouse: true,
    keys: true,
    shrink: true,
    style: {
        bg: "magenta"
    },
    height: 1,
    left: 28,
    top: 14,
    name: "foooooooo2",
    content: "foooooooo2"
});

const submit = new adone.cui.widget.Button({
    parent: form,
    mouse: true,
    keys: true,
    shrink: true,
    padding: {
        left: 1,
        right: 1
    },
    left: 29,
    top: 3,
    shrink: true,
    name: "submit",
    content: "submit",
    style: {
        bg: "blue",
        focus: {
            bg: "red"
        }
    }
});

submit.on("press", () => {
    form.submit();
});

const box1 = new adone.cui.widget.Element({
    parent: form,
    left: 1,
    top: 10,
    height: 10,
    width: 10,
    content: "one",
    style: {
        bg: "cyan"
    }
});

const box2 = new adone.cui.widget.Element({
    parent: box1,
    left: 1,
    top: 2,
    height: 8,
    width: 9,
    content: "two",
    style: {
        bg: "magenta"
    }
});

const box3 = new adone.cui.widget.Element({
    parent: box2,
    left: 1,
    top: 2,
    height: 6,
    width: 8,
    content: "three",
    style: {
        bg: "yellow"
    }
});

const box4 = new adone.cui.widget.Element({
    parent: box3,
    left: 1,
    top: 2,
    height: 4,
    width: 7,
    content: "four",
    style: {
        bg: "blue"
    }
});

const output = new adone.cui.widget.ScrollableText({
    parent: form,
    mouse: true,
    keys: true,
    left: 0,
    top: 20,
    height: 5,
    left: 0,
    right: 0,
    style: {
        bg: "red"
    },
    content: "foobar"
});

const bottom = new adone.cui.widget.Line({
    parent: form,
    type: "line",
    orientation: "horizontal",
    left: 0,
    right: 0,
    top: 50,
    style: {
        fg: "blue"
    }
});

screen.key("q", () => {
    return screen.destroy();
});

form.focus();

form.submit();

screen.render();
