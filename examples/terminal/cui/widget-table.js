const screen = new adone.cui.Screen({
    dump: `${__dirname}/logs/table.log`,
    autoPadding: false,
    fullUnicode: true,
    warnings: true
});

const DU = "杜";
const JUAN = "鹃";

const table = new adone.cui.widget.Table({
    //parent: screen,
    top: "center",
    left: "center",
    data: null,
    border: "line",
    align: "center",
    tags: true,
    //width: '80%',
    width: "shrink",
    style: {
        border: {
            fg: "red"
        },
        header: {
            fg: "blue",
            bold: true
        },
        cell: {
            fg: "magenta"
        }
    }
});

const data1 = [
    ["Animals", "Foods", "Times"],
    ["Elephant", "Apple", "1:00am"],
    ["Bird", "Orange", "2:15pm"],
    ["T-Rex", "Taco", "8:45am"],
    ["Mouse", "Cheese", "9:05am"]
];

data1[1][0] = `{red-fg}${data1[1][0]}{/red-fg}`;
data1[2][0] += ` (${DU}${JUAN})`;

const data2 = [
    ["Animals", "Foods", "Times", "Numbers"],
    ["Elephant", "Apple", "1:00am", "One"],
    ["Bird", "Orange", "2:15pm", "Two"],
    ["T-Rex", "Taco", "8:45am", "Three"],
    ["Mouse", "Cheese", "9:05am", "Four"]
];

data2[1][0] = `{red-fg}${data2[1][0]}{/red-fg}`;
data2[2][0] += ` (${DU}${JUAN})`;

screen.key("q", () => {
    return screen.destroy();
});

table.setData(data2);
screen.append(table);
screen.render();

setTimeout(() => {
    table.setData(data1);
    screen.render();
}, 3000);
