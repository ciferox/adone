const { Contextable, Public, Private, Description, Type } = adone.netron.decorator;

@Private
@Contextable
@Description("Omnitron key value database")
export default class Store extends adone.database.level.DB {
    @Public
    get(key, options) {
        return super.get(key, options);
    }

    @Public
    put(key, value, options) {
        return super.put(key, value, options);
    }

    @Public
    del(key, options) {
        return super.del(key, options);
    }

    @Public
    batch(items, options) {
        return super.batch(items, options);
    }
}
