const { format, sprintf } = adone;

console.log(sprintf("Hello %s", "world"));
console.log(format("Hello %s", "world"));

export default {
	"sprintf"() {
		return sprintf("Hello %s", "world");
	},
	"format"() {
		return format("Hello %s", "world");
	},
};
