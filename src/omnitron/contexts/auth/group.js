const { netron: { decorator: { Contextable, Description, Public, Private, Type } } } = adone;

@Contextable
@Private
@Description("Group")
class Group {
    constructor(auth, groupData) {
        this.id = groupData._id;
        this.data = groupData;
        this.auth = auth;
        this.schema = auth.schemas.group;
        this.iDs = auth.iDs;
    }

    @Public
    @Description("Returns group's id")
    @Type(String)
    getId() {
        return this.data._id;
    }

    @Public
    @Description("Renames group")
    @Type(Number)
    async setName(name) {
        if (name === this.data.name) {
            return 1;
        }
        name = await this._validateField("name", name);
        const status = await this._update({ $set: { name } });
        this.data.name = name;
        return status;
    }

    @Public
    @Description("Returns group's name")
    @Type(Number)
    getName() {
        return this.data.name;
    }

    @Public
    @Description("Update description")
    @Type(Number)
    async setDescription(description) {
        if (description === this.data.description) {
            return 1;
        }
        description = await this._validateField("description", description);
        const status = await this._update({ $set: { description } });
        this.data.description = description;
        return status;
    }

    @Public
    @Description("Returns description")
    @Type(String)
    getDescription() {
        return this.data.description;
    }

    @Public
    @Description("Update contexts")
    @Type(Number)
    async setContexts(contexts) {
        contexts = await this._validateField("contexts", contexts);
        const status = this._update({ $set: { contexts } });
        this.data.contexts = contexts;
        return status;
    }

    @Public
    @Description("Returns contexts")
    @Type(Array)
    getContexts() {
        return this.data.contexts;
    }

    async _update(update) {
        const result = await this.iDs.update({ _id: this.id, _type: "group" }, update);
        if (result[0] === 0) {
            throw new adone.x.NotExists("Group not exists");
        }
        return result;
    }

    _validateField(key, value) {
        return this.auth._validateField("group", this.schema, key, value);
    }
}

export default Group; // code generator fails when export + class decorator, todo: fix
