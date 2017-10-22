export default function format(x) {
    if (x === "") {
        return "(empty string)";
    }
    return adone.assertion.__.util.inspect(x, undefined, 5, false);
}
