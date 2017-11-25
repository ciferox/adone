import Support from "../support";

const { promise } = adone;
const { orm } = adone;
const { type } = orm;
const dialect = Support.getTestDialect();

const sortById = function (a, b) {
    return a.id < b.id ? -1 : 1;
};

describe(Support.getTestDialectTeaser("Includes with schemas"), () => {
    describe("findAll", () => {
        beforeEach(function () {
            const self = this;
            this.fixtureA = async function () {
                await self.sequelize.dropAllSchemas();
                await self.sequelize.createSchema("account");
                const AccUser = self.sequelize.define("AccUser", {}, { schema: "account" });
                const Company = self.sequelize.define("Company", {
                    name: type.STRING
                }, { schema: "account" });
                const Product = self.sequelize.define("Product", {
                    title: type.STRING
                }, { schema: "account" });
                const Tag = self.sequelize.define("Tag", {
                    name: type.STRING
                }, { schema: "account" });
                const Price = self.sequelize.define("Price", {
                    value: type.FLOAT
                }, { schema: "account" });
                const Customer = self.sequelize.define("Customer", {
                    name: type.STRING
                }, { schema: "account" });
                const Group = self.sequelize.define("Group", {
                    name: type.STRING
                }, { schema: "account" });
                const GroupMember = self.sequelize.define("GroupMember", {

                }, { schema: "account" });
                const Rank = self.sequelize.define("Rank", {
                    name: type.STRING,
                    canInvite: {
                        type: type.INTEGER,
                        defaultValue: 0
                    },
                    canRemove: {
                        type: type.INTEGER,
                        defaultValue: 0
                    },
                    canPost: {
                        type: type.INTEGER,
                        defaultValue: 0
                    }
                }, { schema: "account" });

                self.models = {
                    AccUser,
                    Company,
                    Product,
                    Tag,
                    Price,
                    Customer,
                    Group,
                    GroupMember,
                    Rank
                };

                AccUser.hasMany(Product);
                Product.belongsTo(AccUser);

                Product.belongsToMany(Tag, { through: "product_tag" });
                Tag.belongsToMany(Product, { through: "product_tag" });
                Product.belongsTo(Tag, { as: "Category" });
                Product.belongsTo(Company);

                Product.hasMany(Price);
                Price.belongsTo(Product);

                AccUser.hasMany(GroupMember, { as: "Memberships" });
                GroupMember.belongsTo(AccUser);
                GroupMember.belongsTo(Rank);
                GroupMember.belongsTo(Group);
                Group.hasMany(GroupMember, { as: "Memberships" });

                await self.sequelize.sync({ force: true });
                await Promise.all([
                    Group.bulkCreate([
                        { name: "Developers" },
                        { name: "Designers" },
                        { name: "Managers" }
                    ]),
                    Company.bulkCreate([
                        { name: "Sequelize" },
                        { name: "Coca Cola" },
                        { name: "Bonanza" },
                        { name: "NYSE" },
                        { name: "Coshopr" }
                    ]),
                    Rank.bulkCreate([
                        { name: "Admin", canInvite: 1, canRemove: 1, canPost: 1 },
                        { name: "Trustee", canInvite: 1, canRemove: 0, canPost: 1 },
                        { name: "Member", canInvite: 1, canRemove: 0, canPost: 0 }
                    ]),
                    Tag.bulkCreate([
                        { name: "A" },
                        { name: "B" },
                        { name: "C" },
                        { name: "D" },
                        { name: "E" }
                    ])
                ]);
                const [groups, companies, ranks, tags] = await Promise.all([
                    Group.findAll(),
                    Company.findAll(),
                    Rank.findAll(),
                    Tag.findAll()
                ]);

                for (const i of [0, 1, 2, 3, 4]) {
                    const [user, products] = await Promise.all([ // eslint-disable-line
                        AccUser.create(),
                        Product.bulkCreate([
                            { title: "Chair" },
                            { title: "Desk" },
                            { title: "Bed" },
                            { title: "Pen" },
                            { title: "Monitor" }
                        ]).then(() => {
                            return Product.findAll();
                        })
                    ]);

                    const groupMembers = [
                        { AccUserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id },
                        { AccUserId: user.id, GroupId: groups[1].id, RankId: ranks[2].id }
                    ];
                    if (i < 3) {
                        groupMembers.push({ AccUserId: user.id, GroupId: groups[2].id, RankId: ranks[1].id });
                    }

                    await Promise.all([ // eslint-disable-line
                        GroupMember.bulkCreate(groupMembers),
                        user.setProducts([
                            products[i * 5 + 0],
                            products[i * 5 + 1],
                            products[i * 5 + 3]
                        ]),
                        Promise.all([
                            products[i * 5 + 0].setTags([
                                tags[0],
                                tags[2]
                            ]),
                            products[i * 5 + 1].setTags([
                                tags[1]
                            ]),
                            products[i * 5 + 0].setCategory(tags[1]),
                            products[i * 5 + 2].setTags([
                                tags[0]
                            ]),
                            products[i * 5 + 3].setTags([
                                tags[0]
                            ])
                        ]),
                        Promise.all([
                            products[i * 5 + 0].setCompany(companies[4]),
                            products[i * 5 + 1].setCompany(companies[3]),
                            products[i * 5 + 2].setCompany(companies[2]),
                            products[i * 5 + 3].setCompany(companies[1]),
                            products[i * 5 + 4].setCompany(companies[0])
                        ]),
                        Price.bulkCreate([
                            { ProductId: products[i * 5 + 0].id, value: 5 },
                            { ProductId: products[i * 5 + 0].id, value: 10 },
                            { ProductId: products[i * 5 + 1].id, value: 5 },
                            { ProductId: products[i * 5 + 1].id, value: 10 },
                            { ProductId: products[i * 5 + 1].id, value: 15 },
                            { ProductId: products[i * 5 + 1].id, value: 20 },
                            { ProductId: products[i * 5 + 2].id, value: 20 },
                            { ProductId: products[i * 5 + 3].id, value: 20 }
                        ])
                    ]);
                }
            };
        });

        it("should support an include with multiple different association types", async function () {
            const self = this;

            await self.sequelize.dropAllSchemas();
            await self.sequelize.createSchema("account");
            const AccUser = self.sequelize.define("AccUser", {}, { schema: "account" });
            const Product = self.sequelize.define("Product", {
                title: type.STRING
            }, { schema: "account" });
            const Tag = self.sequelize.define("Tag", {
                name: type.STRING
            }, { schema: "account" });
            const Price = self.sequelize.define("Price", {
                value: type.FLOAT
            }, { schema: "account" });
            const Group = self.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });
            const GroupMember = self.sequelize.define("GroupMember", {

            }, { schema: "account" });
            const Rank = self.sequelize.define("Rank", {
                name: type.STRING,
                canInvite: {
                    type: type.INTEGER,
                    defaultValue: 0
                },
                canRemove: {
                    type: type.INTEGER,
                    defaultValue: 0
                }
            }, { schema: "account" });

            AccUser.hasMany(Product);
            Product.belongsTo(AccUser);

            Product.belongsToMany(Tag, { through: "product_tag" });
            Tag.belongsToMany(Product, { through: "product_tag" });
            Product.belongsTo(Tag, { as: "Category" });

            Product.hasMany(Price);
            Price.belongsTo(Product);

            AccUser.hasMany(GroupMember, { as: "Memberships" });
            GroupMember.belongsTo(AccUser);
            GroupMember.belongsTo(Rank);
            GroupMember.belongsTo(Group);
            Group.hasMany(GroupMember, { as: "Memberships" });

            await self.sequelize.sync({ force: true });

            const [groups, ranks, tags] = await Promise.all([
                Group.bulkCreate([
                    { name: "Developers" },
                    { name: "Designers" }
                ]).then(() => {
                    return Group.findAll();
                }),
                Rank.bulkCreate([
                    { name: "Admin", canInvite: 1, canRemove: 1 },
                    { name: "Member", canInvite: 1, canRemove: 0 }
                ]).then(() => {
                    return Rank.findAll();
                }),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ]).then(() => {
                    return Tag.findAll();
                })
            ]);

            for (const i of [0, 1, 2, 3, 4]) {
                const [user, products] = await Promise.all([ // eslint-disable-line
                    AccUser.create(),
                    Product.bulkCreate([
                        { title: "Chair" },
                        { title: "Desk" }
                    ]).then(() => {
                        return Product.findAll();
                    })
                ]);
                await Promise.all([ // eslint-disable-line
                    GroupMember.bulkCreate([
                        { AccUserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id },
                        { AccUserId: user.id, GroupId: groups[1].id, RankId: ranks[1].id }
                    ]),
                    user.setProducts([
                        products[i * 2 + 0],
                        products[i * 2 + 1]
                    ]),
                    products[i * 2 + 0].setTags([
                        tags[0],
                        tags[2]
                    ]),
                    products[i * 2 + 1].setTags([
                        tags[1]
                    ]),
                    products[i * 2 + 0].setCategory(tags[1]),
                    Price.bulkCreate([
                        { ProductId: products[i * 2 + 0].id, value: 5 },
                        { ProductId: products[i * 2 + 0].id, value: 10 },
                        { ProductId: products[i * 2 + 1].id, value: 5 },
                        { ProductId: products[i * 2 + 1].id, value: 10 },
                        { ProductId: products[i * 2 + 1].id, value: 15 },
                        { ProductId: products[i * 2 + 1].id, value: 20 }
                    ])
                ]);
            }

            const users = await AccUser.findAll({
                include: [
                    { model: GroupMember, as: "Memberships", include: [
                        Group,
                        Rank
                    ] },
                    { model: Product, include: [
                        Tag,
                        { model: Tag, as: "Category" },
                        Price
                    ] }
                ],
                order: [
                    [AccUser.rawAttributes.id, "ASC"]
                ]
            });
            users.forEach((user) => {
                expect(user.Memberships).to.be.ok;
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
            });
        });

        it("should support many levels of belongsTo", async function () {
            const A = this.sequelize.define("a", {}, { schema: "account" });
            const B = this.sequelize.define("b", {}, { schema: "account" });
            const C = this.sequelize.define("c", {}, { schema: "account" });
            const D = this.sequelize.define("d", {}, { schema: "account" });
            const E = this.sequelize.define("e", {}, { schema: "account" });
            const F = this.sequelize.define("f", {}, { schema: "account" });
            const G = this.sequelize.define("g", {}, { schema: "account" });
            const H = this.sequelize.define("h", {}, { schema: "account" });

            A.belongsTo(B);
            B.belongsTo(C);
            C.belongsTo(D);
            D.belongsTo(E);
            E.belongsTo(F);
            F.belongsTo(G);
            G.belongsTo(H);

            let b;
            const singles = [
                B,
                C,
                D,
                E,
                F,
                G,
                H
            ];

            await this.sequelize.sync();
            await A.bulkCreate([
                {}, {}, {}, {}, {}, {}, {}, {}
            ]);
            let previousInstance;
            for (const model of singles) {
                const instance = await model.create({}); // eslint-disable-line
                if (previousInstance) {
                    await previousInstance[`set${orm.util.uppercaseFirst(model.name)}`](instance); // eslint-disable-line
                    previousInstance = instance;
                } else {
                    previousInstance = b = instance;
                }
            }
            const as = await A.findAll();
            const promises = [];
            as.forEach((a) => {
                promises.push(a.setB(b));
            });
            await Promise.all(promises);
            {
                const as = await A.findAll({
                    include: [
                        { model: B, include: [
                            { model: C, include: [
                                { model: D, include: [
                                    { model: E, include: [
                                        { model: F, include: [
                                            { model: G, include: [
                                                { model: H }
                                            ] }
                                        ] }
                                    ] }
                                ] }
                            ] }
                        ] }
                    ]
                });
                expect(as.length).to.be.ok;
                as.forEach((a) => {
                    expect(a.b.c.d.e.f.g.h).to.be.ok;
                });
            }
        });

        it("should support ordering with only belongsTo includes", async function () {
            const User = this.sequelize.define("SpecialUser", {}, { schema: "account" });
            const Item = this.sequelize.define("Item", { test: type.STRING }, { schema: "account" });
            const Order = this.sequelize.define("Order", { position: type.INTEGER }, { schema: "account" });

            User.belongsTo(Item, { as: "itemA", foreignKey: "itemA_id" });
            User.belongsTo(Item, { as: "itemB", foreignKey: "itemB_id" });
            User.belongsTo(Order);

            await this.sequelize.sync();
            await Promise.all([
                User.bulkCreate([{}, {}, {}]),
                Item.bulkCreate([
                    { test: "abc" },
                    { test: "def" },
                    { test: "ghi" },
                    { test: "jkl" }
                ]),
                Order.bulkCreate([
                    { position: 2 },
                    { position: 3 },
                    { position: 1 }
                ])
            ]);

            const [users, items, orders] = await Promise.all([
                User.findAll(),
                Item.findAll({ order: ["id"] }),
                Order.findAll({ order: ["id"] })
            ]);
            await Promise.all([
                users[0].setItemA(items[0]),
                users[0].setItemB(items[1]),
                users[0].setOrder(orders[2]),
                users[1].setItemA(items[2]),
                users[1].setItemB(items[3]),
                users[1].setOrder(orders[1]),
                users[2].setItemA(items[0]),
                users[2].setItemB(items[3]),
                users[2].setOrder(orders[0])
            ]);
            const as = await User.findAll({
                include: [
                    { model: Item, as: "itemA", where: { test: "abc" } },
                    { model: Item, as: "itemB" },
                    Order],
                order: [
                    [Order, "position"]
                ]
            });
            expect(as.length).to.eql(2);
            expect(as[0].itemA.test).to.eql("abc");
            expect(as[1].itemA.test).to.eql("abc");
            expect(as[0].Order.position).to.eql(1);
            expect(as[1].Order.position).to.eql(2);
        });

        it("should include attributes from through models", async function () {
            const Product = this.sequelize.define("Product", {
                title: type.STRING
            }, { schema: "account" });
            const Tag = this.sequelize.define("Tag", {
                name: type.STRING
            }, { schema: "account" });
            const ProductTag = this.sequelize.define("ProductTag", {
                priority: type.INTEGER
            }, { schema: "account" });

            Product.belongsToMany(Tag, { through: ProductTag });
            Tag.belongsToMany(Product, { through: ProductTag });

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Product.bulkCreate([
                    { title: "Chair" },
                    { title: "Desk" },
                    { title: "Dress" }
                ]),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ])
            ]);
            const [products, tags] = await Promise.all([
                Product.findAll(),
                Tag.findAll()
            ]);
            await Promise.all([
                products[0].addTag(tags[0], { through: { priority: 1 } }),
                products[0].addTag(tags[1], { through: { priority: 2 } }),
                products[1].addTag(tags[1], { through: { priority: 1 } }),
                products[2].addTag(tags[0], { through: { priority: 3 } }),
                products[2].addTag(tags[1], { through: { priority: 1 } }),
                products[2].addTag(tags[2], { through: { priority: 2 } })
            ]);
            {
                const products = await Product.findAll({
                    include: [
                        { model: Tag }
                    ],
                    order: [
                        ["id", "ASC"],
                        [Tag, "id", "ASC"]
                    ]
                });
                expect(products[0].Tags[0].ProductTag.priority).to.equal(1);
                expect(products[0].Tags[1].ProductTag.priority).to.equal(2);
                expect(products[1].Tags[0].ProductTag.priority).to.equal(1);
                expect(products[2].Tags[0].ProductTag.priority).to.equal(3);
                expect(products[2].Tags[1].ProductTag.priority).to.equal(1);
                expect(products[2].Tags[2].ProductTag.priority).to.equal(2);
            }
        });

        it("should support a required belongsTo include", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {}, { schema: "account" });

            User.belongsTo(Group);

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([{}, {}]),
                User.bulkCreate([{}, {}, {}])
            ]);
            const [groups, users] = await Promise.all([
                Group.findAll(),
                User.findAll()
            ]);
            await users[2].setGroup(groups[1]);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, required: true }
                    ]
                });
                expect(users.length).to.equal(1);
                expect(users[0].Group).to.be.ok;
            }
        });

        it("should be possible to extend the on clause with a where option on a belongsTo include", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group);

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]),
                User.bulkCreate([{}, {}])
            ]);
            const [groups, users] = await Promise.all([
                Group.findAll(),
                User.findAll()
            ]);
            await Promise.all([
                users[0].setGroup(groups[1]),
                users[1].setGroup(groups[0])
            ]);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, where: { name: "A" } }
                    ]
                });
                expect(users.length).to.equal(1);
                expect(users[0].Group).to.be.ok;
                expect(users[0].Group.name).to.equal("A");
            }
        });

        it("should be possible to extend the on clause with a where option on a belongsTo include", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group);

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]),
                User.bulkCreate([{}, {}])
            ]);
            const [groups, users] = await Promise.all([
                Group.findAll(),
                User.findAll()
            ]);
            await Promise.all([
                users[0].setGroup(groups[1]),
                users[1].setGroup(groups[0])
            ]);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, required: true }
                    ]
                });
                users.forEach((user) => {
                    expect(user.Group).to.be.ok;
                });
            }
        });

        it("should be possible to define a belongsTo include as required with child hasMany with limit", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });
            const Category = this.sequelize.define("Category", {
                category: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group);
            Group.hasMany(Category);

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]),
                User.bulkCreate([{}, {}]),
                Category.bulkCreate([{}, {}])
            ]);
            const [groups, users, categories] = await Promise.all([
                Group.findAll(),
                User.findAll(),
                Category.findAll()
            ]);
            const promises = [
                users[0].setGroup(groups[1]),
                users[1].setGroup(groups[0])
            ];
            groups.forEach((group) => {
                promises.push(group.setCategories(categories));
            });
            await Promise.all(promises);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, required: true, include: [
                            { model: Category }
                        ] }
                    ],
                    limit: 1
                });
                expect(users.length).to.equal(1);
                users.forEach((user) => {
                    expect(user.Group).to.be.ok;
                    expect(user.Group.Categories).to.be.ok;
                });
            }
        });

        it("should be possible to define a belongsTo include as required with child hasMany with limit and aliases", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });
            const Category = this.sequelize.define("Category", {
                category: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group, { as: "Team" });
            Group.hasMany(Category, { as: "Tags" });

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]),
                User.bulkCreate([{}, {}]),
                Category.bulkCreate([{}, {}])
            ]);
            const [groups, users, categories] = await Promise.all([
                Group.findAll(),
                User.findAll(),
                Category.findAll()
            ]);
            const promises = [
                users[0].setTeam(groups[1]),
                users[1].setTeam(groups[0])
            ];
            groups.forEach((group) => {
                promises.push(group.setTags(categories));
            });
            await Promise.all(promises);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, required: true, as: "Team", include: [
                            { model: Category, as: "Tags" }
                        ] }
                    ],
                    limit: 1
                });
                expect(users.length).to.equal(1);
                users.forEach((user) => {
                    expect(user.Team).to.be.ok;
                    expect(user.Team.Tags).to.be.ok;
                });
            }
        });

        it("should be possible to define a belongsTo include as required with child hasMany which is not required with limit", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });
            const Category = this.sequelize.define("Category", {
                category: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group);
            Group.hasMany(Category);

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]),
                User.bulkCreate([{}, {}]),
                Category.bulkCreate([{}, {}])
            ]);
            const [groups, users, categories] = await Promise.all([
                Group.findAll(),
                User.findAll(),
                Category.findAll()
            ]);
            const promises = [
                users[0].setGroup(groups[1]),
                users[1].setGroup(groups[0])
            ];
            groups.forEach((group) => {
                promises.push(group.setCategories(categories));
            });
            await Promise.all(promises);
            {
                const users = await User.findAll({
                    include: [
                        { model: Group, required: true, include: [
                            { model: Category, required: false }
                        ] }
                    ],
                    limit: 1
                });
                expect(users.length).to.equal(1);
                users.forEach((user) => {
                    expect(user.Group).to.be.ok;
                    expect(user.Group.Categories).to.be.ok;
                });
            }
        });

        it("should be possible to extend the on clause with a where option on a hasOne include", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Project = this.sequelize.define("Project", {
                title: type.STRING
            }, { schema: "account" });

            User.hasOne(Project, { as: "LeaderOf" });

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Project.bulkCreate([
                    { title: "Alpha" },
                    { title: "Beta" }
                ]),
                User.bulkCreate([{}, {}])
            ]);
            const [projects, users] = await Promise.all([
                Project.findAll(),
                User.findAll()
            ]);
            await Promise.all([
                users[1].setLeaderOf(projects[1]),
                users[0].setLeaderOf(projects[0])
            ]);
            {
                const users = await User.findAll({
                    include: [
                        { model: Project, as: "LeaderOf", where: { title: "Beta" } }
                    ]
                });
                expect(users.length).to.equal(1);
                expect(users[0].LeaderOf).to.be.ok;
                expect(users[0].LeaderOf.title).to.equal("Beta");
            }
        });

        it("should be possible to extend the on clause with a where option on a hasMany include with a through model", async function () {
            const Product = this.sequelize.define("Product", {
                title: type.STRING
            }, { schema: "account" });
            const Tag = this.sequelize.define("Tag", {
                name: type.STRING
            }, { schema: "account" });
            const ProductTag = this.sequelize.define("ProductTag", {
                priority: type.INTEGER
            }, { schema: "account" });

            Product.belongsToMany(Tag, { through: ProductTag });
            Tag.belongsToMany(Product, { through: ProductTag });

            await this.sequelize.sync({ force: true });
            await Promise.all([
                Product.bulkCreate([
                    { title: "Chair" },
                    { title: "Desk" },
                    { title: "Dress" }
                ]),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ])
            ]);
            const [products, tags] = await Promise.all([
                Product.findAll(),
                Tag.findAll()
            ]);
            await Promise.all([
                products[0].addTag(tags[0], { priority: 1 }),
                products[0].addTag(tags[1], { priority: 2 }),
                products[1].addTag(tags[1], { priority: 1 }),
                products[2].addTag(tags[0], { priority: 3 }),
                products[2].addTag(tags[1], { priority: 1 }),
                products[2].addTag(tags[2], { priority: 2 })
            ]);
            {
                const products = await Product.findAll({
                    include: [
                        { model: Tag, where: { name: "C" } }
                    ]
                });
                expect(products.length).to.equal(1);
                expect(products[0].Tags.length).to.equal(1);
            }
        });

        it("should be possible to extend the on clause with a where option on nested includes", async function () {
            const User = this.sequelize.define("User", {
                name: type.STRING
            }, { schema: "account" });
            const Product = this.sequelize.define("Product", {
                title: type.STRING
            }, { schema: "account" });
            const Tag = this.sequelize.define("Tag", {
                name: type.STRING
            }, { schema: "account" });
            const Price = this.sequelize.define("Price", {
                value: type.FLOAT
            }, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });
            const GroupMember = this.sequelize.define("GroupMember", {

            }, { schema: "account" });
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
            }, { schema: "account" });

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
            await Promise.all([
                Group.bulkCreate([
                    { name: "Developers" },
                    { name: "Designers" }
                ]),
                Rank.bulkCreate([
                    { name: "Admin", canInvite: 1, canRemove: 1 },
                    { name: "Member", canInvite: 1, canRemove: 0 }
                ]),
                Tag.bulkCreate([
                    { name: "A" },
                    { name: "B" },
                    { name: "C" }
                ])
            ]);
            const [groups, ranks, tags] = await Promise.all([
                Group.findAll(),
                Rank.findAll(),
                Tag.findAll()
            ]);
            for (const i of [0, 1, 2, 3, 4]) {
                const [user, products] = await Promise.all([ // eslint-disable-line
                    User.create({ name: "FooBarzz" }),
                    Product.bulkCreate([
                        { title: "Chair" },
                        { title: "Desk" }
                    ]).then(() => {
                        return Product.findAll();
                    })
                ]);
                await Promise.all([ // eslint-disable-line
                    GroupMember.bulkCreate([
                        { UserId: user.id, GroupId: groups[0].id, RankId: ranks[0].id },
                        { UserId: user.id, GroupId: groups[1].id, RankId: ranks[1].id }
                    ]),
                    user.setProducts([
                        products[i * 2 + 0],
                        products[i * 2 + 1]
                    ]),
                    products[i * 2 + 0].setTags([
                        tags[0],
                        tags[2]
                    ]),
                    products[i * 2 + 1].setTags([
                        tags[1]
                    ]),
                    products[i * 2 + 0].setCategory(tags[1]),
                    Price.bulkCreate([
                        { ProductId: products[i * 2 + 0].id, value: 5 },
                        { ProductId: products[i * 2 + 0].id, value: 10 },
                        { ProductId: products[i * 2 + 1].id, value: 5 },
                        { ProductId: products[i * 2 + 1].id, value: 10 },
                        { ProductId: products[i * 2 + 1].id, value: 15 },
                        { ProductId: products[i * 2 + 1].id, value: 20 }
                    ])
                ]);
            }
            {
                const users = await User.findAll({
                    include: [
                        { model: GroupMember, as: "Memberships", include: [
                            Group,
                            { model: Rank, where: { name: "Admin" } }
                        ] },
                        { model: Product, include: [
                            Tag,
                            { model: Tag, as: "Category" },
                            { model: Price, where: {
                                value: {
                                    gt: 15
                                }
                            } }
                        ] }
                    ],
                    order: [
                        ["id", "ASC"]
                    ]
                });
                users.forEach((user) => {
                    expect(user.Memberships.length).to.equal(1);
                    expect(user.Memberships[0].Rank.name).to.equal("Admin");
                    expect(user.Products.length).to.equal(1);
                    expect(user.Products[0].Prices.length).to.equal(1);
                });
            }
        });

        it("should be possible to use limit and a where with a belongsTo include", async function () {
            const User = this.sequelize.define("User", {}, { schema: "account" });
            const Group = this.sequelize.define("Group", {
                name: type.STRING
            }, { schema: "account" });

            User.belongsTo(Group);

            await this.sequelize.sync({ force: true });
            const results = await promise.props({
                groups: Group.bulkCreate([
                    { name: "A" },
                    { name: "B" }
                ]).then(() => {
                    return Group.findAll();
                }),
                users: User.bulkCreate([{}, {}, {}, {}]).then(() => {
                    return User.findAll();
                })
            });
            await Promise.all([
                results.users[1].setGroup(results.groups[0]),
                results.users[2].setGroup(results.groups[0]),
                results.users[3].setGroup(results.groups[1]),
                results.users[0].setGroup(results.groups[0])
            ]);
            const users = await User.findAll({
                include: [
                    { model: Group, where: { name: "A" } }
                ],
                limit: 2
            });
            expect(users.length).to.equal(2);

            users.forEach((user) => {
                expect(user.Group.name).to.equal("A");
            });
        });

        it("should be possible use limit, attributes and a where on a belongsTo with additional hasMany includes", function () {
            const self = this;
            return this.fixtureA().then(() => {
                return self.models.Product.findAll({
                    attributes: ["title"],
                    include: [
                        { model: self.models.Company, where: { name: "NYSE" } },
                        { model: self.models.Tag },
                        { model: self.models.Price }
                    ],
                    limit: 3,
                    order: [
                        ["id", "ASC"]
                    ]
                }).then((products) => {
                    expect(products.length).to.equal(3);

                    products.forEach((product) => {
                        expect(product.Company.name).to.equal("NYSE");
                        expect(product.Tags.length).to.be.ok;
                        expect(product.Prices.length).to.be.ok;
                    });
                });
            });
        });

        it("should be possible to use limit and a where on a hasMany with additional includes", function () {
            const self = this;
            return this.fixtureA().then(() => {
                return self.models.Product.findAll({
                    include: [
                        { model: self.models.Company },
                        { model: self.models.Tag },
                        { model: self.models.Price, where: {
                            value: { gt: 5 }
                        } }
                    ],
                    limit: 6,
                    order: [
                        ["id", "ASC"]
                    ]
                }).then((products) => {
                    expect(products.length).to.equal(6);

                    products.forEach((product) => {
                        expect(product.Tags.length).to.be.ok;
                        expect(product.Prices.length).to.be.ok;

                        product.Prices.forEach((price) => {
                            expect(price.value).to.be.above(5);
                        });
                    });
                });
            });
        });

        it("should be possible to use limit and a where on a hasMany with a through model with additional includes", function () {
            const self = this;
            return this.fixtureA().then(() => {
                return self.models.Product.findAll({
                    include: [
                        { model: self.models.Company },
                        { model: self.models.Tag, where: { name: ["A", "B", "C"] } },
                        { model: self.models.Price }
                    ],
                    limit: 10,
                    order: [
                        ["id", "ASC"]
                    ]
                }).then((products) => {
                    expect(products.length).to.equal(10);

                    products.forEach((product) => {
                        expect(product.Tags.length).to.be.ok;
                        expect(product.Prices.length).to.be.ok;

                        product.Tags.forEach((tag) => {
                            expect(["A", "B", "C"]).to.include(tag.name);
                        });
                    });
                });
            });
        });

        it("should support including date fields, with the correct timeszone", function () {
            const User = this.sequelize.define("user", {
                    dateField: type.DATE
                }, { timestamps: false, schema: "account" }),
                Group = this.sequelize.define("group", {
                    dateField: type.DATE
                }, { timestamps: false, schema: "account" });

            User.belongsToMany(Group, { through: "group_user" });
            Group.belongsToMany(User, { through: "group_user" });

            return this.sequelize.sync().then(() => {
                return User.create({ dateField: Date.UTC(2014, 1, 20) }).then((user) => {
                    return Group.create({ dateField: Date.UTC(2014, 1, 20) }).then((group) => {
                        return user.addGroup(group).then(() => {
                            return User.findAll({
                                where: {
                                    id: user.id
                                },
                                include: [Group]
                            }).then((users) => {
                                if (dialect === "sqlite") {
                                    expect(new Date(users[0].dateField).getTime()).to.equal(Date.UTC(2014, 1, 20));
                                    expect(new Date(users[0].groups[0].dateField).getTime()).to.equal(Date.UTC(2014, 1, 20));
                                } else {
                                    expect(users[0].dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
                                    expect(users[0].groups[0].dateField.getTime()).to.equal(Date.UTC(2014, 1, 20));
                                }
                            });
                        });
                    });
                });
            });
        });

    });

    describe("findOne", () => {
        it("should work with schemas", function () {
            const self = this;
            const UserModel = this.sequelize.define("User", {
                Id: {
                    type: type.INTEGER,
                    primaryKey: true
                },
                Name: type.STRING,
                UserType: type.INTEGER,
                Email: type.STRING,
                PasswordHash: type.STRING,
                Enabled: {
                    type: type.BOOLEAN
                },
                CreatedDatetime: type.DATE,
                UpdatedDatetime: type.DATE
            }, {
                schema: "hero",
                tableName: "User",
                timestamps: false
            });

            const UserIdColumn = { type: type.INTEGER, references: { model: UserModel, key: "Id" } };

            const ResumeModel = this.sequelize.define("Resume", {
                Id: {
                    type: type.INTEGER,
                    primaryKey: true
                },
                UserId: UserIdColumn,
                Name: type.STRING,
                Contact: type.STRING,
                School: type.STRING,
                WorkingAge: type.STRING,
                Description: type.STRING,
                PostType: type.INTEGER,
                RefreshDatetime: type.DATE,
                CreatedDatetime: type.DATE
            }, {
                schema: "hero",
                tableName: "resume",
                timestamps: false
            });

            UserModel.hasOne(ResumeModel, {
                foreignKey: "UserId",
                as: "Resume"
            });

            ResumeModel.belongsTo(UserModel, {
                foreignKey: "UserId"
            });

            return self.sequelize.dropAllSchemas().then(() => {
                return self.sequelize.createSchema("hero");
            }).then(() => {
                return self.sequelize.sync({ force: true }).then(() => {
                    return UserModel.find({
                        where: {
                            Id: 1
                        },
                        include: [{
                            model: ResumeModel,
                            as: "Resume"
                        }]
                    });
                });
            });
        });
    });
});
