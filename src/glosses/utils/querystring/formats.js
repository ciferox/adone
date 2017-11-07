const replace = String.prototype.replace;
const percentTwenties = /%20/g;

export default {
    default: "RFC3986",
    formatters: {
        RFC1738(value) {
            return replace.call(value, percentTwenties, "+");
        },
        RFC3986(value) {
            return value;
        }
    },
    RFC1738: "RFC1738",
    RFC3986: "RFC3986"
};
