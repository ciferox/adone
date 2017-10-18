const {
    is
} = adone;

// export class WeakOmnitron extends adone.omnitron.Omnitron {
//     constructor(options) {
//         super(options);
//         this._.configuration = new adone.omnitron.Configuration(this, { inMemory: true });
//     }

//     async initialize() {
//         await this._.configuration.load();
//         this.config.omnitron = {
//             servicesPath: adone.std.path.join(process.env.ADONE_HOME, "services"),
//             gates: [
//                 {
//                     id: "local",
//                     type: "socket",
//                     status: adone.omnitron.const.ENABLED,
//                     port: adone.netron.DEFAULT_PORT
//                 }
//             ],
//             services: {
//                 omnitron: {
//                     description: "Omnitron service",
//                     path: __dirname,
//                     status: adone.omnitron.const.ENABLED,
//                     contexts: [
//                         {
//                             id: "omnitron",
//                             class: "Omnitron",
//                             default: true
//                         }
//                     ]
//                 }
//             },
//             getServicePath(serviceName, dirName) {
//                 let fullPath;
//                 if (is.string(dirName)) {
//                     fullPath = adone.std.path.join(this.servicesPath, serviceName, dirName);
//                 } else {
//                     fullPath = adone.std.path.join(this.servicesPath, serviceName);
//                 }

//                 return adone.fs.mkdirp(fullPath).then(() => fullPath);
//             }
//         };
//         // await this.createPidFile();

//         // await adone.fs.mkdirp(this.config.omnitron.servicesPath);

//         await this.initializeNetron({ isSuper: true });

//         this._.contexts = new Contexts(this);
//         await this._.contexts.initialize();
        
//         await this.attachServices();

//         // await this._.configuration.saveServicesConfig();
//     }

//     async uninitialize() {
//         await this.detachServices();

//         // await this._.configuration.saveServicesConfig();

//         // Let netron gracefully complete all disconnects
//         await adone.promise.delay(500);

//         await this.uninitializeNetron();

//         // return this.deletePidFile();
//     }

//     addServiceConfig(serviceName, conf) {
//         this.config.omnitron.services[serviceName] = conf;
//     }

//     removeServiceConfig(serviceName) {
//         delete this.config.omnitron.services[serviceName];
//     }
// }

export default class OmnitronRunner {
    async cleanHome() {
        await new adone.fs.Directory(adone.homePath).clean();
    }

    get dispatcher() {
        if (is.undefined(this._dispatcher)) {
            this._dispatcher = new adone.omnitron.Dispatcher();
        }
        return this._dispatcher;
    }

    async startOmnitron() {
        return this.dispatcher.start();
    }

    async stopOmnitron({ clean = false, killChildren = true } = {}) {
        await this.dispatcher.kill({ killChildren });
        if (clean) {
            return this.cleanHome();
        }
    }

    async restartOmnitron({ killChildren = false } = {}) {
        await this.stopOmnitron({ clean: false, killChildren });
        await this.startOmnitron();
    }

    getInterface(name) {
        return this.dispatcher.getInterface(name);
    }
}
