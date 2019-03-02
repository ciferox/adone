const { lazify } = adone;

const sourcemaps = lazify({
    __: "./__",
    init: "./init",
    write: "./write"
}, exports, require);

export default function plugin(key) {
    switch (key) {
        case "sourcemapsInit": {
            return sourcemaps.init(sourcemaps);
        }
        case "sourcemapsWrite": {
            return sourcemaps.write(sourcemaps);
        }
    }
}
