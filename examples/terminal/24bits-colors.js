// import adone from "adone";
const { lodash: _ } = adone.vendor;
const term = adone.terminal;

function fromRange(start, end, fn) {
    _.range(start, end).forEach(fn);
    term.print("{normal}\n");
}

term.print("{bold}\n=== 24 bits colors 256 shades of gray test ===\n\n{/}");

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{~%u-fg}*", i);
});

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{~%u-bg} ", i);
});

term.print("{bold}\n=== 24 bits colors 256 shades of green test ===\n\n{/}");

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{#%x%x%x-fg}*", 0, i, 0);
});

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{#%x%x%x-bg} ", 0, i, 0);
});

term.print("{bold}\n=== 24 bits colors 256 shades of desatured magenta test ===\n\n{/}");

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{#%x%x%x-fg}*", i, Math.floor(i / 2), i);
});

fromRange(0, 256, (i) => {
    if (!(i % 70)) {
        term.print("{normal}\n");
    }
    term.print("{#%x%x%x-bg} ", i, Math.floor(i / 2), i, " ");
});

term.print("{normal}\n");
term.print("Reset...\n");
