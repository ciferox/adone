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
    #allowedStates = new Map();

    constructor({ initial, transitions } = {}) {
        super();

        if (!initial) {
            throw new error.NotValidException("Initial state is not defined");
        }

        if (!is.array(transitions) || transitions.length === 0) {
            throw new error.NotValidException("Transitions are not defined");
        }

        this.#state = initial;

        for (const t of transitions) {
            const states = this.#allowedStates.get(t.event);
            if (is.undefined(states)) {
                this.#allowedStates.set(t.event, [t.from]);
            } else {
                states.push(t.from);
            }

            let onEventMethod;
            let superMethod;
            if (is.function(this[t.event])) {
                superMethod = this[t.event];
            } else {
                onEventMethod = createCallbackName(t.event);
            }
            this[t.event] = async function (...args) {
                if (this.#allowedStates.get(t.event).includes(this.#state) || t.from === "*") {
                    let toEnter;
                    let toLeave;
                    if (is.array(t.to)) {
                        toEnter = t.to[0];
                        toLeave = t.to[1];
                    } else {
                        toEnter = t.to;
                    }

                    this.#state = toEnter;
                    this.emit("state", toEnter);

                    let result;
                    if (is.function(superMethod)) {
                        result = superMethod.call(this, ...args);
                    } else if (is.function(this[onEventMethod])) {
                        result = await this[onEventMethod](...args);
                    }

                    if (is.string(toLeave)) {
                        this.#state = toLeave;
                        this.emit("state", toLeave);
                    }

                    return result;
                }
                this.emit("invalidTransition", t.event, this.#state);
                throw new error.IllegalStateException(`Invalid transition '${t.event}' for '${this.#state}' state`);
            };
        }
    }

    onInvalidTransition(callback) {
        this.on("invalidTransition", callback);
    }

    getState() {
        return this.#state;
    }

    async waitUntilStateEnters(state, timeout = 0) {
        if (state === this.#state) {
            return;
        }
        const stateUpdate = new Promise((resolve, reject) => {
            this.on("state", (incomingState) => {
                if (incomingState === state) {
                    resolve();
                }
            });
        });
        if (timeout > 0) {
            await this.#timeout(stateUpdate, timeout);
        } else {
            await stateUpdate;
        }
    }

    async waitUntilStateLeaves(state, timeout = 0) {
        if (state !== this.#state) {
            return;
        }
        const stateUpdate = new Promise((resolve, reject) => {
            this.on("state", (incomingState) => {
                if (incomingState !== state) {
                    resolve();
                }
            });
        });
        if (timeout > 0) {
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
}
