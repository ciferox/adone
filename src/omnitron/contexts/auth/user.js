const { is, netron: { decorator: { Contextable, Description, Public, Private, Type } } } = adone;

@Contextable
@Private
@Description("User")
class User {
    constructor(auth, userData) {
        this.id = userData._id;
        this.data = userData;
        this.auth = auth;
        this.schema = auth.schemas.user;
        this.iDs = auth.iDs;
    }

    @Public
    @Description("Returns user's id")
    @Type(String)
    getId() {
        return this.data._id;
    }

    @Public
    @Description("Renames user")
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
    @Description("Returns user's name")
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
    @Description("Update status")
    @Type(Number)
    async setStatus(status) {
        if (status === this.data.status) {
            return 1;
        }
        status = await this._validateField("status", status);
        const updateStatus = this._update({ $set: { status } });
        this.data.status = status;
        return updateStatus;
    }

    @Public
    @Description("Returns status")
    @Type(String)
    getStatus() {
        return this.data.status;
    }

    @Public
    @Description("Update email")
    @Type(Number)
    async setEmail(email) {
        if (email === this.data.email) {
            return 1;
        }
        email = await this._validateField("email", email);
        const status = this._update({ $set: { email } });
        this.data.email = email;
        return status;
    }

    @Public
    @Description("Returns email")
    @Type(String)
    getEmail() {
        return this.data.email;
    }

    @Public
    @Description("Update password")
    @Type(Number)
    async setPassword(password, oldPassword) {
        if (is.nil(oldPassword)) {
            throw new adone.x.InvalidArgument("Old password should be specified");
        }
        await this.auth._validateField("user", this.schema, "password", oldPassword, false);
        const formatType = this.schema.password.options.type;
        if (formatType === "plain") {
            if (this.data.password !== oldPassword) {
                throw new adone.x.NotValid("Incorrect old password");
            }
        } else if (formatType === "hash") {
            const verified = await adone.crypto.password.verify(oldPassword, this.data.password);
            if (!verified) {
                throw new adone.x.NotValid("Incorrect old password");
            }
        }
        password = await this._validateField("password", password);
        const status = this._update({ $set: { password } });
        this.data.password = password;
        return status;
    }

    async _update(update) {
        const result = await this.iDs.update({ _id: this.id, _type: "user" }, update);
        if (result[0] === 0) {
            throw new adone.x.NotExists("User not exists");
        }
        return result[0];
    }

    _validateField(key, value) {
        return this.auth._validateField("user", this.schema, key, value);
    }
}

export default User; // code generator fails when export + class decorator, todo: fix
