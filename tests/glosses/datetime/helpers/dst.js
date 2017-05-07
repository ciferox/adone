export function isNearSpringDST() {
    return adone.datetime().subtract(1, "day").utcOffset() !== adone.datetime().add(1, "day").utcOffset();
}
