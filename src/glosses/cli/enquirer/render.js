

module.exports = async (value, prompt, context = {}) => {
    const { choices, multiple } = prompt.options;
    const { size, submitted } = prompt.state;

    const prefix = context.prefix || await prompt.prefix();
    const separator = context.separator || await prompt.separator();
    const message = context.message || await prompt.message();

    // ? Select your favorite colors >
    // ^             ^               ^
    // prefix     message        separator
    let promptLine = [prefix, message, separator].filter(Boolean).join(" ");
    prompt.state.prompt = promptLine;

    const header = context.header || await prompt.header();
    const output = context.format || await prompt.format(value);
    const help = context.help || await prompt.error() || await prompt.hint();
    const body = context.body || await prompt.body();
    const footer = context.footer || await prompt.footer();

    if (output || !help) {
        promptLine += ` ${output}`; 
    }
    if (help && !promptLine.includes(help)) {
        promptLine += ` ${help}`; 
    }

    if (submitted && choices && multiple && !output && !body) {
        promptLine += prompt.styles.danger("No items were selected");
    }

    prompt.clear(size);
    prompt.write([header, promptLine, body, footer].filter(Boolean).join("\n"));
    prompt.restore();
};
