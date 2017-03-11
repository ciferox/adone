import OmnitronRunner from "../runner";
import { schemas, userGroup, adminGroup } from "omnitron/services/auth/defaults";
const { is } = adone;
const srandom = adone.text.random;

let groupIndex = 0;
let emailIndex = 0;
function getNextGroupName() {
    return `Group${++groupIndex}`;
}

function getNextEmail() {
    return `email${++emailIndex}@ciferox.com`;
}

describe("Auth service", () => {
    let omnitronRunner;
    let iSystemAuth;
    let iAuth;
    let userSchema;
    let groupSchema;

    async function addGroup({ name = true, description = true, contexts = true } = {}) {
        const groupData = adone.o();

        if (is.string(name)) {
            groupData.name = name;
        } else if (name === true) {
            groupData.name = getNextGroupName();
        }

        if (is.string(description)) {
            groupData.description = description;
        } else if (description === true) {
            groupData.description = srandom(128);
        }

        if (is.array(contexts)) {
            groupData.contexts = contexts;
        } else if (contexts === true) {
            groupData.contexts = [srandom(5), srandom(5), srandom(5)];
        }

        const iGroup = await iSystemAuth.addGroup(groupData);
        return { iGroup, groupData };
    }

    async function addUser({ name = true, email = true, group = true, status = "Enabled", description = true, password = true } = {}) {
        const userData = adone.o();

        if (is.string(name)) {
            userData.name = name;
        } else if (name === true) {
            userData.name = srandom(8);
        }

        if (is.string(email)) {
            userData.email = email;
        } else if (email === true) {
            userData.email = getNextEmail();
        }

        if (is.string(description)) {
            userData.description = description;
        } else if (description === true) {
            userData.description = srandom(128);
        }

        if (is.string(group)) {
            userData.group = group;
        } else if (group === true) {
            userData.group = srandom(12);
        }

        if (is.string(status)) {
            userData.status = status;
        } else if (status === true) {
            userData.status = srandom(8);
        }

        if (is.string(password)) {
            userData.password = password;
        } else if (password === true) {
            userData.password = srandom(32);
        }

        const iUser = await iSystemAuth.addUser(userData);
        return { userData, iUser };
    }

    async function registerUser({ email = true, name = true, password = true, status } = {}) {
        const userData = adone.o();

        if (is.string(name)) {
            userData.name = name;
        } else if (name === true) {
            userData.name = srandom(8);
        }

        if (is.string(email)) {
            userData.email = email;
        } else if (email === true) {
            userData.email = getNextEmail();
        }

        if (is.string(password)) {
            userData.password = password;
        } else if (password === true) {
            userData.password = srandom(32);
        }

        if (is.string(status)) {
            userData.status = status;
        }

        await iAuth.register(userData);

        return userData;
    }

    before(async function () {
        this.timeout(10000);

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.run();
        omnitronRunner.createDispatcher();
        await omnitronRunner.startOmnitron();
        await omnitronRunner.dispatcher.enable("database");
        await omnitronRunner.dispatcher.enable("auth");
        await omnitronRunner.dispatcher.start("auth");
        await adone.promise.delay(100);
        iSystemAuth = omnitronRunner.getInterface("auth.system");
        iAuth = omnitronRunner.getInterface("auth");
        userSchema = schemas.user;
        groupSchema = schemas.group;
    });

    after(async () => {
        await omnitronRunner.stopOmnitron();
    });

    describe("Schemas", () => {
        it("user schema must be invariable", async () => {
            assert.deepEqual(userSchema, await iSystemAuth.getUserSchema());
        });

        it("group schema must be invariable", async () => {
            assert.deepEqual(groupSchema, await iSystemAuth.getGroupSchema());
        });
    });

    describe("Groups", () => {
        it("initially two default groups must be exist", async () => {
            const groups = await iSystemAuth.listGroups();
            assert.isOk(groups.length === 2);
            let userGroupData;
            let adminGroupData;
            if (groups[0].name === userGroup.name) {
                userGroupData = groups[0];
                adminGroupData = groups[1];
            } else {
                userGroupData = groups[1];
                adminGroupData = groups[0];
            }

            assert.equal(userGroup.name, userGroupData.name);
            assert.equal(userGroup.description, userGroupData.description);
            assert.sameMembers(userGroup.contexts, userGroupData.contexts);

            assert.equal(adminGroup.name, adminGroupData.name);
            assert.equal(adminGroup.description, adminGroupData.description);
            assert.sameMembers(adminGroup.contexts, adminGroupData.contexts);
        });

        it("group interface should be singleton", async () => {
            const { iGroup, groupData } = await addGroup({});
            const iGroup1 = await iSystemAuth.getGroupByName(groupData.name);
            const iGroup2 = await iSystemAuth.getGroupById(await iGroup.getId());
            assert.equal(iGroup.$def.id, iGroup1.$def.id);
            assert.equal(iGroup1.$def.id, iGroup2.$def.id);
        });

        it("add group with all fields", async () => {
            const { iGroup, groupData } = await addGroup({});
            assert.equal(await iGroup.getName(), groupData.name);
            assert.equal(await iGroup.getDescription(), groupData.description);
            assert.sameMembers(await iGroup.getContexts(), groupData.contexts);
        });

        it("add group using defaults", async () => {
            const { iGroup, groupData } = await addGroup({ description: false });
            assert.equal(await iGroup.getName(), groupData.name);
            assert.equal(await iGroup.getDescription(), groupSchema.description.default);
            assert.sameMembers(await iGroup.getContexts(), groupData.contexts);
        });

        it("add group without required field", async () => {
            try {
                await addGroup({ description: false, contexts: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("addGroup not throws any exception");
        });

        it("add group with same unique field", async () => {
            const groupName = getNextGroupName();

            try {
                await addGroup({ name: groupName });
                await addGroup({ name: groupName, contexts: ["ctx1"] });
            } catch (err) {
                assert.isOk(err instanceof adone.x.Exists);
                return;
            }
            assert.fail("should throw exception");
        });

        it("get group by id", async () => {
            const { iGroup } = await addGroup({});
            const iSameGroup = await iSystemAuth.getGroupById(await iGroup.getId());
            assert.equal(await iGroup.getId(), await iSameGroup.getId());
            assert.equal(await iGroup.getName(), await iSameGroup.getName());
            assert.equal(await iGroup.getDescription(), await iSameGroup.getDescription());
            assert.sameMembers(await iGroup.getContexts(), await iSameGroup.getContexts());
        });

        it("get group by name", async () => {
            const { iGroup, groupData } = await addGroup({});
            const iSameGroup = await iSystemAuth.getGroupByName(groupData.name);
            assert.equal(await iGroup.getId(), await iSameGroup.getId());
            assert.equal(await iGroup.getName(), await iSameGroup.getName());
            assert.equal(await iGroup.getDescription(), await iSameGroup.getDescription());
            assert.sameMembers(await iGroup.getContexts(), await iSameGroup.getContexts());
        });

        it("list groups", async () => {
            const { groupData } = await addGroup({});
            const groups = await iSystemAuth.listGroups();
            const groupNames = await iSystemAuth.listGroupNames();
            assert.isOk(groups.length > 1 && groupNames.length === groups.length);
            assert.isOk(groupNames.includes(groupData.name));
        });

        it("remove group by id", async () => {
            const { iGroup } = await addGroup({});
            const groupId = await iGroup.getId();
            const count = await iSystemAuth.removeGroupById(groupId);
            assert.isOk(count === 1);
            try {
                await iGroup.getName();
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "Context not exists");
                return;
            }

            assert.fail("should throw exception");
        });

        it("remove group by name", async () => {
            const { iGroup, groupData } = await addGroup({});
            const count = await iSystemAuth.removeGroupByName(groupData.name);
            assert.isOk(count === 1);
            try {
                await iGroup.getDescription();
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "Context not exists");
                return;
            }

            assert.fail("should throw exception");
        });

        it("remove nonexisting group", async () => {
            const groupName = getNextGroupName();
            try {
                await iSystemAuth.removeGroupByName(groupName);
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "Group not exists");
                try {
                    await iSystemAuth.removeGroupById("illegal_group_id");
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotExists);
                    assert.equal(err.message, "Group not exists");
                    return;
                }
            }
            assert.fail("should throw exception");
        });

        it("remove all groups", async () => {
            const { iGroup } = await addGroup({});
            await iSystemAuth.removeAllGroups();
            const names = await iSystemAuth.listGroupNames();
            assert.isOk(names.length === 2);
            assert.isOk(names.includes(userGroup.name));
            assert.isOk(names.includes(adminGroup.name));

            try {
                await iGroup.getName();
            } catch (err) {
                assert.equal(err.message, "Context not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }

            assert.fail("should throw exception");
        });

        it("interfaces of removed groups must be inaccessible", async () => {
            const iGroups = [];
            for (let i = 0; i < 7; i++) {
                const { iGroup } = await addGroup({});
                iGroups.push(iGroup);
            }

            const count = await iSystemAuth.removeAllGroups();
            assert.isOk(count === 7);

            let errorCounter = 0;
            for (let i = 0; i < 7; i++) {
                try {
                    await iGroups[i].getContexts();
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotExists);
                    assert.equal(err.message, "Context not exists");
                    ++errorCounter;
                }
            }
            assert.isOk(errorCounter === 7);
        });

        describe("Group interface", () => {
            let groupName;
            let iGroup;
            let groupData;

            beforeEach(async () => {
                const result = await addGroup({});
                iGroup = result.iGroup;
                groupData = result.groupData;
                groupName = groupData.name;
            });


            afterEach(async () => {
                await iSystemAuth.removeGroupByName(groupName);
            });

            it("set name", async () => {
                const old = await iGroup.getName();
                groupName = old.repeat(2);
                await iGroup.setName(groupName);
                assert.equal(groupName, await iGroup.getName());
            });

            it("set description", async () => {
                const old = await iGroup.getDescription();
                assert.equal(old, groupData.description);
                const newDescr = srandom(64);
                await iGroup.setDescription(newDescr);
                assert.equal(newDescr, await iGroup.getDescription());
            });

            it("set contexts", async () => {
                const old = await iGroup.getContexts();
                assert.sameMembers(old, groupData.contexts);
                const newContexts = ["ctx1", "ctx2", "ctx4"];
                await iGroup.setContexts(newContexts);
                assert.sameMembers(newContexts, await iGroup.getContexts());
            });

            it("set same name", async () => {
                const oldName = await iGroup.getName();
                await iGroup.setName(oldName);
                assert.equal(groupName, await iGroup.getName());
            });

            it("set same description", async () => {
                const oldDescr = await iGroup.getDescription();
                await iGroup.setDescription(groupData.description);
                assert.equal(oldDescr, await iGroup.getDescription());
            });

            it("set nonstring name", async () => {
                try {
                    await iGroup.setName(8929342);
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotValid);
                    return;
                }
                assert.fail("should throw exception");
            });

            it("set name of another existing group", async () => {
                const { groupData } = await addGroup({});
                try {
                    await iGroup.setName(groupData.name);
                } catch (err) {
                    assert.isOk(err instanceof adone.x.Exists);
                    return;
                }
                assert.fail("should throw exception");
            });
        });
    });

    describe("Users", () => {
        const groupName = getNextGroupName();
        before(async () => {
            await addGroup({ name: groupName });
        });

        it("initially users shouldn't be exist", async () => {
            const users = await iSystemAuth.listUsers();
            assert.isOk(users.length === 0);
        });

        it("user interface should be singleton", async () => {
            const { iUser, userData } = await addUser({ group: groupName });
            const iUser1 = await iSystemAuth.getUserByEmail(userData.email);
            const iUser2 = await iSystemAuth.getUserById(await iUser.getId());
            assert.equal(iUser.$def.id, iUser1.$def.id);
            assert.equal(iUser1.$def.id, iUser2.$def.id);
        });

        it("add user with all fields", async () => {
            const { iUser, userData } = await addUser({ group: groupName });
            assert.equal(await iUser.getName(), userData.name);
            assert.equal(await iUser.getDescription(), userData.description);
            assert.equal(await iUser.getEmail(), userData.email);
            assert.equal(await iUser.getStatus(), userData.status);
        });

        it("add user using defaults", async () => {
            const { iUser, userData } = await addUser({ group: groupName, description: false, status: false });
            assert.equal(await iUser.getName(), userData.name);
            assert.equal(await iUser.getDescription(), userSchema.description.default);
            assert.equal(await iUser.getEmail(), userData.email);
            assert.equal(await iUser.getStatus(), userSchema.status.default);
        });

        it("add user without name", async () => {
            try {
                await addUser({ name: false, group: groupName, description: false, status: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user without group", async () => {
            try {
                await addUser({ group: false, description: false, status: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user without email", async () => {
            try {
                await addUser({ group: groupName, email: false, description: false, status: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user without password", async () => {
            try {
                await addUser({ group: groupName, description: false, status: false, password: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user with nonexistent group", async () => {
            try {
                await addUser({ group: "NonexistentGroup", description: false, status: false });
            } catch (err) {
                assert.equal(err.message, "Group not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user with incorrect email", async () => {
            try {
                await addUser({ email: "incorrect.email", group: groupName, description: false, status: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotValid);
                return;
            }
            assert.fail("should throw exception");
        });

        it("add user with incorrect password", async () => {
            try {
                await addUser({ password: srandom(4), group: groupName, description: false, status: false });
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotValid);
                return;
            }
            assert.fail("should throw exception");
        });

        it("get user by id", async () => {
            const { iUser } = await addUser({ group: groupName, description: false, status: false });
            const iSameUser = await iSystemAuth.getUserById(await iUser.getId());
            assert.equal(await iUser.getId(), await iSameUser.getId());
            assert.equal(await iUser.getName(), await iSameUser.getName());
            assert.equal(await iUser.getEmail(), await iSameUser.getEmail());
            assert.equal(await iUser.getDescription(), await iSameUser.getDescription());
            assert.equal(await iUser.getStatus(), await iSameUser.getStatus());
        });

        it("get user by email", async () => {
            const { iUser, userData } = await addUser({ group: groupName, description: false, status: false });
            const iSameUser = await iSystemAuth.getUserByEmail(userData.email);
            assert.equal(await iUser.getId(), await iSameUser.getId());
            assert.equal(await iUser.getName(), await iSameUser.getName());
            assert.equal(await iUser.getEmail(), await iSameUser.getEmail());
            assert.equal(await iUser.getDescription(), await iSameUser.getDescription());
            assert.equal(await iUser.getStatus(), await iSameUser.getStatus());
        });


        it("list users", async () => {
            const { userData } = await addUser({ group: groupName, description: false, status: false });
            const users = await iSystemAuth.listUsers();
            const userEmails = await iSystemAuth.listEmails();
            assert.isOk(users.length > 1 && userEmails.length === users.length);
            assert.isOk(userEmails.includes(userData.email));
        });

        it("remove user by id", async () => {
            const { iUser } = await addUser({ group: groupName, description: false, status: false });
            const userId = await iUser.getId();
            const count = await iSystemAuth.removeUserById(userId);
            assert.isOk(count === 1);
            try {
                await iUser.getName();
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "Context not exists");
                return;
            }

            assert.fail("should throw exception");
        });

        it("remove user by email", async () => {
            const { iUser, userData } = await addUser({ group: groupName, description: false, status: false });
            const count = await iSystemAuth.removeUserByEmail(userData.email);
            assert.isOk(count === 1);
            try {
                await iUser.getStatus();
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "Context not exists");
                return;
            }

            assert.fail("should throw exception");
        });

        it("remove nonexisting user", async () => {
            const email = getNextEmail();
            try {
                await iSystemAuth.removeUserByEmail(email);
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotExists);
                assert.equal(err.message, "User not exists");
                try {
                    await iSystemAuth.removeUserById("illegal_user_id");
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotExists);
                    assert.equal(err.message, "User not exists");
                    return;
                }
            }

            assert.fail("should throw exception");
        });

        it("remove all users", async () => {
            const { iUser } = await addUser({ group: groupName, description: false, status: false });
            const count = await iSystemAuth.removeAllUsers();
            assert.isOk(count > 0);
            const userDatas = await iSystemAuth.listUsers();
            assert.isOk(userDatas.length === 0);

            try {
                await iUser.getName();
            } catch (err) {
                assert.equal(err.message, "Context not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }

            assert.fail("should throw exception");
        });

        describe("User interface", () => {
            let email;
            let iUser;
            let userData;
            let userName;

            beforeEach(async () => {
                email = getNextEmail();
                userName = srandom(8);
                userData = {
                    name: userName,
                    email,
                    group: groupName,
                    description: srandom(32),
                    status: "Enabled",
                    password: srandom(12)
                };
                iUser = await iSystemAuth.addUser(userData);
            });

            afterEach(async () => {
                await iSystemAuth.removeUserByEmail(email);
            });

            it("set name", async () => {
                const old = await iUser.getName();
                userName = old.repeat(2);
                await iUser.setName(userName);
                assert.equal(userName, await iUser.getName());
            });

            it("set email", async () => {
                const old = await iUser.getEmail();
                assert.equal(old, userData.email);
                email = getNextEmail();
                await iUser.setEmail(email);
                assert.equal(email, await iUser.getEmail());
            });

            it("set description", async () => {
                const old = await iUser.getDescription();
                assert.equal(old, userData.description);
                const newVal = srandom(64);
                await iUser.setDescription(newVal);
                assert.equal(newVal, await iUser.getDescription());
            });

            it("set status", async () => {
                const old = await iUser.getStatus();
                assert.equal(old, userData.status);
                const newVal = "Disabled";
                await iUser.setStatus(newVal);
                assert.equal(newVal, await iUser.getStatus());
            });

            it("set password", async () => {
                const status = await iUser.setPassword(srandom(34), userData.password);
                assert.isOk(status === 1);
            });

            it("set password several times", async () => {
                let oldPassword = userData.password;
                for (let i = 0; i < 7; i++) {
                    const newPassword = srandom(34);
                    const status = await iUser.setPassword(newPassword, oldPassword);
                    assert.isOk(status === 1);
                    oldPassword = newPassword;
                }
            });

            it("set password without specified old password", async () => {
                try {
                    await iUser.setPassword(srandom(34));
                } catch (err) {
                    assert.equal(err.message, "Old password should be specified");
                    assert.isOk(err instanceof adone.x.InvalidArgument);
                    return;
                }
                assert.fail("should throw exception");
            });

            it("set password with incorrect old password", async () => {
                try {
                    await iUser.setPassword(srandom(34), "incorrect_all_password");
                } catch (err) {
                    assert.equal(err.message, "Incorrect old password");
                    assert.isOk(err instanceof adone.x.NotValid);
                    return;
                }
                assert.fail("should throw exception");
            });

            it("set password with incorrect type of old paasword", async () => {
                try {
                    await iUser.setPassword(srandom(34), 123);
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotValid);
                    return;
                }
                assert.fail("should throw exception");
            });

            it("set same name", async () => {
                const old = await iUser.getName();
                await iUser.setName(userData.name);
                assert.equal(old, await iUser.getName());
            });

            it("set same email", async () => {
                const old = await iUser.getEmail();
                await iUser.setEmail(userData.email);
                assert.equal(old, await iUser.getEmail());
            });

            it("set same description", async () => {
                const old = await iUser.getDescription();
                await iUser.setDescription(userData.description);
                assert.equal(old, await iUser.getDescription());
            });

            it("set same status", async () => {
                const old = await iUser.getStatus();
                await iUser.setStatus(userData.status);
                assert.equal(old, await iUser.getStatus());
            });

            it("set nonstring name", async () => {
                try {
                    await iUser.setName(8929342);
                } catch (err) {
                    assert.isOk(err instanceof adone.x.NotValid);
                    return;
                }
                assert.fail("should throw exception");
            });

            it("set email of another existing user", async () => {
                const anotherEmail = getNextEmail();
                await iSystemAuth.addUser({
                    name: srandom(8),
                    email: anotherEmail,
                    group: groupName,
                    password: srandom(32)
                });
                try {
                    await iUser.setEmail(anotherEmail);
                } catch (err) {
                    assert.isOk(err instanceof adone.x.Exists);
                    return;
                }
                assert.fail("should throw exception");
            });
        });
    });

    describe("Registration", () => {
        it("register user", async () => {
            const userData = await registerUser({});
            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            assert.equal(await iUser.getEmail(), userData.email);
            assert.equal(await iUser.getName(), userData.name);
            assert.equal(await iUser.getStatus(), userSchema.status.default);
            assert.equal(await iUser.getDescription(), userSchema.description.default);
        });

        it("register user with specified status", async () => {
            const userData = await registerUser({ status: "Enabled" });
            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            assert.equal(await iUser.getEmail(), userData.email);
            assert.equal(await iUser.getName(), userData.name);
            assert.equal(await iUser.getStatus(), userSchema.status.default);
            assert.equal(await iUser.getDescription(), userSchema.description.default);
        });

        it("register user without name", async () => {
            try {
                await registerUser({ name: false });
            } catch (err) {
                assert.equal(err.message, "Field name must be specified");
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("register user without password", async () => {
            try {
                await registerUser({ password: false });
            } catch (err) {
                assert.equal(err.message, "Field password must be specified");
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("register user with email of already existing user", async () => {
            const { userData } = await addUser({ group: userGroup.name });

            try {
                await registerUser({ email: userData.email });
            } catch (err) {
                assert.equal(err.message, "User with such credentials already exists");
                assert.isOk(err instanceof adone.x.NotAllowed);
                return;
            }
            assert.fail("should throw exception");
        });
    });

    describe("Login", () => {
        it("login when user is disabled", async () => {
            const userData = await registerUser({});

            delete userData.name;
            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.equal(err.message, "Account is disabled");
                assert.isOk(err instanceof adone.x.NotAllowed);
                return;
            }
            assert.fail("should throw exception");
        });

        it("login without email", async () => {
            const userData = await registerUser({});

            delete userData.name;
            delete userData.email;
            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.equal(err.message, "Field email must be specified");
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("login without password", async () => {
            const userData = await registerUser({});
            delete userData.name;
            delete userData.password;
            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.equal(err.message, "Field password must be specified");
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("login without email and password", async () => {
            const userData = await registerUser({});
            delete userData.name;
            delete userData.email;
            delete userData.password;
            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.isOk(err instanceof adone.x.NotFound);
                return;
            }
            assert.fail("should throw exception");
        });

        it("login with incorrect email", async () => {
            const userData = await registerUser({});
            delete userData.name;
            userData.email = "incorrect@email.com";
            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.equal(err.message, "Incorrect login data");
                assert.isOk(err instanceof adone.x.NotAllowed);
                return;
            }
            assert.fail("should throw exception");
        });

        it("login with incorrect password", async () => {
            const userData = await registerUser({});
            delete userData.name;
            userData.password = srandom(13);

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");

            try {
                await iAuth.login(userData);
            } catch (err) {
                assert.equal(err.message, "Incorrect login data");
                assert.isOk(err instanceof adone.x.NotAllowed);
                return;
            }
            assert.fail("should throw exception");
        });
    });

    describe("Sessions", () => {
        it("initially no sessions should be exist", async () => {
            const sessionDatas = await iSystemAuth.listSessions();
            assert.isOk(sessionDatas.length === 0);
        });

        it("get session on successfull login", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            assert.isOk(is.string(await iSession.getKey()));
        });

        it("get user by session key", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            const sessionKey = await iSession.getKey();

            const iSameUser = await iSystemAuth.getUserBySessionKey(sessionKey);
            assert.equal(iUser.$def.id, iSameUser.$def.id);
        });

        it("get user by unknown session key", async () => {
            const sessionKey = srandom(64);

            try {
                await iSystemAuth.getUserBySessionKey(sessionKey);
            } catch (err) {
                assert.equal(err.message, "Session not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }
            assert.fail("should throw exception");
        });

        it("get session by key", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            const sessionKey = await iSession.getKey();

            const iSameSession = await iSystemAuth.getSessionByKey(sessionKey);
            assert.equal(sessionKey, await iSameSession.getKey());
        });

        it("session interface should be singleton", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            const sessionKey = await iSession.getKey();

            const iSameSession = await iAuth.getSessionByKey(sessionKey);
            assert.equal(iSession.$def.id, iSameSession.$def.id);
        });

        it("invalid session interface after logout", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            await iSession.getKey();
            await iSession.logout();
            try {
                await iSession.getKey();
            } catch (err) {
                assert.equal(err.message, "Context not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }
            assert.fail("should throw exception");
        });

        it("different session keys between logins", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession1 = await iAuth.login(userData);
            const key1 = await iSession1.getKey();
            await iSession1.logout();
            const iSession2 = await iAuth.login(userData);
            const key2 = await iSession2.getKey();
            await iSession2.logout();

            assert.notEqual(key1, key2);
        });

        it("get user by session key after logout", async () => {
            const userData = await registerUser({});
            delete userData.name;

            const iUser = await iSystemAuth.getUserByEmail(userData.email);
            await iUser.setStatus("Enabled");
            const iSession = await iAuth.login(userData);
            const sessionKey = await iSession.getKey();
            await iSession.logout();

            try {
                await iSystemAuth.getUserBySessionKey(sessionKey);
            } catch (err) {
                assert.equal(err.message, "Session not exists");
                assert.isOk(err instanceof adone.x.NotExists);
                return;
            }
            assert.fail("should throw exception");
        });
    });

    describe.skip("Stress", function () {
        const groups = [];
        const users = [];
        const sessions = [];

        this.timeout(120 * 1000);

        describe("Await mode", function () {
            const limit = 1000;

            this.timeout(120 * 1000);

            it(`${limit} groups`, async () => {
                for (let i = 0; i < limit; i++) {
                    groups.push(await addGroup());
                }

                for (let i = 0; i < limit; i++) {
                    const g = groups[i];
                    assert.equal(g.groupData.name, await g.iGroup.getName());
                    assert.equal(g.groupData.description, await g.iGroup.getDescription());
                    assert.sameMembers(g.groupData.contexts, await g.iGroup.getContexts());
                }
            });

            it(`${limit} users`, async () => {
                for (let i = 0; i < limit; i++) {
                    users.push(await addUser({ group: groups[i].groupData.name }));
                }

                for (let i = 0; i < limit; i++) {
                    const u = users[i];
                    assert.equal(u.userData.name, await u.iUser.getName());
                    assert.equal(u.userData.email, await u.iUser.getEmail());
                    assert.equal(u.userData.description, await u.iUser.getDescription());
                }
            });

            it(`${limit} sessions`, async () => {
                for (let i = 0; i < limit; i++) {
                    const u = users[i].userData;
                    const iSession = await iAuth.login({ email: u.email, password: u.password });
                    sessions.push(iSession);
                }

                for (let i = 0; i < limit; i++) {
                    const s = sessions[i];
                    await s.logout();
                }
            });
        });

        describe("Stealth mode", () => {
            const limit = 3000;

            it(`${limit} groups`, async () => {
                const promises = [];
                for (let i = 0; i < limit; i++) {
                    const groupData = adone.o({
                        name: getNextGroupName(),
                        description: srandom(128),
                        contexts: [srandom(5), srandom(5), srandom(5)]
                    });
                    promises.push(iSystemAuth.addGroup(groupData));
                }

                await Promise.all(promises);
            });

            it(`${limit} users & sessions`, async () => {
                const promises = [];
                for (let i = 0; i < limit; i++) {
                    const userData = adone.o({
                        name: srandom(8),
                        email: getNextEmail(),
                        description: srandom(8192),
                        group: "User",
                        password: srandom(32)
                    });
                    promises.push(iSystemAuth.addUser(userData));
                }

                await Promise.all(promises);
            });
        });
    });
});
