const Prompt = require("../types/string");
const completer = require("../completer");

class Input extends Prompt {
    constructor(options) {
        super(options);
        const history = this.options.history;
        if (history && history.store) {
            const initial = history.values || this.initial;
            this.autosave = Boolean(history.autosave);
            this.store = history.store;
            this.data = this.store.get("values") || { past: [], present: initial };
            this.initial = this.data.present || this.data.past[this.data.past.length - 1];
        }
    }

    completion(action) {
        if (!this.store) {
            return this.alert(); 
        }
        this.data = completer(action, this.data, this.input);
        if (!this.data.present) {
            return this.alert(); 
        }
        this.input = this.data.present;
        this.cursor = this.input.length;
        return this.render();
    }

    altUp() {
        return this.completion("prev");
    }

    altDown() {
        return this.completion("next");
    }

    prev() {
        this.save();
        return super.prev();
    }

    save() {
        if (!this.store) {
            return; 
        }
        this.data = completer("save", this.data, this.input);
        this.store.set("values", this.data);
    }

    submit() {
        if (this.store && this.autosave === true) {
            this.save();
        }
        return super.submit();
    }
}

module.exports = Input;
