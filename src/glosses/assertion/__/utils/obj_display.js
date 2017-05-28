const { assertion: $assert } = adone;
const { __: { util }, config } = $assert;

export default function objDisplay(obj) {
    const str = util.inspect(obj);
    const type = Object.prototype.toString.call(obj);

    if (config.truncateThreshold && str.length >= config.truncateThreshold) {
        if (type === "[object Function]") {
            return !obj.name || obj.name === ""
                ? "[Function]"
                : `[Function: ${obj.name}]`;
        } else if (type === "[object Array]") {
            return `[ Array(${obj.length}) ]`;
        } else if (type === "[object Object]") {
            const keys = Object.keys(obj);
            const kstr = keys.length > 2
                    ? `${keys.splice(0, 2).join(", ")}, ...`
                    : keys.join(", ");
            return `{ Object (${kstr}) }`;
        }
        return str;

    }
    return str;

}
