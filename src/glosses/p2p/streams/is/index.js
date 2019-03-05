const {
    is
} = adone;

export const source = (s) => is.function(s) && s.length === 2;
export const sink = (s) => is.function(s) && s.length === 1;
export const duplex = (d) => typeof d === "object" && source(d.source) && sink(d.sink);
