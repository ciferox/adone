import { schemas, userGroup, adminGroup } from "./defaults";
import Group from "./group";
import User from "./user";
import Session from "./session";
const { is, netron: { decorator: { Contextable, Description, Public, Private, Type } }, vendor: { lodash: _ } } = adone;

@Contextable
@Private
@Description("User context")
export default class Auth {
    constructor(omnitron) {
        this.options = {
            datastore: {
                filename: "auth"
            }
        };
        this.omnitron = omnitron;
        this.netron = omnitron._.netron;

        this.userGroup = null;
        this.adminGroup = null;

        this.sessions = new Map();
        this.users = new Map();
        this.groups = new Map();
    }

    async initialize() {
        const iDatabase = await this.omnitron.context("db");
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
            startTm: adone.datetime().unix()
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
