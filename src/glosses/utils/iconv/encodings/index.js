
const { util } = adone;

const modules = [
    require("./internal"),
    require("./utf16"),
    require("./utf7"),
    require("./sbcs_codec"),
    require("./sbcs_data"),
    require("./sbcs_data_generated"),
    require("./dbcs_codec"),
    require("./dbcs_data")
];

// Put all encoding/alias/codec definitions to single object and export it.
for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    for (const enc of util.keys(module)) {
        exports[enc] = module[enc];
    }
}
