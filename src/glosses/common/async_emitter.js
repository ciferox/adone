
const { is, util: { throat } } = adone;


/**
 * EventEmitter на базе промисов.
 * 
 * @export
 * @class AsyncEmitter
 * @extends {adone.EventEmitter}
 */
export default class AsyncEmitter extends adone.EventEmitter {
    constructor(concurrency = null) {
        super();
        if (concurrency >= 1) {
            this.setConcurrency(concurrency);
        }
        this._onceMapping = new Map();
    }

    /**
     * Устанавливает уровень параллелизма.
     *
     * @method setConcurrency
     * @param {number} [max=null] - максимальное значение параллелизма
     * @returns {AsyncEmitter} this
     */
    setConcurrency(max = null) {
        if (max >= 1) {
            this.manager = throat(max);
        } else {
            this.manager = null;
        }
        return this;
    }

    /**
     * Выполняет функции параллельно с учётом максимального значения параллелизма.
     *
     * @method emitParallel
     * @alias emit
     * @param {string} event - имя события
     * @param {any} arguments - арументы
     * @returns {promise<any>}
     */
    emitParallel(event, ...args) {
        const promises = [];

        this.listeners(event).forEach((listener) => {
            promises.push(this._executeListener(listener, args));
        });

        return Promise.all(promises);
    }

    /**
     * Выполняет функции последовательно.
     *
     * @method emitSerial
     * @param {string} event - имя события
     * @param {any} arguments - аргументы
     * @returns {promise<any>}
     */
    emitSerial(event, ...args) {
        return this.listeners(event).reduce((promise, listener) => promise.then((values) =>
            this._executeListener(listener, args).then((value) => {
                values.push(value);
                return values;
            })
        ), Promise.resolve([]));
    }

    /**
    * Выполняет функции последовательно используя значение возвращённое предыдущей функцией.
    *
    * @method emitReduce
    * @param {string} event - имя события
    * @param {any} arguments - аргументы для первой функции
    * @returns {promise<any>}
    */
    emitReduce(event, ...args) {
        return this._emitReduceRun(event, args);
    }

    /**
    * Выполняет функции в обратном порядке последовательно используя значение возвращённое предыдущей функцией.
    *
    * @method emitReduceRight
    * @param {string} event - имя события
    * @param {any} arguments - аргументы для первой функции
    * @returns {promise<any>}
    */
    emitReduceRight(event, ...args) {
        return this._emitReduceRun(event, args, true);
    }

    /**
    * Функция регистрируется для разового вызова для указанного события.
    *
    * @method once
    * @param {string} event - имя события
    * @param {function} listener - функция
    * @returns {asyncEmitter} this
    */
    once(event, listener) {
        if (!is.function(listener)) {
            throw new TypeError("listener must be a function");
        }
        let fired = false;
        const self = this;
        const onceListener = function(...args) {
            self.removeListener(event, onceListener);
            if (fired === false) {
                fired = true;
                return listener.apply(this, args);
            }
            return undefined;
        };
        this.on(event, onceListener);
        this._onceMapping.set(listener, onceListener);
        return this;
    }

    removeListener(event, listener) {
        if (this._onceMapping.has(listener)) {
            const t = this._onceMapping.get(listener);
            this._onceMapping.delete(listener);
            listener = t;
        }
        return super.removeListener(event, listener);
    }

    /**
    * Регистрирует функцию для указанного события и возвращяет функцию для её дерегистрации.
    *
    * @method subscribe
    * @param {string} event - имя события
    * @param {function} listener - функция
    * @param {boolean} [once=false] - если true, то функция вызовется единожды
    * @returns {function} unsubscribe-функция
    */
    subscribe(event, listener, once = false) {
        const unsubscribe = () => {
            this.removeListener(event, listener);
        };

        if (once) {
            this.once(event, listener);
        } else {
            this.on(event, listener);
        }

        return unsubscribe;
    }

    /**
    * Реализация методов emitReduce/emitReduceRight
    *
    * @method _emitReduceRun
    * @param {string} event - имя событий
    * @param {any[]} args - аргументы посылаемые первой функции
    * @param {boolean} [inverse=false] - если true, то функции вызываются в обратном порядке
    * @returns {any[]} values - значение вовзращённое из последней выполненной функции 
    */
    _emitReduceRun(event, args, inverse = false) {
        const listeners = inverse ? this.listeners(event).reverse() : this.listeners(event);
        return listeners.reduce((promise, listener) => promise.then((prevArgs) => {
            const currentArgs = is.array(prevArgs) ? prevArgs : [prevArgs];
            return this._executeListener(listener, currentArgs);
        }), Promise.resolve(args));
    }

    /**
     * Промисифицирует функцию и выполняет её.
     *
     * @method _executeListener
     * @param {function} listener - функция
     * @param {any[]} args - аргументы функции
     * @returns {promise} - the return value or exception
     */
    _executeListener(listener, args) {
        try {
            if (this.manager) {
                return this.manager(() => listener(...args));
            }
            return Promise.resolve(listener(...args));
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
