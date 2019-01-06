const {
    text: { unicode }
} = adone;

export default {
    // log: {
    //     icon: "",
    //     color: "",
    //     label: ""
    // },
    fatal: {
        id: 0,
        color: "red",
        icon: unicode.symbol.cross
    },
    error: {
        id: 1,
        icon: unicode.symbol.cross,
        color: "red"
    },
    warn: {
        id: 2,
        icon: unicode.symbol.warning,
        color: "yellow"
    },
    notice: {
        id: 3,
        icon: unicode.symbol.bullet,
        color: "yellow"
    },
    info: {
        id: 4,
        icon: unicode.symbol.info,
        color: "green"
    },
    debug: {
        id: 5,
        icon: unicode.approx("⬤"),
        color: "blue"
    },
    verbose: {
        id: 6,
        icon: unicode.approx("⬤"),
        color: "cyan"
    },
    success: {
        id: -1,
        icon: unicode.symbol.tick,
        color: "green"
    },
    complete: {
        id: -1,
        icon: unicode.symbol.checkboxOn,
        color: "cyan"
    },
    start: {
        id: -1,
        icon: unicode.symbol.play,
        color: "green"
    },
    awaiting: {
        id: -1,
        icon: unicode.symbol.ellipsis,
        color: "blue"
    },
    watching: {
        id: -1,
        icon: unicode.symbol.ellipsis,
        color: "yellow"
    }
};
