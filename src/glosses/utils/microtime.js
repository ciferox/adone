import adone from "adone";

const b = adone.bind("microtime.node");

export default {
    now: b.now,
    nowDouble: b.nowDouble,
    nowStruct: b.nowStruct
};
