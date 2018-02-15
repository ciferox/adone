const {
    is
} = adone;

export default function callIfFunction(thing) {
    return is.function(thing) ? thing() : thing;
}
