export const regex = /^#!(.*)/;

export const command = (str) => {
    const match = str.match(regex);

    if (!match) {
        return null;
    }

    const arr = match[0].replace(/#! ?/, "").split(" ");
    const bin = arr[0].split("/").pop();
    const arg = arr[1];

    return (bin === "env" ? arg : bin + (arg ? ` ${arg}` : ""));
};
