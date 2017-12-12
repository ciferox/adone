import Support from "./support";

const { vendor: { lodash: _ }, promise } = adone;
const { orm } = adone;
const { type } = orm;
const dialect = Support.getTestDialect();

const sortById = function (a, b) {
    return a.id < b.id ? -1 : 1;
};

describe(Support.getTestDialectTeaser("Include"), () => {
    describe("find", () => {
        it("should support an empty belongsTo include", function () {
            const Company = this.sequelize.define("Company", {});
            const User = this.sequelize.define("User", {});

            User.belongsTo(Company, { as: "Employer" });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create();
            }).then(() => {
                return User.find({
                    include: [{ model: Company, as: "Employer" }]
                }).then((user) => {
                    expect(user).to.be.ok;
                });
            });
        });

        it("should support a belongsTo association reference", function () {
            const Company = this.sequelize.define("Company", {});
            const User = this.sequelize.define("User", {});
            const Employer = User.belongsTo(Company, { as: "Employer" });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create();
            }).then(() => {
                return User.findOne({
                    include: [Employer]
                }).then((user) => {
                    expect(user).to.be.ok;
                });
            });
        });

        it("should support a belongsTo association reference with a where", function () {
            const Company = this.sequelize.define("Company", { name: type.STRING });
            const User = this.sequelize.define("User", {});
            const Employer = User.belongsTo(Company, { as: "Employer", foreignKey: "employerId" });

            return this.sequelize.sync({ force: true }).then(() => {
                return Company.create({
                    name: "CyberCorp"
                }).then((company) => {
                    return User.create({
                        employerId: company.get("id")
                    });
                });
            }).then(() => {
                return User.findOne({
                    include: [
                        { association: Employer, where: { name: "CyberCorp" } }
                    ]
                }).then((user) => {
                    expect(user).to.be.ok;
                });
            });
        });

        it("should support a empty hasOne include", function () {
            const Company = this.sequelize.define("Company", {});
            const Person = this.sequelize.define("Person", {});

            Company.hasOne(Person, { as: "CEO" });

            return this.sequelize.sync({ force: true }).then(() => {
                return Company.create().then(() => {
                    return Company.find({
                        include: [{ model: Person, as: "CEO" }]
                    }).then((company) => {
                        expect(company).to.be.ok;
                    });
                });
            });
        });

        it("should support a hasOne association reference", function () {
            const Company = this.sequelize.define("Company", {});
            const Person = this.sequelize.define("Person", {});
            const CEO = Company.hasOne(Person, { as: "CEO" });

            return this.sequelize.sync({ force: true }).then(() => {
                return Company.create();
            }).then(() => {
                return Company.find({
                    include: [CEO]
                });
            }).then((user) => {
                expect(user).to.be.ok;
            });
        });

        it("should support including a belongsTo association rather than a model/as pair", async function () {
            const Company = this.sequelize.define("Company", {});
            const Person = this.sequelize.define("Person", {});

            Person.relation = {
                Employer: Person.belongsTo(Company, { as: "employer" })
            };

            await this.sequelize.sync({ force: true });
            {
                const [person, company] = await Promise.all([
                    Person.create(),
                    Company.create()
                ]);
                await person.setEmployer(company);
            }
            const person = await Person.find({
                include: [Person.relation.Employer]
            });
            expect(person).to.be.ok;
            expect(person.employer).to.be.ok;
        });

        it("should support a hasMany association reference", function () {
            const User = this.sequelize.define("user", {});
            const Task = this.sequelize.define("task", {});
            const Tasks = User.hasMany(Task);

            Task.belongsTo(User);

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create().then((user) => {
                    return user.createTask();
                }).then(() => {
                    return User.find({
                        include: [Tasks]
                    });
                }).then((user) => {
                    expect(user).to.be.ok;
                    expect(user.tasks).to.be.ok;
                });
            });
        });

        it("should support a hasMany association reference with a where condition", async function () {
            const User = this.sequelize.define("user", {});
            const Task = this.sequelize.define("task", { title: type.STRING });
            const Tasks = User.hasMany(Task);

            Task.belongsTo(User);

            await this.sequelize.sync({ force: true });
            {
                const user = await User.create();
                await Promise.all([
                    user.createTask({
                        title: "trivial"
                    }),
                    user.createTask({
                        title: "pursuit"
                    })
                ]);
            }
            const user = await User.find({
                include: [
                    { association: Tasks, where: { title: "trivial" } }
                ]
            });
            expect(user).to.be.ok;
            expect(user.tasks).to.be.ok;
            expect(user.tasks.length).to.equal(1);
        });

        it("should support a belongsToMany association reference", function () {
            const User = this.sequelize.define("user", {});
            const Group = this.sequelize.define("group", {});
            const Groups = User.belongsToMany(Group, { through: "UserGroup" });

            Group.belongsToMany(User, { through: "UserGroup" });

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create().then((user) => {
                    return user.createGroup();
                });
            }).then(() => {
                return User.find({
                    include: [Groups]
                }).then((user) => {
                    expect(user).to.be.ok;
                    expect(user.groups).to.be.ok;
                });
            });
        });

        it("should support a simple nested belongsTo -> belongsTo include", async function () {
            const Task = this.sequelize.define("Task", {});
            const User = this.sequelize.define("User", {});
            const Group = this.sequelize.define("Group", {});

            Task.belongsTo(User);
            User.belongsTo(Group);

            await this.sequelize.sync({ force: true });

            const props = await promise.props({
                task: Task.create(),
                user: User.create(),
                group: Group.create()
            });
            await Promise.all([
                props.task.setUser(props.user),
                props.user.setGroup(props.group)
            ])

            const task = await Task.findOne({
                where: {
                    id: props.task.id
                },
                include: [
                    {
                        model: User, include: [
                            { model: Group }
                        ]
                    }
                ]
            });
            expect(task.User).to.be.ok;
            expect(task.User.Group).to.be.ok;
        });

        it("should support a simple sibling set of belongsTo include", function () {
            const Task = this.sequelize.define("Task", {});
            const User = this.sequelize.define("User", {});
            const Group = this.sequelize.define("Group", {});

            Task.belongsTo(User);
            Task.belongsTo(Group);

            return this.sequelize.sync({ force: true }).then(() => {
                return Task.create({
                    User: {},
                    Group: {}
                }, {
                    include: [User, Group]
                });
            }).then((task) => {
                return Task.find({
                    where: {
                        id: task.id
                    },
                    include: [
                        { model: User },
                        { model: Group }
                    ]
                });
            }).then((task) => {
                expect(task.User).to.be.ok;
                expect(task.Group).to.be.ok;
            });
        });

        it("should support a simple nested hasOne -> hasOne include", function () {
            const Task = this.sequelize.define("Task", {});
            const User = this.sequelize.define("User", {});
            const Group = this.sequelize.define("Group", {});

            User.hasOne(Task);
            Group.hasOne(User);
            User.belongsTo(Group);

            return this.sequelize.sync({ force: true }).then(() => {
                return User.create({
                    Task: {},
                    Group: {}
                }, {
                    include: [Task, Group]
                });
            }).then((user) => {
                return Group.find({
                    where: {
                        id: user.Group.id
                    },
                    include: [
                        {
                            model: User, include: [
                                { model: Task }
                            ]
                        }
                    ]
                });
            }).then((group) => {
                expect(group.User).to.be.ok;
                expect(group.User.Task).to.be.ok;
            });
        });

        it("should support a simple nested hasMany -> belongsTo include", function () {
            const Task = this.sequelize.define("Task", {});
            const User = this.sequelize.define("User", {});
            const Project = this.sequelize.define("Project", {});

            User.hasMany(Task);
            Task.belongsTo(Project);

            return this.sequelize.sync({ force: true }).then(() => {
                return Project.bulkCreate([{ id: 1 }, { id: 2 }]);
            }).then(() => {
                return User.create({
                    Tasks: [
                        { ProjectId: 1 },
                        { ProjectId: 2 },
                        { ProjectId: 1 },
                        { ProjectId: 2 }
                    ]
                }, {
                    include: [Task]
                });
            }).then((user) => {
                return User.find({
                    where: {
                        id: user.id
                    },
                    include: [
                        {
                            model: Task, include: [
                                { model: Project }
                            ]
                        }
                    ]
                });
            }).then((user) => {
                expect(user.Tasks).to.be.ok;
                expect(user.Tasks.length).to.equal(4);

                user.Tasks.forEach((task) => {
                    expect(task.Project).to.be.ok;
                });
            });
        });

        it("should support a simple nested belongsTo -> hasMany include", function () {
            const Task = this.sequelize.define("Task", {});
            const Worker = this.sequelize.define("Worker", {});
            const Project = this.sequelize.define("Project", {});

            Worker.belongsTo(Project);
            Project.hasMany(Worker);
            Project.hasMany(Task);

            return this.sequelize.sync({ force: true }).then(() => {
                return Project.create({
                    Workers: [{}],
                    Tasks: [{}, {}, {}, {}]
                }, {
                    include: [Worker, Task]
                });
            }).then((project) => {
                return Worker.find({
                    where: {
                        id: project.Workers[0].id
                    },
                    include: [
                        {
                            model: Project, include: [
                                { model: Task }
                            ]
                        }
                    ]
                });
            }).then((worker) => {
                expect(worker.Project).to.be.ok;
                expect(worker.Project.Tasks).to.be.ok;
                expect(worker.Project.Tasks.length).to.equal(4);
            });
        });

        it("should support a simple nested hasMany <-> hasMany include", async function () {
            const User = this.sequelize.define("User", {});
            const Product = this.sequelize.define("Product", {
                title: type.STRING
            });
            const Tag = this.sequelize.define("Tag", {
                name: type.STRING
            });

            User.hasMany(Product);
            Product.belongsToMany(Tag, { through: "product_tag" });
            Tag.belongsToMany(Product, { through: "product_tag" });

            await this.sequelize.sync({ force: true });
            const [products, tags] = await Promise.all([
                User.create({
                    id: 1,
                    Products: [
                        { title: "Chair" },
                        { title: "Desk" },
                        { title: "Dress" },
                        { title: "Bed" }
                    ]
                }, {
                    include: [Product]
                }).then(() => {
                    return Product.findAll({ order: [["id"]] });
                }),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ]).then(() => {
                    return Tag.findAll({ order: [["id"]] });
                })
            ]);
            await Promise.all([
                products[0].setTags([tags[0], tags[2]]),
                products[1].setTags([tags[1]]),
                products[2].setTags([tags[0], tags[1], tags[2]])
            ]);
            const user = await User.find({
                where: {
                    id: 1
                },
                include: [
                    {
                        model: Product, include: [
                            { model: Tag }
                        ]
                    }
                ],
                order: [
                    User.rawAttributes.id,
                    [Product, "id"]
                ]
            });
            expect(user.Products.length).to.equal(4);
            expect(user.Products[0].Tags.length).to.equal(2);
            expect(user.Products[1].Tags.length).to.equal(1);
            expect(user.Products[2].Tags.length).to.equal(3);
            expect(user.Products[3].Tags.length).to.equal(0);
        });

        it("should support an include with multiple different association types", async function () {
            const User = this.sequelize.define("User", {});
            const Product = this.sequelize.define("Product", {
                title: type.STRING
            });
            const Tag = this.sequelize.define("Tag", {
                name: type.STRING
            });
            const Price = this.sequelize.define("Price", {
                value: type.FLOAT
            });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            });
            const GroupMember = this.sequelize.define("GroupMember", {

            });
            const Rank = this.sequelize.define("Rank", {
                name: type.STRING,
                canInvite: {
                    type: type.INTEGER,
                    defaultValue: 0
                },
                canRemove: {
                    type: type.INTEGER,
                    defaultValue: 0
                }
            });

            User.hasMany(Product);
            Product.belongsTo(User);

            Product.belongsToMany(Tag, { through: "product_tag" });
            Tag.belongsToMany(Product, { through: "product_tag" });
            Product.belongsTo(Tag, { as: "Category" });

            Product.hasMany(Price);
            Price.belongsTo(Product);

            User.hasMany(GroupMember, { as: "Memberships" });
            GroupMember.belongsTo(User);
            GroupMember.belongsTo(Rank);
            GroupMember.belongsTo(Group);
            Group.hasMany(GroupMember, { as: "Memberships" });

            await this.sequelize.sync({ force: true });
            const [product1, product2, user, tags] = await Promise.all([
                Product.create({
                    id: 1,
                    title: "Chair",
                    Prices: [{ value: 5 }, { value: 10 }]
                }, { include: [Price] }),
                Product.create({
                    id: 2,
                    title: "Desk",
                    Prices: [{ value: 5 }, { value: 10 }, { value: 15 }, { value: 20 }]
                }, { include: [Price] }),
                User.create({
                    id: 1,
                    Memberships: [
                        { id: 1, Group: { name: "Developers" }, Rank: { name: "Admin", canInvite: 1, canRemove: 1 } },
                        { id: 2, Group: { name: "Designers" }, Rank: { name: "Member", canInvite: 1, canRemove: 0 } }
                    ]
                }, {
                    include: { model: GroupMember, as: "Memberships", include: [Group, Rank] }
                }),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ]).then(() => {
                    return Tag.findAll();
                })
            ]);
            await Promise.all([
                user.setProducts([product1, product2]),
                product1.setTags([tags[0], tags[2]]),
                product2.setTags([tags[1]]),
                product1.setCategory(tags[1])
            ]);
            {
                const user = await User.find({
                    where: { id: 1 },
                    include: [
                        {
                            model: GroupMember, as: "Memberships", include: [
                                Group,
                                Rank
                            ]
                        },
                        {
                            model: Product, include: [
                                Tag,
                                { model: Tag, as: "Category" },
                                Price
                            ]
                        }
                    ]
                });
                user.Memberships.sort(sortById);
                expect(user.Memberships.length).to.equal(2);
                expect(user.Memberships[0].Group.name).to.equal("Developers");
                expect(user.Memberships[0].Rank.canRemove).to.equal(1);
                expect(user.Memberships[1].Group.name).to.equal("Designers");
                expect(user.Memberships[1].Rank.canRemove).to.equal(0);

                user.Products.sort(sortById);
                expect(user.Products.length).to.equal(2);
                expect(user.Products[0].Tags.length).to.equal(2);
                expect(user.Products[1].Tags.length).to.equal(1);
                expect(user.Products[0].Category).to.be.ok;
                expect(user.Products[1].Category).not.to.be.ok;

                expect(user.Products[0].Prices.length).to.equal(2);
                expect(user.Products[1].Prices.length).to.equal(4);
            }
        });

        it("should support specifying attributes", function () {
            const Project = this.sequelize.define("Project", {
                title: type.STRING
            });

            const Task = this.sequelize.define("Task", {
                title: type.STRING,
                description: type.TEXT
            });

            Project.hasMany(Task);
            Task.belongsTo(Project);

            return this.sequelize.sync({ force: true }).then(() => {
                return Task.create({
                    title: "FooBar",
                    Project: { title: "BarFoo" }
                }, {
                    include: [Project]
                });
            }).then(() => {
                return Task.findAll({
                    attributes: ["title"],
                    include: [
                        { model: Project, attributes: ["title"] }
                    ]
                });
            }).then((tasks) => {
                expect(tasks[0].title).to.equal("FooBar");
                expect(tasks[0].Project.title).to.equal("BarFoo");

                expect(_.omit(tasks[0].get(), "Project")).to.deep.equal({ title: "FooBar" });
                expect(tasks[0].Project.get()).to.deep.equal({ title: "BarFoo" });
            });
        });

        it("should support orm.util.literal and renaming of attributes in included model attributes", function () {
            const Post = this.sequelize.define("Post", {});
            const PostComment = this.sequelize.define("PostComment", {
                someProperty: type.VIRTUAL, // Since we specify the AS part as a part of the literal string, not with sequelize syntax, we have to tell sequelize about the field
                comment_title: type.STRING
            });

            Post.hasMany(PostComment);

            return this.sequelize.sync({ force: true }).then(() => {
                return Post.create({});
            }).then((post) => {
                return post.createPostComment({
                    comment_title: "WAT"
                });
            }).then(() => {
                let findAttributes;
                if (dialect === "mssql") {
                    findAttributes = [
                        orm.util.literal('CAST(CASE WHEN EXISTS(SELECT 1) THEN 1 ELSE 0 END AS BIT) AS "PostComments.someProperty"'),
                        [orm.util.literal("CAST(CASE WHEN EXISTS(SELECT 1) THEN 1 ELSE 0 END AS BIT)"), "someProperty2"]
                    ];
                } else {
                    findAttributes = [
                        orm.util.literal('EXISTS(SELECT 1) AS "PostComments.someProperty"'),
                        [orm.util.literal("EXISTS(SELECT 1)"), "someProperty2"]
                    ];
                }
                findAttributes.push(["comment_title", "commentTitle"]);

                return Post.findAll({
                    include: [
                        {
                            model: PostComment,
                            attributes: findAttributes
                        }
                    ]
                });
            }).then((posts) => {
                expect(posts[0].PostComments[0].get("someProperty")).to.be.ok;
                expect(posts[0].PostComments[0].get("someProperty2")).to.be.ok;
                expect(posts[0].PostComments[0].get("commentTitle")).to.equal("WAT");
            });
        });

        it("should support self associated hasMany (with through) include", async function () {
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            });

            Group.belongsToMany(Group, { through: "groups_outsourcing_companies", as: "OutsourcingCompanies" });

            await this.sequelize.sync({ force: true });
            await Group.bulkCreate([
                { name: "SoccerMoms" },
                { name: "Coca Cola" },
                { name: "Dell" },
                { name: "Pepsi" }
            ]);
            const groups = await Group.findAll();
            await groups[0].setOutsourcingCompanies(groups.slice(1));
            const group = await Group.find({
                where: {
                    id: groups[0].id
                },
                include: [{ model: Group, as: "OutsourcingCompanies" }]
            });
            expect(group.OutsourcingCompanies).to.have.length(3);
        });

        it("should support including date fields, with the correct timeszone", async function () {
            const User = this.sequelize.define("user", {
                dateField: type.DATE
            }, { timestamps: false });
            const Group = this.sequelize.define("group", {
                dateField: type.DATE
            }, { timestamps: false });

            User.belongsToMany(Group, { through: "group_user" });
            Group.belongsToMany(User, { through: "group_user" });

            await this.sequelize.sync({ force: true });
            const [user, group] = await Promise.all([
                User.create({ dateField: Date.UTC(2014, 1, 20) }),
                Group.create({ dateField: Date.UTC(2014, 1, 20) })
            ]);
            await user.addGroup(group);
            const user2 = await User.find({
                where: {
                    id: user.id
                },
                include: [Group]
            });
            expect(user2.dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
            expect(user2.groups[0].dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
        });

        it("should support include when retrieving associated objects", async function () {
            const User = this.sequelize.define("user", {
                name: type.STRING
            });
            const Group = this.sequelize.define("group", {
                name: type.STRING
            });
            const UserGroup = this.sequelize.define("user_group", {
                vip: type.INTEGER
            });

            User.hasMany(Group);
            Group.belongsTo(User);
            User.belongsToMany(Group, {
                through: UserGroup,
                as: "Clubs"
            });
            Group.belongsToMany(User, {
                through: UserGroup,
                as: "Members"
            });

            await this.sequelize.sync({ force: true });
            const [owner, member, group] = await Promise.all([
                User.create({ name: "Owner" }),
                User.create({ name: "Member" }),
                Group.create({ name: "Group" })
            ]);
            await owner.addGroup(group);
            await group.addMember(member);
            const groups = await owner.getGroups({
                include: [{
                    model: User,
                    as: "Members"
                }]
            });
            expect(groups.length).to.equal(1);
            expect(groups[0].Members[0].name).to.equal("Member");
        });
    });

    const createUsersAndItems = async function () {
        const User = this.sequelize.define("User", {});
        const Item = this.sequelize.define("Item", { test: type.STRING });

        User.hasOne(Item);
        Item.belongsTo(User);

        this.User = User;
        this.Item = Item;

        await this.sequelize.sync({ force: true });
        const [users, items] = await Promise.all([
            User.bulkCreate([{}, {}, {}]).then(() => {
                return User.findAll();
            }),
            Item.bulkCreate([
                { test: "abc" },
                { test: "def" },
                { test: "ghi" }
            ]).then(() => {
                return Item.findAll();
            })
        ]);
        await Promise.all([
            users[0].setItem(items[0]),
            users[1].setItem(items[1]),
            users[2].setItem(items[2])
        ]);
    };

    describe("where", () => {
        beforeEach(function () {
            return createUsersAndItems.call(this);
        });

        it("should support Sequelize.and()", function () {
            return this.User.findAll({
                include: [
                    { model: this.Item, where: orm.util.and({ test: "def" }) }
                ]
            }).then((result) => {
                expect(result.length).to.eql(1);
                expect(result[0].Item.test).to.eql("def");
            });
        });

        it("should support Sequelize.or()", async function () {
            expect(await this.User.findAll({
                include: [
                    {
                        model: this.Item, where: orm.util.or({
                            test: "def"
                        }, {
                            test: "abc"
                        })
                    }
                ]
            })).to.have.length(2);
        });
    });

    describe("findAndCountAll", () => {
        it("should include associations to findAndCountAll", async function () {
            await createUsersAndItems.call(this);
            const result = await this.User.findAndCountAll({
                include: [
                    {
                        model: this.Item, where: {
                            test: "def"
                        }
                    }
                ]
            });
            expect(result.count).to.eql(1);

            expect(result.rows.length).to.eql(1);
            expect(result.rows[0].Item.test).to.eql("def");
        });
    });

    describe("association getter", () => {
        it("should support getting an include on a N:M association getter", function () {
            const Question = this.sequelize.define("Question", {});
            const Answer = this.sequelize.define("Answer", {});
            const Questionnaire = this.sequelize.define("Questionnaire", {});

            Question.belongsToMany(Answer, { through: "question_answer" });
            Answer.belongsToMany(Question, { through: "question_answer" });

            Questionnaire.hasMany(Question);
            Question.belongsTo(Questionnaire);

            return this.sequelize.sync({ force: true }).then(() => {
                return Questionnaire.create();
            }).then((questionnaire) => {
                return questionnaire.getQuestions({
                    include: Answer
                });
            });
        });
    });

    describe("nested includes", () => {
        beforeEach(function () {
            const Employee = this.sequelize.define("Employee", { name: type.STRING });
            const Team = this.sequelize.define("Team", { name: type.STRING });
            const Clearence = this.sequelize.define("Clearence", { level: type.INTEGER });

            Team.Members = Team.hasMany(Employee, { as: "members" });
            Employee.Clearence = Employee.hasOne(Clearence, { as: "clearence" });
            Clearence.Employee = Clearence.belongsTo(Employee, { as: "employee" });

            this.Employee = Employee;
            this.Team = Team;
            this.Clearence = Clearence;

            return this.sequelize.sync({ force: true }).then(() => {
                return Promise.all([
                    Team.create({ name: "TeamA" }),
                    Team.create({ name: "TeamB" }),
                    Employee.create({ name: "John" }),
                    Employee.create({ name: "Jane" }),
                    Employee.create({ name: "Josh" }),
                    Employee.create({ name: "Jill" }),
                    Clearence.create({ level: 3 }),
                    Clearence.create({ level: 5 })
                ]).then((instances) => {
                    return Promise.all([
                        instances[0].addMembers([instances[2], instances[3]]),
                        instances[1].addMembers([instances[4], instances[5]]),
                        instances[2].setClearence(instances[6]),
                        instances[3].setClearence(instances[7])
                    ]);
                });
            });
        });

        it("should not ripple grandchild required to top level find when required of child is set to false", function () {
            return this.Team.findAll({
                include: [
                    {
                        association: this.Team.Members,
                        required: false,
                        include: [
                            {
                                association: this.Employee.Clearence,
                                required: true
                            }
                        ]
                    }
                ]
            }).then((teams) => {
                expect(teams).to.have.length(2);
            });
        });

        it("should not ripple grandchild required to top level find when required of child is not given (implicitly false)", function () {
            return this.Team.findAll({
                include: [
                    {
                        association: this.Team.Members,
                        include: [
                            {
                                association: this.Employee.Clearence,
                                required: true
                            }
                        ]
                    }
                ]
            }).then((teams) => {
                expect(teams).to.have.length(2);
            });
        });

        it("should ripple grandchild required to top level find when required of child is set to true as well", function () {
            return this.Team.findAll({
                include: [
                    {
                        association: this.Team.Members,
                        required: true,
                        include: [
                            {
                                association: this.Employee.Clearence,
                                required: true
                            }
                        ]
                    }
                ]
            }).then((teams) => {
                expect(teams).to.have.length(1);
            });
        });

    });
});