// import adone from "adone";
const { lodash: _ } = adone.vendor;
const term = adone.terminal;

function fromRange(start, end, fn) {
    _.range(start, end).forEach(fn);
    term.print("{default}\n");
}

term.print("{bold}\n=== 256 colors register test ===\n\n{/}");
fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{=%u-fg}*", i);
});

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{=%u-bg} ", i);
});

term.print("{bold}\n=== 256 colors 26 shades of gray test ===\n\n{/}");
fromRange(0, 26, (i) => {
    term.print("{~%u-fg}*", i * 255 / 25);
});

fromRange(0, 26, (i) => {
    term.print("{~%u-bg} ", i * 255 / 25);
});

term.print("{bold}\n=== 256 colors RGB 6x6x6 color cube test ===\n\n{/}");

fromRange(0, 6, (g) => {
    fromRange(0, 6, (r) => {
        for (let b = 0; b <= 5; b++) {
            term.print("{#%x%x%x-fg}*", r * 255 / 5, g * 255 / 5, b * 255 / 5);
        }
        term.print(" ");
    });
});

fromRange(0, 6, (g) => {
    fromRange(0, 6, (r) => {
        for (let b = 0; b <= 5; b++) {
            term.print("{#%x%x%x-bg}  ", r * 255 / 5, g * 255 / 5, b * 255 / 5);
        }
        term.print(" ");
    });
});

term.print("{default}\n");
term.print("Reset...\n");
