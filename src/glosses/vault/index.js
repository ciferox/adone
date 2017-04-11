// Store semantics:
// vids - Array of valuable identifiers
// v:{id} - Metadata of valuable with id 
// tids - Array of tag identifiers
// t:{id} - Metadata of tag with id
// v:{id}:{kid} - Metadata of valuable item with id
// nextValuableId - Identifier for new valuable
// nextTagId - Identifier for new tag

adone.lazify({
    _: () => ({
        valuable: (id) => `v:${id}`,
        tag: (id) => `t:${id}`,
        vkey: (vid, kid) => `v:${vid}:${kid}`,
        vvalue: (vid, kid) => `v:${vid}:${kid}:`
    }),
    Vault: "./vault",
    Valuable: "./valuable"
}, exports, require);
