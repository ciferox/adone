// import adone from "adone";
const term = adone.terminal;

//*
const r = Math.floor(Math.random() * 256);
const g = Math.floor(Math.random() * 256);
const b = Math.floor(Math.random() * 256);
term.print("{bold}{cyan-fg}Setting the cursor color to RGB (%d,%d,%d){/}\n", r, g, b);
term.setCursorColorRgb(r, g, b);

const t = Math.floor(Math.random() * 6);

switch (t) {
    case 0:
        term.print("Block cursor\n").blockCursor();
        break;
    case 1:
        term.print("Blinking block cursor\n").blinkingBlockCursor();
        break;
    case 2:
        term.print("Underline cursor\n").underlineCursor();
        break;
    case 3:
        term.print("Blinking underline cursor\n").blinkingUnderlineCursor();
        break;
    case 4:
        term.print("Beam cursor\n").beamCursor();
        break;
    case 5:
        term.print("Blinking Beam cursor\n").blinkingBeamCursor();
        break;
}
