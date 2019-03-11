const {
    is,
    cli: { prompt: { type: { InputPrompt } } }
} = adone;

export default class NumberPrompt extends InputPrompt {
    filterInput(input) {
        if (input && is.string(input)) {
            input = input.trim();
            // Match a number in the input
            const numberMatch = input.match(/(^-?\d+|^\d+\.\d*|^\d*\.\d+)(e\d+)?$/);
            // If a number is found, return that input.
            if (numberMatch) {
                return Number(numberMatch[0]);
            }
        }

        // If the input was invalid return the default value.
        return is.nil(this.opt.default) ? NaN : this.opt.default;
    }
}
