import adone from "adone";
const { is } = adone;

export default function globals() {
    return {
        range(start, stop, step) {
            if (is.undefined(stop)) {
                stop = start;
                start = 0;
                step = 1;
            } else if (!step) {
                step = 1;
            }

            const arr = [];
            let i;
            if (step > 0) {
                for (i = start; i < stop; i += step) {
                    arr.push(i);
                }
            } else {
                for (i = start; i > stop; i += step) {
                    arr.push(i);
                }
            }
            return arr;
        },
        cycler(...items) {
            let index = -1;

            return {
                current: null,
                reset() {
                    index = -1;
                    this.current = null;
                },

                next() {
                    index++;
                    if (index >= items.length) {
                        index = 0;
                    }

                    this.current = items[index];
                    return this.current;
                }
            };
        },
        joiner(sep = ",") {
            let first = true;

            return () => {
                const val = first ? "" : sep;
                first = false;
                return val;
            };
        }
    };
}
