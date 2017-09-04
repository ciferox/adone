const colors = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7,
    normal: 9
};

export default class Canvas2 {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.clear();

        this.fontFg = "normal";
        this.fontBg = "normal";
        this.color = "normal";
    }

    getCoord(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);
        return x + this.width * y;
    }

    clear() {
        this.content = new Array(this.width * this.height);
    }

    measureText(str) {
        return {
            width: Number(str.length)
        };
    }

    writeText(str, x, y) {
        //console.log(str + ": " + x + "," + y)
        const coord = this.getCoord(x, y);
        for (let i = 0; i < str.length; i++) {
            this.content[coord + i] = str[i];
        }

        const bg = colors[this.color];
        const fg = colors[this.fontFg];

        this.content[coord] = `\x1B[3${fg}m` + `\x1B[4${bg}m${this.content[coord]}`;
        this.content[coord + str.length - 1] += "\x1B[39m\x1B[49m";

    }

    frame(delimiter) {
        delimiter = delimiter || "\n";
        const result = [];
        for (let i = 0, j = 0; i < this.content.length; i++ , j++) {
            if (j === this.width) {
                result.push(delimiter);
                j = 0;
            }

            if (this.content[i] == null) {
                result.push(" ");
            } else {
                result.push(this.content[i]);
            }
        }
        result.push(delimiter);
        return result.join("");
    }

    set(x, y) {
        if (!(x >= 0 && x < this.width && y >= 0 && y < this.height)) {
            return;
        }
        const coord = this.getCoord(x, y);

        const color = colors[this.color];
        this.content[coord] = `\x1B[4${color}m ` + `\x1B[49m`;
    }

    unset(x, y) {
        if (!(x >= 0 && x < this.width && y >= 0 && y < this.height)) {
            return;
        }
        const coord = this.getCoord(x, y);
        this.content[coord] = null;
    }

    toggle(x, y) {
        if (!(x >= 0 && x < this.width && y >= 0 && y < this.height)) {
            return;
        }
        const coord = this.getCoord(x, y);
        this.content[coord] = this.content[coord] == null ? "p" : null;
    }
}
