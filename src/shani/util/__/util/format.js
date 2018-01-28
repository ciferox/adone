export default function format(x) {
    if (x === "") {
        return "(empty string)";
    }
    return adone.assertion.__.util.inspect(x, {
        showHidden: false,
        depth: 5,
        quoteStrings: false
    });
}
