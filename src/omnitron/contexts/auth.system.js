import { userGroup, adminGroup } from "./auth/defaults";
import Auth from "./auth";
import User from "./auth/user";
import Group from "./auth/group";

const { is, netron: { decorator: { Contextable, Description, Public, Private, Type, Property, Method } } } = adone;

@Private
@Contextable
@Description("System context")
@Property("groups", { private: false, readonly: true, type: Map, description: "In-memory map of groups" })
@Property("users", { private: false, readonly: true, type: Map, description: "In-memory map of users" })
@Property("sessions", { private: false, readonly: true, type: Map, description: "In-memory map of sessions" })
@Method("addUser", { private: false, description: "Adds a new user and returns it id", type: String })
@Method("addGroup", { private: false, description: "Adds a new group and returns group id", type: Group })
@Method("getGroupByName", { private: false, description: "Returns group by name", type: Group })
export default class SystemAuth extends Auth {
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
