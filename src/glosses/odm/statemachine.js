const utils = require("./utils");

/*!
 * StateMachine represents a minimal `interface` for the
 * constructors it builds via StateMachine.ctor(...).
 *
 * @api private
 */
export default class StateMachine {
    constructor(...states) {
        this.paths = {};
        this.states = {};
        this.stateNames = states;

        let i = states.length;
        let state;

        while (i--) {
            state = states[i];
            this.states[state] = {};
        }

        states.forEach((state) => {
            // Changes the `path`'s state to `state`.
            this[state] = function (path) {
                this._changeState(path, state);
            };
        });
    }

    /*!
    * This function is wrapped by the state change functions:
    *
    * - `require(path)`
    * - `modify(path)`
    * - `init(path)`
    *
    * @api private
    */
    _changeState(path, nextState) {
        const prevBucket = this.states[this.paths[path]];
        if (prevBucket) {
            delete prevBucket[path];
        }

        this.paths[path] = nextState;
        this.states[nextState][path] = true;
    }

    clear(state) {
        const keys = Object.keys(this.states[state]);
        let i = keys.length;
        let path;

        while (i--) {
            path = keys[i];
            delete this.states[state][path];
            delete this.paths[path];
        }
    }

    /*!
    * Checks to see if at least one path is in the states passed in via `arguments`
    * e.g., this.some('required', 'inited')
    *
    * @param {String} state that we want to check for.
    * @private
    */
    some() {
        const _this = this;
        const what = arguments.length ? arguments : this.stateNames;
        return Array.prototype.some.call(what, (state) => {
            return Object.keys(_this.states[state]).length;
        });
    }

    /*!
    * This function builds the functions that get assigned to `forEach` and `map`,
    * since both of those methods share a lot of the same logic.
    *
    * @param {String} iterMethod is either 'forEach' or 'map'
    * @return {Function}
    * @api private
    */
    _iter(iterMethod) {
        return function () {
            const numArgs = arguments.length;
            let states = utils.args(arguments, 0, numArgs - 1);
            const callback = arguments[numArgs - 1];

            if (!states.length) {
                states = this.stateNames;
            }

            const _this = this;

            const paths = states.reduce((paths, state) => {
                return paths.concat(Object.keys(_this.states[state]));
            }, []);

            return paths[iterMethod]((path, i, paths) => {
                return callback(path, i, paths);
            });
        };
    }

    /*!
    * Iterates over the paths that belong to one of the parameter states.
    *
    * The function profile can look like:
    * this.forEach(state1, fn);         // iterates over all paths in state1
    * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
    * this.forEach(fn);                 // iterates over all paths in all states
    *
    * @param {String} [state]
    * @param {String} [state]
    * @param {Function} callback
    * @private
    */
    forEach() {
        this.forEach = this._iter("forEach");
        return this.forEach.apply(this, arguments);
    }

    /*!
    * Maps over the paths that belong to one of the parameter states.
    *
    * The function profile can look like:
    * this.forEach(state1, fn);         // iterates over all paths in state1
    * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
    * this.forEach(fn);                 // iterates over all paths in all states
    *
    * @param {String} [state]
    * @param {String} [state]
    * @param {Function} callback
    * @return {Array}
    * @private
    */
    map() {
        this.map = this._iter("map");
        return this.map.apply(this, arguments);
    }
}
