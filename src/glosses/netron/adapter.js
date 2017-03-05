import adone from "adone";
const { is, x } = adone;

/**
 * Базовый класс адаптеров.
 * 
 * Адаптер - это внешний по отношению к нетрону серверный объект, реализующий определённый протокол взаимодействия и который является основой для netron-протокола.
 * Освновное назначение адаптера - обеспечить взаимодействие с нетронами, которые по какой-то причине не могут быть подключены к нетрону через его основной бинарный протокол.
 * Адаптер в данном случае выполняет роль туннеля.
 * 
 * 
 * 
 * @export
 * @class Adapter
 */
export default class Adapter {
    constructor(options) {
        this.option = new adone.configuration.Configuration();
        this.option.assign(options);
        this.server = null;
    }

    isBound() {
        return !is.null(this.server); 
    }

    bind(netron) {
        throw new x.NotImplemented("method bind() should be implemented");
    }

    unbind() {
        throw new x.NotImplemented("method unbind() should be implemented");
    }
}
adone.tag.set(Adapter, adone.tag.NETRON_ADAPTER);
