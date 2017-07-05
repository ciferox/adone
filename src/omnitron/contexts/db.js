const { is } = adone;
const { Contextable, Private, Public, Description, Type, Args, Method } = adone.netron.decorator;

@Contextable
@Private
@Description("Datastore/collection weak context")
@Method("load", { private: false, description: "Loads the database from the datafile, and trigger the execution of buffered commands if any" })
@Method("insert", { private: false, description: "Inserts a new document or documents in collection", type: Object })
@Method("update", { private: false, description: "Updates documents matching the query" })
@Method("find", { private: false, description: "Finds all documents matching the query", args: [String, Object, Object], type: Array })
@Method("findOne", { private: false, description: "Finds one document matching the query", args: [String, Object, Object], type: Object })
@Method("count", { private: false, description: "Counts all documents matching the query", args: [String, Object], type: Number })
@Method("remove", { private: false, description: "Removes all documents matching the query", args: [String, Object], type: Number })
class Datastore extends adone.database.local.Datastore {
    @Public
    @Description("Prepares and executes a cursor using the find request")
    execFind(query, ...args) {
        let cursor = super.find(query, {}, { exec: false });
        for (let i = 0; i < args.length; i += 2) {
            cursor = cursor[args[i]](args[i + 1]);
        }
        return cursor.exec();
    }

    @Public
    @Description("Prepares and executes using the count request")
    execCount(query, ...args) {
        let cursor = super.count(query, { exec: false });
        for (let i = 0; i < args.length; i += 2) {
            cursor = cursor[args[i]](args[i + 1]);
        }
        return cursor.exec();
    }
}

@Contextable
@Private
@Description("Database context")
class Database {
    constructor(omnitron) {
        this.omnitron = omnitron;
        this._datastores = new Map();
    }

    async initialize() {
        this.dataPath = await this.omnitron.config.omnitron.getServicePath("db", "stores");
    }

    uninitialize() {

    }

    @Public
    @Description("Returns datastore described in 'options' argument as interface")
    @Args(Object)
    @Type(Datastore)
    async getDatastore(options) {
        options = adone.vendor.lodash.merge({}, options);
        if (!is.propertyDefined(options, "filename")) {
            throw new adone.x.NotSupported("In-memory datastores not supported");
        }
        options.filename = adone.std.path.resolve(this.dataPath, `${adone.std.path.basename(options.filename)}.db`);
        let ds = this._datastores.get(options.filename);
        if (is.undefined(ds)) {
            ds = new Datastore(options);
            await ds.load();
            this._datastores.set(options.filename, ds);
        }
        return ds;
    }

    @Public
    @Description("Deletes datastore from filesystem")
    @Args(String)
    deleteDatastore(name) {
        const path = adone.std.path.resolve(this.dataPath, `${adone.std.path.basename(name)}.db`);
        const ds = this._datastores.get(path);
        if (!is.undefined(ds)) {
            this._datastores.delete(path);
            this.omnitron._.netron.releaseContext(ds);
            return adone.fs.rm(path);
        }
    }
}

export default Database; // code generator fails when export + class decorator, todo: fix
