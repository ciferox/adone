const canColor = process.stdout.isTTY;

const colorize = (str, color) => {
    if (!canColor) {
        return str;
    }

    return `\x1b[${color}m${str}\x1b[0m`;
};

export const red = (str) => colorize(str, 31);

export const green = (str) => colorize(str, 32);
