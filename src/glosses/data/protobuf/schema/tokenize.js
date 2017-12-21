export default function (sch) {
    const noComments = function (line) {
        const i = line.indexOf("//");
        return i > -1 ? line.slice(0, i) : line;
    };

    const noMultilineComments = function () {
        let inside = false;
        return function (token) {
            if (token === "/*") {
                inside = true;
                return false;
            }
            if (token === "*/") {
                inside = false;
                return false;
            }
            return !inside;
        };
    };

    const trim = function (line) {
        return line.trim();
    };

    return sch
        .replace(/([;,{}()=:[\]<>]|\/\*|\*\/)/g, " $1 ")
        .split(/\n/)
        .map(trim)
        .filter(Boolean)
        .map(noComments)
        .map(trim)
        .filter(Boolean)
        .join("\n")
        .split(/\s+|\n+/gm)
        .filter(noMultilineComments());
}
