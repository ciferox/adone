const { assertion: $assert } = adone;
const { __: { util } } = $assert;

export default function getOwnEnumerableProperties(obj) {
    return Object.keys(obj).concat(util.getOwnEnumerablePropertySymbols(obj));
}
