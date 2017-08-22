export default function parseAdapter(DB, name, opts) {
    const match = name.match(/([a-z-]*):\/\/(.*)/);
    if (match) {
        // the http adapter expects the fully qualified name
        return {
            name: /https?/.test(match[1]) ? `${match[1]}://${match[2]}` : match[2],
            adapter: match[1]
        };
    }

    const adapters = DB.adapters;
    const preferredAdapters = DB.preferredAdapters;
    const prefix = DB.prefix;
    let adapterName = opts.adapter;

    if (!adapterName) { // automatically determine adapter
        for (let i = 0; i < preferredAdapters.length; ++i) {
            adapterName = preferredAdapters[i];
            // check for browsers that have been upgraded from websql-only to websql+idb
            /* istanbul ignore if */
            break;
        }
    }

    const adapter = adapters[adapterName];

    // if adapter is invalid, then an error will be thrown later
    const usePrefix = (adapter && "use_prefix" in adapter) ?
        adapter.use_prefix : true;

    return {
        name: usePrefix ? (prefix + name) : name,
        adapter: adapterName
    };
}
