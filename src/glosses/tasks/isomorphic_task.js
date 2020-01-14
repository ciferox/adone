const {
    task,
    error
} = adone;

const ALLOWED_TYPES = ["Object", "global", "adone", "undefined", "null"];

/**
 * Isomorphic task taskes only one argument as Object instead of many arguments.
 * 
 * In this case, you don’t need to know the task execution signature, which facilitates the interaction between tasks,
 * allows you to load parameters from configuration files or other sources and to use the latest features of the ESNext.
 */
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
