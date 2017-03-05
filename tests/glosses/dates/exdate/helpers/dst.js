export function isNearSpringDST() {
    return adone.date().subtract(1, "day").utcOffset() !== adone.date().add(1, "day").utcOffset();
}
