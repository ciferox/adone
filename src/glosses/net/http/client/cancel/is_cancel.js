export default function isCancel(value) {
    return !!(value && value[Symbol.for("adone:request:cancel")]);
}