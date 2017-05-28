const { assertion: { __: { util } } } = adone;

export default function compareByInspect(a, b) {
    return util.inspect(a) < util.inspect(b) ? -1 : 1;
}
