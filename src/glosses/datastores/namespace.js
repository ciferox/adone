const {
    datastore: { Key, Keytransform }
} = adone;

/* ::
import type {Callback, Datastore, Query, QueryResult} from 'interface-datastore'
*/

/**
 * Wraps a given datastore into a keytransform which
 * makes a given prefix transparent.
 *
 * For example, if the prefix is `new Key(/hello)` a call
 * to `store.put(new Key('/world'), mydata)` would store the data under
 * `/hello/world`.
 *
 */
export default class NamespaceDatastore/* :: <Value> */ extends Keytransform /* :: <Value> */ {
    /* :: prefix: Key */

    constructor(child/* : Datastore<Value> */, prefix/* : Key */) {
        super(child, {
            convert(key/* : Key */)/* : Key */ {
                return prefix.child(key);
            },
            invert(key/* : Key */)/* : Key */ {
                if (prefix.toString() === "/") {
                    return key;
                }

                if (!prefix.isAncestorOf(key)) {
                    throw new Error(`Expected prefix: (${prefix.toString()}) in key: ${key.toString()}`);
                }

                return new Key(key.toString().slice(prefix.toString().length), false);
            }
        });

        this.prefix = prefix;
    }

    query(q /* : Query<Value> */)/* : QueryResult<Value> */ {
        if (q.prefix && this.prefix.toString() !== "/") {
            return super.query(Object.assign({}, q, {
                prefix: this.prefix.child(new Key(q.prefix)).toString()
            }));
        }
        return super.query(q);
    }
}
