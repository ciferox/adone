const {
    is,
    error,
    event: { AsyncEmitter },
    text: { toCamelCase },
    util
} = adone;

const createCallbackName = (str) => {
    const prefix = str[0] === "_"
        ? "_"
        : "";

    return prefix + toCamelCase(`on_${str}`);
};

export class StateMachine extends AsyncEmitter {
    #state = null;
    #failState;
    #allowedStates = new Map();

    constructor({ initial, fail, transitions } = {}) {
        super();

        if (!initial) {
            throw new error.NotValidException("Initial state is not defined");
        }

        if (!is.array(transitions) || transitions.length === 0) {
            throw new error.NotValidException("Transitions are not defined");
        }

        this.#state = initial;
        this.#failState = is.string(fail)
            ? fail
            : "fail"

        for (const t of transitions) {
            this.addAllowedState(t.name, t.from);

            let onEventMethod;
            let superMethod;
            if (is.function(this[t.name])) {
                superMethod = this[t.name];
            } else {
                onEventMethod = createCallbackName(t.name);
            }
            this[t.name] = async function (...args) {
                if (this.#allowedStates.get(t.name).includes(this.#state) || t.from === "*") {
                    try {
                        let toEnter;
                        let toLeave;
                        if (is.array(t.to)) {
                            toEnter = t.to[0];
                            toLeave = t.to[1];
                        } else {
                            toEnter = t.to;
                        }

                        this.#updateState(toEnter);

                        let result;
                        if (is.function(superMethod)) {
                            result = await superMethod.call(this, ...args);
                        } else if (is.function(this[onEventMethod])) {
                            result = await this[onEventMethod](...args);
                        }

                        if (is.string(toLeave)) {
                            this.#updateState(toLeave);
                        }

                        return result;
                    } catch (err) {
                        this.#updateState(this.#failState);
                        throw err;
                    }
                }
                this.emit("invalidTransition", t.name, this.#state);
                throw new error.IllegalStateException(`Invalid transition '${t.name}' for '${this.#state}' state`);
            };
        }
    }

    isTransitionAllow(name) {
        const states = this.#allowedStates.get(name);
        return states.includes(this.#state);
    }

    addAllowedState(transitionName, state) {
        const states = this.#allowedStates.get(transitionName);
        if (is.undefined(states)) {
            this.#allowedStates.set(transitionName, util.arrify(state));
        } else {
            states.push(...util.arrayDiff(state));
        }
    }

    getState() {
        return this.#state;
    }

    async waitUntilStateEnters(state, timeout) {
        if (state === this.#state) {
            return;
        }
        const stateUpdate = new Promise((resolve) => {
            const handler = (incomingState) => {
                if (incomingState === state) {
                    this.off("state", handler);
                    resolve();
                }
            };
            this.on("state", handler);
        });
        if (is.number(timeout) && timeout > 0) {
            await this.#timeout(stateUpdate, timeout);
        } else {
            await stateUpdate;
        }
    }

    async waitUntilStateLeaves(state, timeout) {
        if (state !== this.#state) {
            return;
        }
        const stateUpdate = new Promise((resolve) => {
            const handler = (incomingState) => {
                if (incomingState !== state) {
                    this.off("state", handler);
                    resolve();
                }
            };

            this.on("state", handler);
        });
        if (is.number(timeout) && timeout > 0) {
            await this.#timeout(stateUpdate, timeout);
        } else {
            await stateUpdate;
        }
    }

    #timeout(promise, ms) {
        const timeout = new Promise((resolve, reject) => {
            const id = setTimeout(() => {
                clearTimeout(id);
                reject(new error.TimeoutException("State awating timed out"));
            }, ms);
        });
        return Promise.race([promise, timeout]);
    }

    #updateState(newState) {
        this.#state = newState;
        this.emit("state", newState);
    }
}
