// import adone from "adone";

const screen = new adone.cui.Screen({
    autoPadding: true,
    warnings: true
});

const tab = new adone.cui.widget.Element({
    parent: screen,
    top: 2,
    left: 0,
    right: 0,
    bottom: 0,
    scrollable: true,
    keys: true,
    vi: true,
    alwaysScroll: true,
    scrollbar: {
        ch: " "
    },
    style: {
        scrollbar: {
            inverse: true
        }
    }
});

const form = new adone.cui.widget.Element({
    parent: tab,
    top: 0,
    left: 1,
    right: 1,
    //height: 9,
    keys: true,
    mouse: true,
    // XXX Problem:
    height: "shrink",
    label: " {blue-fg}Form{/blue-fg} ",
    border: "line",
    tags: true
});

form._.ftext = new adone.cui.widget.Text({
    parent: form,
    top: 0,
    left: 0,
    height: 1,
    content: "Foo",
    tags: true
});

form._.foo = new adone.cui.widget.TextBox({
    parent: form,
    name: "foo",
    inputOnFocus: true,
    top: 0,
    left: 9,
    right: 1,
    height: 1,
    style: {
        bg: "black",
        focus: {
            bg: "blue"
        },
        hover: {
            bg: "blue"
        }
    }
});

form._.btext = new adone.cui.widget.Text({
    parent: form,
    top: 2,
    left: 0,
    height: 1,
    content: "Bar",
    tags: true
});

form._.bar = new adone.cui.widget.TextBox({
    parent: form,
    name: "bar",
    inputOnFocus: true,
    top: 2,
    left: 9,
    right: 1,
    height: 1,
    style: {
        bg: "black",
        focus: {
            bg: "blue"
        },
        hover: {
            bg: "blue"
        }
    }
});

form._.ztext = new adone.cui.widget.Text({
    parent: form,
    top: 4,
    left: 0,
    height: 1,
    content: "Baz",
    tags: true
});

form._.baz = new adone.cui.widget.TextBox({
    parent: form,
    name: "baz",
    inputOnFocus: true,
    top: 4,
    left: 9,
    right: 1,
    height: 1,
    style: {
        bg: "black",
        focus: {
            bg: "blue"
        },
        hover: {
            bg: "blue"
        }
    }
});

form._.submit = new adone.cui.widget.Button({
    parent: form,
    name: "submit",
    top: 6,
    right: 1,
    height: 1,
    //width: 'shrink',
    width: 10,
    content: "send",
    tags: true,
    style: {
        bg: "black",
        focus: {
            bg: "blue"
        },
        hover: {
            bg: "blue"
        }
    }
});

form._.submit.on("press", () => {
    tabs.send._.form.submit();
});

form.on("submit", (data) => {
    screen.leave();
    console.log(data);
    screen.destroy();
});

screen.key("q", () => {
    screen.destroy();
});

screen.render();
