export class Command extends adone.shell.Base {
    constructor() {
        super("echo", { allowGlobbing: false });
    }

    _execute(options, messages) {
        messages = [].slice.call(arguments, options ? 0 : 1);

        if (messages[0] === "-e") {
            // ignore -e
            messages.shift();
        }

        return messages.join(" ");
    }
}
