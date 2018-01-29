export const PROTOCOL_ID = "/multistream/1.0.0";

adone.lazify({
    Listener: "./listener",
    Dialer: "./dialer",
    matchSemver: "./listener/match_semver",
    matchExact: "./listener/match_exact"
}, exports, require);
