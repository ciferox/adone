// Service requirements:
// 1. Each service should be in its own directory.
// 2. File index.js can obviously export one or more netron-contexts (default exports it not allowed).
// 3. Сonfiguration for each service must be placed in meta.json with folowing format:.
//    {
//        "description": String,
//        "enabled": Boolean,
//        "dependencies": Array,
//        "contexts": [
//            {
//                "id": String,
//                "class": String, // format: "filename[.ext]:classname"
//                "default": Boolean,
//                "options": Object
//            }
//        ]
//    }
//
// Service:
//   description (optional) - Service description.
//   enabled - Should be service enabled or disabled. Disabled services cannot be started.
//   dependencies (optional) - List of dependent services.
//   contexts - List of exposed contexts
//
// Context:
//   id - ID of context. If ID starts with '.', then full context ID wiil be 'name.id'.
//   class - Name of the context's class exported from index.js.
//   default - Indicates that the context is default (only one context can be default).
//   options (optional) - context-specific options (changable in user-defined configuration).
//

export default class Services {
    constructor(omnitron) {
        this.o = omnitron;
    }
}
