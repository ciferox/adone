'use strict';

/**
 * суть в том, чтобы организовать чаиниг с методами, возвращающими промисы
 * выполнение цепочки должно идти строго в определенном порядке, при возникновении
 * ошибки выполнение должно останавливаться.
 *
 * async function f() {
 *     const t = new Test;
 *     await t.a();
 *     await t.a().b();
 *     await t.a().b().c();
 * }
 *
 * в синхронном варианте это реализуется возвращением методом объекта this
 * в данной ситуации пришлось использовать Proxy.
 * сам класс придётся обернуть fluent.
 *
 * Rаждый метод должен возвращать новый контекст, также возвращаемое значение
 * может быть промисом, который отрезолвится новым контекстом.
 * UDP: Все вызовы имеют один контекст - инстанс.
 *
 * Proxy перехватывает создание инстансов класса, для каждого инстанса создаётся
 * еще один объект Proxy, перехватывающий получение свойств, для каждого имени свойства
 * также создаётся Proxy, но теперь уже перехватывающая операцию вызова(только если
 * имя свойства then или catch, либо это свойство - функция, иначе в цепочку добавится
 * промис, разрешаемый данным свойством).
 *
 * Если при вызове имя свойства будет catch или then(получается имена методов не
 * могут иметь такие имена), то вернётся промис для всей цепочки, иначе цепочка
 * промисов дополнится еще одним и функция вернёт Proxy, перехватывающий
 * получение свойств объекта(так всё и замыкается).
 * 
 * Тут есть проблема.
 * Контекст неизвестен пока промис не разрешится, поэтому нельзя определить 
 * есть ли свойство с данным именем и чем оно является.
 * На данный момент все имена свойств считаются именами свойств инстанса. 
 * То есть, если в качестве конекста передавать объекты похожие на инстанс(duck typing) 
 * или сам инстанс, то всё нормально будет.
 * UPD: решено сделать один контекст для всех - инстанс.
 */


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Test {
    constructor(value = 0) {
        this.counter = value;
    }

    a() {
        console.log('call a', this);
        return sleep(1000);
    }

    b() {
        console.log('call b', this);
        return sleep(1000);
    }

    c() {
        console.log('call c', this);
        return sleep(1000);
    }

    d() {
        console.log('call d', this);
    }

    fail() {
        console.log('fail');
        return Promise.reject(new Error('opa'));
    }
}

function fluent(cls) {
    return new Proxy(cls, {
        construct: (target, args) => {
            const instance = new target(...args);
            const buildProxy = (promise) => {  // if `promise` is undefined that is the beginning of a chain
                return new Proxy(instance, {
                    get: (target, name) => {
                        let _promise = promise ? promise : Promise.resolve(instance);

                        if (!(instance[name] instanceof Function)) {
                            if (name !== 'then' && name !== 'catch') {
                                return _promise.then(() => instance[name]);
                            }
                        }

                        return new Proxy(instance[name] || (adone.noop), {
                            apply: (target, thisValue, args) => {
                                if (name === 'then' || name === 'catch') {
                                    return _promise[name].apply(_promise, args);
                                }
                                return buildProxy(_promise.then(() => instance[name].apply(instance, args)));
                            }
                        });
                    }
                });
            };
            return buildProxy();
        }
    });
}

Test = fluent(Test);

const t = new Test;

let a = t.a().d().b().a().c().d().counter;

a.then((value) => {
    console.log(value);
    console.log('next');
    return t.a().b().c().d().fail().d().c().b().a().then(() => {
        console.log('done')
    }).catch((err) => {
        console.log('error 2', err);
    })
}).catch((err) => {
    console.log('error', err);
});