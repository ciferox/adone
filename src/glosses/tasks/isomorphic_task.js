const {
    task,
    error
} = adone;

const ALLOWED_TYPES = ["Object", "global", "adone", "undefined", "null"];

export default class IsomorphicTask extends task.Task {
    async _run(...args) {
        return this.main(this._validateArgs(args));
    }

    _validateArgs(args) {
        if (args.length > 1) {
            throw new error.InvalidNumberOfArgumentsException(`Isomorphic task takes nothing or only one argument of type Object. Received ${args.length} arguments`);
        }
        
        if (!ALLOWED_TYPES.includes(adone.typeOf(args[0]))) {
            throw new error.InvalidArgumentException(`Isomorphic task takes only argument of type Object. Received ${adone.typeOf(args[0])}`);
        }

        return args[0];
    }
}
