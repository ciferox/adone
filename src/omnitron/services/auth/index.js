import { schemas, userGroup, adminGroup } from "./defaults";
const { is, netron: { contextable, decorator: { Contextable, Description, Public, Private, Type, Property, Method } }, vendor: { lodash: _ } } = adone;

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

@Contextable
@Private
@Description("User session")
class Session {
    constructor(auth, sessionData) {
        this.auth = auth;
        this.data = sessionData;
        this.id = sessionData._id;
    }

    @Public
    @Description("Close user session")
    async logout() {
        await this.auth.iDs.remove({ _id: this.id, _type: "session" });
        this.auth._releaseSession(this.id);
    }

    @Public
    @Description("Returns user's session key")
    getKey() {
        return this.data.key;
    }
}

@Contextable
@Private
@Description("User context")
export class Auth {
    constructor(options) {
        this.options = options;
        this.omnitron = options.omnitron;
        this.netron = options.netron;

        this.userGroup = null;
        this.adminGroup = null;

        this.sessions = new contextable.Map();
        this.users = new contextable.Map();
        this.groups = new contextable.Map();
    }

    async initialize() {
        const iDatabase = this.omnitron.getInterface("database");
        this.iDs = await iDatabase.getDatastore(this.options.datastore);

        // Load schemas
        this.schemas = _.merge({}, schemas);
        this.userSchema = this.schemas.user;
        this.groupSchema = this.schemas.group;
        this.loginSchema = {};
        for (const [field, meta] of adone.util.entries(this.userSchema)) {
            if (meta.login) {
                this.loginSchema[field] = meta;
            }
        }
        this.registerSchema = {};
        for (const [field, meta] of adone.util.entries(this.userSchema)) {
            if (meta.register) {
                this.registerSchema[field] = meta;
            }
        }

        // Create/load default groups.
        try {
            this.userGroup = await this.getGroupByName(userGroup.name);
        } catch (err) {
            this.userGroup = await this.addGroup(userGroup);
        }

        try {
            this.adminGroup = await this.getGroupByName(adminGroup.name);
        } catch (err) {
            this.adminGroup = await this.addGroup(adminGroup);
        }
    }

    uninitialize() {

    }

    @Public
    @Description("Registers new user")
    async register(data) {
        const query = { _type: "user" };
        for (const [field, value] of adone.util.entries(this.registerSchema)) {
            const dataValue = data[field];
            if (is.nil(dataValue)) {
                throw new adone.x.NotFound(`Field ${field} must be specified`);
            }
            await this._validateField("user", this.registerSchema, field, dataValue, false);
            if (value.unique) {
                query[field] = dataValue;
            }
        }

        const count = await this.iDs.count(query);
        if (count === 1) {
            throw new adone.x.NotAllowed("User with such credentials already exists");
        }

        for (const field of Object.keys(data)) {
            if (!is.propertyDefined(this.registerSchema, field)) {
                delete data[field];
            }
        }

        await this.addUser(data, userGroup.name);
    }

    @Public
    @Description("Attempts to authenticate user by specified user credentials and if user is valid creates user session object and returns public user key.")
    @Type(String)
    async login(data) {
        const query = { _type: "user" };
        for (const [field, value] of adone.util.entries(this.loginSchema)) {
            const dataValue = data[field];
            if (is.nil(dataValue)) {
                throw new adone.x.NotFound(`Field ${field} must be specified`);
            }
            await this._validateField("user", this.loginSchema, field, dataValue, false);
            if (value.unique) {
                query[field] = dataValue;
            }
        }

        const userData = await this.iDs.findOne(query);
        if (is.null(userData)) {
            throw new adone.x.NotAllowed("Incorrect login data");
        }
        if (userData.status !== "Enabled") {
            throw new adone.x.NotAllowed("Account is disabled");
        }
        if (is.propertyDefined(data, "password")) {
            const verified = await adone.crypto.password.verify(data.password, userData.password);
            if (!verified) {
                throw new adone.x.NotAllowed("Incorrect login data");
            }
        }

        // Looking for existing session for this user.
        for (const session of this.sessions.values()) {
            if (session.userId === userData._id) {
                return session;
            }
        }

        let sessionData = {
            _type: "session",
            userId: userData._id,
            key: adone.text.random(64),
            start_tm: adone.date().unix()
        };

        sessionData = await this.iDs.insert(sessionData);
        return this.createAndCacheSession(sessionData);
    }

    @Public
    @Description("Returns user's session by user key")
    @Type(Session)
    async getSessionByKey(sessionKey) {
        const sessionData = await this._getSessionByKey(sessionKey);
        let session = this.sessions.get(sessionData._id);
        if (is.undefined(session)) {
            session = this.createAndCacheSession(sessionData);
        }
        return session;
    }

    async addGroup(data) {
        let groupData = await this._validateData("group", data, this.schemas.group);
        groupData._type = "group";
        groupData = await this.iDs.insert(groupData);
        return this.createAndCacheGroup(groupData);
    }

    async addUser(data, groupName) {
        if (is.string(groupName)) {
            data.group = groupName;
        }
        let userData = await this._validateData("user", data, this.schemas.user);
        const group = await this.getGroupByName(userData.group);
        userData.groupId = group.id;
        userData._type = "user";
        delete userData.group;
        userData = await this.iDs.insert(userData);
        const user = this.createAndCacheUser(userData);
        return user;
    }

    async getGroupByName(name) {
        const query = { name, _type: "group" };
        const groupData = await this.iDs.findOne(query);
        if (is.null(groupData)) {
            throw new adone.x.NotExists("Group not exists");
        }
        let group = this.getCachedGroup(groupData._id);
        if (is.undefined(group)) {
            group = this.createAndCacheGroup(groupData);
        }
        return group;
    }

    getSessionByUserId(userId) {
        for (const session of this.sessions.values()) {
            if (userId === session.userId) {
                return session;
            }
        }
        throw new adone.x.NotExists("No such session");
    }

    async getUserById(_id) {
        let user = this.getCachedUser(_id);
        if (is.undefined(user)) {
            const query = { _id, _type: "user" };
            const userData = await this.iDs.findOne(query);
            if (userData === null) {
                throw new adone.x.NotExists("User not exists");
            }
            user = this.createAndCacheUser(userData);
        }

        return user;
    }

    async getUserByEmail(email) {
        let user = await this.getCachedUserByEmail(email);
        if (is.undefined(user)) {
            const query = { email, _type: "user" };
            const userData = await this.iDs.findOne(query);
            if (userData === null) {
                throw new adone.x.NotExists("User not exists");
            }
            user = this.createAndCacheUser(userData);
        }

        return user;
    }

    createAndCacheUser(userData) {
        const user = new User(this, userData);
        this.users.set(userData._id, user);
        return user;
    }

    createAndCacheGroup(groupData) {
        const group = new Group(this, groupData);
        this.groups.set(groupData._id, group);
        return group;
    }

    createAndCacheSession(sessionData) {
        const session = new Session(this, sessionData);
        this.sessions.set(sessionData._id, session);
        return session;
    }

    getCachedUser(userId) {
        return this.users.get(userId);
    }

    getCachedSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    async getCachedUserByEmail(email) {
        for (const user of this.users.values()) {
            const userEmail = await user.getEmail();
            if (email === userEmail) {
                return user;
            }
        }
    }

    getCachedGroup(groupId) {
        return this.groups.get(groupId);
    }

    async _getSessionByKey(key) {
        const query = { key, _type: "session" };
        const sessionData = await this.iDs.findOne(query);
        if (sessionData === null) {
            throw new adone.x.NotExists("Session not exists");
        }
        return sessionData;
    }

    _releaseSession(sessionId) {
        const session = this.getCachedSession(sessionId);
        if (!is.undefined(session)) {
            this.netron.releaseContext(session);
            this.users.delete(sessionId);
        }
    }

    async _validateData(type, data, schema) {
        const doc = {};

        for (const [field, meta] of adone.util.entries(schema)) {
            if (meta.required && !is.propertyDefined(data, field)) {
                throw new adone.x.NotFound(`Required field '${field}' is undefined`);
            } else if (!meta.required && !is.propertyDefined(data, field) && is.propertyDefined(meta, "default")) {
                doc[field] = meta.default;
                continue;
            }

            const fieldValue = data[field];
            doc[field] = await this._validateField(type, schema, field, fieldValue);
        }

        return doc;
    }

    async _validateField(type, schema, field, fieldValue, checkUniqueness = true) {
        if (!is.propertyDefined(schema, field)) {
            throw new adone.x.Unknown(`Unknown field '${field}`);
        }
        const meta = schema[field];
        switch (meta.type) {
            case "string": {
                if (!is.string(fieldValue) || fieldValue.length === 0) {
                    throw new adone.x.NotValid(`'${fieldValue}' is not valid string`);
                }
                break;
            }
            case "array": {
                if (!is.array(fieldValue)) {
                    throw new adone.x.NotValid(`'${fieldValue}' is not an array`);
                }
                break;
            }
            case "email": {
                if (!is.string(fieldValue) || !fieldValue.includes("@")) {
                    throw new adone.x.NotValid(`'${fieldValue}' is not valid email`);
                }
                break;
            }
            case "password": {
                if (!is.string(fieldValue) || fieldValue.length === 0) {
                    throw new adone.x.NotValid(`'${fieldValue}' is not valid password`);
                }
                if (is.number(meta.options.minLength) && fieldValue.length < meta.options.minLength) {
                    throw new adone.x.NotValid(`Minimum allowed password length is ${meta.options.minLength} chars`);
                }
                if (is.number(meta.options.maxLength) && fieldValue.length > meta.options.maxLength) {
                    throw new adone.x.NotValid(`Maximum allowed password length is ${meta.options.maxLength} chars`);
                }
                if (meta.options.type === "hash") {
                    fieldValue = await adone.crypto.password.hash(fieldValue);
                }
                break;
            }
            case "enum": {
                if (is.string(fieldValue) && fieldValue.length !== 0) {
                    if (!meta.values.includes(fieldValue)) {
                        throw new adone.x.NotValid(`'${fieldValue}' is not valid enum value`);
                    }
                } else if (is.number(fieldValue)) {
                    if (fieldValue < 0 || fieldValue >= meta.values.length) {
                        throw new adone.x.NotValid(`'${fieldValue}' is not valid enum value`);
                    }
                    fieldValue = meta.values[fieldValue];
                } else {
                    throw new adone.x.NotValid(`'${fieldValue}' is not valid enum value`);
                }
                break;
            }
        }

        if (meta.unique && checkUniqueness) {
            const doc = {};
            doc[field] = fieldValue;
            doc._type = type;
            const existingCount = await this.iDs.count(doc);
            if (existingCount !== 0) {
                throw new adone.x.Exists(`Object with field '${fieldValue}' already exists`);
            }
        }
        return fieldValue;
    }
}

@Private
@Contextable
@Description("System context")
@Property("groups", { private: false, readonly: true, type: contextable.Map, description: "In-memory map of groups" })
@Property("users", { private: false, readonly: true, type: contextable.Map, description: "In-memory map of users" })
@Property("sessions", { private: false, readonly: true, type: contextable.Map, description: "In-memory map of sessions" })
@Method("addUser", { private: false, description: "Adds a new user and returns it id", type: String })
@Method("addGroup", { private: false, description: "Adds a new group and returns group id", type: Group })
@Method("getGroupByName", { private: false, description: "Returns group by name", type: Group })
export class SystemAuth extends Auth {

    // ---==== GROUPS ====--- //

    @Public
    @Description("Returns group's schema")
    getGroupSchema() {
        return this.schemas.group;
    }

    @Public
    @Description("Returns group by id")
    @Type(Group)
    async getGroupById(_id) {
        const query = { _id, _type: "group" };
        const groupData = await this.iDs.findOne(query);
        if (groupData === null) {
            throw new adone.x.NotExists("Group not exists");
        }
        let group = this.getCachedGroup(_id);
        if (is.undefined(group)) {
            group = this.createAndCacheGroup(groupData);
        }
        return group;
    }

    @Public
    @Description("Returns all groups")
    async getAllGroups() {
        const query = { _type: "group" };
        const groupDatas = await this.iDs.find(query);
        const groups = new adone.netron.Definitions();

        for (const gd of groupDatas) {
            let group = this.getCachedGroup(gd._id);
            if (is.undefined(group)) {
                group = this.createAndCacheGroup(gd);
            }
            groups.push(group);
        }

        return groups;
    }

    @Public
    @Description("Returns list of all groups")
    @Type(Array)
    listGroups(query) {
        query = (is.object(query) ? query : {});
        query._type = "group";
        return this.iDs.find(query);
    }

    @Public
    @Description("Returns list of group names")
    @Type(Array)
    async listGroupNames(query) {
        const groupDatas = await this.listGroups(query);
        return groupDatas.map((g) => g.name);
    }

    @Public
    @Description("Removes an existing group by id")
    async removeGroupById(_id) {
        const count = await this.iDs.remove({ _id, _type: "group" });
        if (count === 0) {
            throw new adone.x.NotExists("Group not exists");
        }

        this._releaseGroup(_id);
        return count;
    }

    @Public
    @Description("Removes an existing group by id")
    async removeGroupByName(name) {
        const groupData = await this.iDs.findOne({ name, _type: "group" });
        if (is.null(groupData)) {
            throw new adone.x.NotExists("Group not exists");
        }
        const count = await this.iDs.remove({ _id: groupData._id, _type: "group" });
        if (count === 0) {
            throw new adone.x.NotExists("Group not exists");
        }
        this._releaseGroup(groupData._id);
        return count;
    }

    @Public
    @Description("Removes all groups except defaults")
    async removeAllGroups() {
        const count = await this.iDs.remove({ _type: "group", name: { $nin: [userGroup.name, adminGroup.name] } }, { multi: true });

        for (const groupId of this.groups.keys()) {
            this._releaseGroup(groupId);
        }

        return count;
    }

    // ---==== USERS ====--- //

    @Public
    @Description("Returns user's schema")
    getUserSchema() {
        return this.schemas.user;
    }

    @Public
    @Description("Returns user by id")
    @Type(User)
    getUserById(_id) {
        return super.getUserById(_id);
    }

    @Public
    @Description("Returns user by email")
    @Type(User)
    async getUserByEmail(email) {
        const query = { email, _type: "user" };
        const userData = await this.iDs.findOne(query);
        if (is.null(userData)) {
            throw new adone.x.NotExists("User not exists");
        }
        let user = this.getCachedUser(userData._id);
        if (is.undefined(user)) {
            user = this.createAndCacheUser(userData);
        }
        return user;
    }

    @Public
    @Description("Returns user by session key")
    @Type(User)
    async getUserBySessionKey(sessionKey) {
        const sessionData = await this._getSessionByKey(sessionKey);
        return this.getUserById(sessionData.userId);
    }

    @Public
    @Description("Returns list of users")
    @Type(Array)
    async listUsers(query) {
        query = (is.object(query) ? query : {});
        query._type = "user";
        if (is.propertyDefined(query, "group")) {
            try {
                const group = await this.getGroupByName(query.group);
                query.groupId = group.id;
                delete query.group;
            } catch (err) {
                return [];
            }
        }
        return this.iDs.find(query);
    }

    @Public
    @Description("Returns list of emails")
    @Type(Array)
    async listEmails(query) {
        const userDatas = await this.listUsers(query);
        return userDatas.map((u) => u.email);
    }

    @Public
    @Description("Deletes as existing user by id")
    async removeUserById(_id) {
        const query = { _id, _type: "user" };
        const count = await this.iDs.remove(query);
        if (count === 0) {
            throw new adone.x.NotExists("User not exists");
        }
        this._releaseUser(_id);
        return count;
    }

    @Public
    @Description("Deletes as existing user by email")
    async removeUserByEmail(email) {
        const query = { email, _type: "user" };
        const userData = await this.iDs.findOne(query);
        if (is.null(userData)) {
            throw new adone.x.NotExists("User not exists");
        }
        const count = this.iDs.remove(query);
        if (count === 0) {
            throw new adone.x.NotExists("User not exists");
        }
        this._releaseUser(userData._id);
        return count;
    }

    @Public
    @Description("Removes all users")
    removeAllUsers() {
        const count = this.iDs.remove({ _type: "user" }, { multi: true });

        for (const userId of this.users.keys()) {
            this._releaseUser(userId);
        }

        return count;
    }

    // ---==== SESSIONS ====--- //

    @Public
    @Description("Returns list of sessions")
    @Type(Array)
    listSessions(query) {
        query = (is.object(query) ? query : {});
        query._type = "session";
        return this.iDs.find(query);
    }

    @Public
    @Description("Removes all sessions")
    removeAllSessions() {
        return this.iDs.remove({ _type: "session" }, { multi: true });
    }

    _releaseUser(userId) {
        const user = this.getCachedUser(userId);
        if (!is.undefined(user)) {
            this.netron.releaseContext(user);
            this.users.delete(userId);
        }
    }

    _releaseGroup(groupId) {
        if (groupId === this.userGroup.getId() || groupId === this.adminGroup.getId()) {
            return 0;
        }
        const group = this.getCachedGroup(groupId);
        if (!is.undefined(group)) {
            this.netron.releaseContext(group);
            this.groups.delete(groupId);
        }
        return 1;
    }
}
