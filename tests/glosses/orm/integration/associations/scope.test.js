describe("scope", function () {
    const { type } = adone.orm;

    beforeEach(function () {
        this.Post = this.sequelize.define("post", {});
        this.Image = this.sequelize.define("image", {});
        this.Question = this.sequelize.define("question", {});
        this.Comment = this.sequelize.define("comment", {
            title: type.STRING,
            commentable: type.STRING,
            commentable_id: type.INTEGER,
            isMain: {
                type: type.BOOLEAN,
                defaultValue: false
            }
        });

        this.Comment.prototype.getItem = function () {
            return this[`get${this.get("commentable").substr(0, 1).toUpperCase()}${this.get("commentable").substr(1)}`]();
        };

        this.Post.addScope("withComments", {
            include: [this.Comment]
        });
        this.Post.addScope("withMainComment", {
            include: [{
                model: this.Comment,
                as: "mainComment"
            }]
        });
        this.Post.hasMany(this.Comment, {
            foreignKey: "commentable_id",
            scope: {
                commentable: "post"
            },
            constraints: false
        });
        this.Post.hasOne(this.Comment, {
            foreignKey: "commentable_id",
            as: "mainComment",
            scope: {
                commentable: "post",
                isMain: true
            },
            constraints: false
        });
        this.Comment.belongsTo(this.Post, {
            foreignKey: "commentable_id",
            as: "post",
            constraints: false
        });

        this.Image.hasMany(this.Comment, {
            foreignKey: "commentable_id",
            scope: {
                commentable: "image"
            },
            constraints: false
        });
        this.Comment.belongsTo(this.Image, {
            foreignKey: "commentable_id",
            as: "image",
            constraints: false
        });

        this.Question.hasMany(this.Comment, {
            foreignKey: "commentable_id",
            scope: {
                commentable: "question"
            },
            constraints: false
        });
        this.Comment.belongsTo(this.Question, {
            foreignKey: "commentable_id",
            as: "question",
            constraints: false
        });
    });

    describe("1:1", () => {
        it("should create, find and include associations with scope values", function () {
            const self = this;
            return this.sequelize.sync({ force: true }).then(() => {
                return Promise.all([
                    self.Post.create(),
                    self.Comment.create({
                        title: "I am a comment"
                    }),
                    self.Comment.create({
                        title: "I am a main comment",
                        isMain: true
                    })
                ]);
            }).then(([post]) => {
                this.post = post;
                return post.createComment({
                    title: "I am a post comment"
                });
            }).then((comment) => {
                expect(comment.get("commentable")).to.equal("post");
                expect(comment.get("isMain")).to.be.false();
                return this.Post.scope("withMainComment").findById(this.post.get("id"));
            }).then((post) => {
                expect(post.mainComment).to.be.null();
                return post.createMainComment({
                    title: "I am a main post comment"
                });
            }).then((mainComment) => {
                this.mainComment = mainComment;
                expect(mainComment.get("commentable")).to.equal("post");
                expect(mainComment.get("isMain")).to.be.true();
                return this.Post.scope("withMainComment").findById(this.post.id);
            }).then((post) => {
                expect(post.mainComment.get("id")).to.equal(this.mainComment.get("id"));
                return post.getMainComment();
            }).then((mainComment) => {
                expect(mainComment.get("commentable")).to.equal("post");
                expect(mainComment.get("isMain")).to.be.true();
                return this.Comment.create({
                    title: "I am a future main comment"
                });
            }).then((comment) => {
                return this.post.setMainComment(comment);
            }).then(() => {
                return this.post.getMainComment();
            }).then((mainComment) => {
                expect(mainComment.get("commentable")).to.equal("post");
                expect(mainComment.get("isMain")).to.be.true();
                expect(mainComment.get("title")).to.equal("I am a future main comment");
            });
        });
    });

    describe("1:M", () => {
        it("should create, find and include associations with scope values", async function () {
            await this.sequelize.sync({ force: true });

            const [post, image, question, commentA, commentB] = await Promise.all([
                this.Post.create(),
                this.Image.create(),
                this.Question.create(),
                this.Comment.create({
                    title: "I am a image comment"
                }),
                this.Comment.create({
                    title: "I am a question comment"
                })
            ]);

            await Promise.all([
                post.createComment({
                    title: "I am a post comment"
                }),
                image.addComment(commentA),
                question.setComments([commentB])
            ]);

            const comments = await this.Comment.findAll();

            comments.forEach((comment) => {
                expect(comment.get("commentable")).to.be.ok();
            });
            expect(comments.map((comment) => {
                return comment.get("commentable");
            }).sort()).to.deep.equal(["image", "post", "question"]);

            const [postComments, imageComments, questionComments] = await Promise.all([
                post.getComments(),
                image.getComments(),
                question.getComments()
            ]);

            expect(postComments.length).to.equal(1);
            expect(postComments[0].get("title")).to.equal("I am a post comment");
            expect(imageComments.length).to.equal(1);
            expect(imageComments[0].get("title")).to.equal("I am a image comment");
            expect(questionComments.length).to.equal(1);
            expect(questionComments[0].get("title")).to.equal("I am a question comment");

            const [postComment] = postComments;
            const [imageComment] = imageComments;
            const [questionComment] = questionComments;

            {
                const [post, image, question] = await Promise.all([
                    postComment.getItem(),
                    imageComment.getItem(),
                    questionComment.getItem()
                ]);
                expect(post).to.be.instanceof(this.Post);
                expect(image).to.be.instanceof(this.Image);
                expect(question).to.be.instanceof(this.Question);
            }
            {
                const [post, image, question] = await Promise.all([
                    this.Post.find({
                        include: [this.Comment]
                    }),
                    this.Image.findOne({
                        include: [this.Comment]
                    }),
                    this.Question.findOne({
                        include: [this.Comment]
                    })
                ]);
                expect(post.comments.length).to.equal(1);
                expect(post.comments[0].get("title")).to.equal("I am a post comment");
                expect(image.comments.length).to.equal(1);
                expect(image.comments[0].get("title")).to.equal("I am a image comment");
                expect(question.comments.length).to.equal(1);
                expect(question.comments[0].get("title")).to.equal("I am a question comment");
            }
        });

        it("should make the same query if called multiple time (#4470)", function () {
            const self = this;
            const logs = [];
            const logging = function (log) {
                logs.push(log);
            };

            return this.sequelize.sync({ force: true }).then(() => {
                return self.Post.create();
            }).then((post) => {
                return post.createComment({
                    title: "I am a post comment"
                });
            }).then(() => {
                return self.Post.scope("withComments").findAll({
                    logging
                });
            }).then(() => {
                return self.Post.scope("withComments").findAll({
                    logging
                });
            }).then(() => {
                expect(logs[0]).to.equal(logs[1]);
            });
        });
    });

    if (this.getTestDialect() !== "sqlite") {
        describe("N:M", () => {
            describe("on the target", () => {
                beforeEach(function () {
                    this.Post = this.sequelize.define("post", {});
                    this.Tag = this.sequelize.define("tag", {
                        type: type.STRING
                    });
                    this.PostTag = this.sequelize.define("post_tag");

                    this.Tag.belongsToMany(this.Post, { through: this.PostTag });
                    this.Post.belongsToMany(this.Tag, { as: "categories", through: this.PostTag, scope: { type: "category" } });
                    this.Post.belongsToMany(this.Tag, { as: "tags", through: this.PostTag, scope: { type: "tag" } });
                });

                it("should create, find and include associations with scope values", async function () {
                    const self = this;
                    await Promise.all([
                        self.Post.sync({ force: true }),
                        self.Tag.sync({ force: true })
                    ]);
                    await self.PostTag.sync({ force: true });
                    const [postA, postB, postC, categoryA, categoryB, tagA, tagB] = await Promise.all([
                        self.Post.create(),
                        self.Post.create(),
                        self.Post.create(),
                        self.Tag.create({ type: "category" }),
                        self.Tag.create({ type: "category" }),
                        self.Tag.create({ type: "tag" }),
                        self.Tag.create({ type: "tag" })
                    ]);
                    await Promise.all([
                        postA.addCategory(categoryA),
                        postB.setCategories([categoryB]),
                        postC.createCategory(),
                        postA.createTag(),
                        postB.addTag(tagA),
                        postC.setTags([tagB])
                    ]);
                    const [postACategories, postATags, postBCategories, postBTags, postCCategories, postCTags] = await Promise.all([
                        postA.getCategories(),
                        postA.getTags(),
                        postB.getCategories(),
                        postB.getTags(),
                        postC.getCategories(),
                        postC.getTags()
                    ]);
                    expect(postACategories.length).to.equal(1);
                    expect(postATags.length).to.equal(1);
                    expect(postBCategories.length).to.equal(1);
                    expect(postBTags.length).to.equal(1);
                    expect(postCCategories.length).to.equal(1);
                    expect(postCTags.length).to.equal(1);

                    expect(postACategories[0].get("type")).to.equal("category");
                    expect(postATags[0].get("type")).to.equal("tag");
                    expect(postBCategories[0].get("type")).to.equal("category");
                    expect(postBTags[0].get("type")).to.equal("tag");
                    expect(postCCategories[0].get("type")).to.equal("category");
                    expect(postCTags[0].get("type")).to.equal("tag");
                    const [_postA, _postB, _postC] = await Promise.all([
                        self.Post.findOne({
                            where: {
                                id: postA.get("id")
                            },
                            include: [
                                { model: self.Tag, as: "tags" },
                                { model: self.Tag, as: "categories" }
                            ]
                        }),
                        self.Post.findOne({
                            where: {
                                id: postB.get("id")
                            },
                            include: [
                                { model: self.Tag, as: "tags" },
                                { model: self.Tag, as: "categories" }
                            ]
                        }),
                        self.Post.findOne({
                            where: {
                                id: postC.get("id")
                            },
                            include: [
                                { model: self.Tag, as: "tags" },
                                { model: self.Tag, as: "categories" }
                            ]
                        })
                    ]);
                    expect(_postA.get("categories").length).to.equal(1);
                    expect(_postA.get("tags").length).to.equal(1);
                    expect(_postB.get("categories").length).to.equal(1);
                    expect(_postB.get("tags").length).to.equal(1);
                    expect(_postC.get("categories").length).to.equal(1);
                    expect(_postC.get("tags").length).to.equal(1);

                    expect(_postA.get("categories")[0].get("type")).to.equal("category");
                    expect(_postA.get("tags")[0].get("type")).to.equal("tag");
                    expect(_postB.get("categories")[0].get("type")).to.equal("category");
                    expect(_postB.get("tags")[0].get("type")).to.equal("tag");
                    expect(_postC.get("categories")[0].get("type")).to.equal("category");
                    expect(_postC.get("tags")[0].get("type")).to.equal("tag");
                });
            });

            describe("on the through model", () => {
                beforeEach(function () {
                    this.Post = this.sequelize.define("post", {});
                    this.Image = this.sequelize.define("image", {});
                    this.Question = this.sequelize.define("question", {});

                    this.ItemTag = this.sequelize.define("item_tag", {
                        id: {
                            type: type.INTEGER,
                            primaryKey: true,
                            autoIncrement: true
                        },
                        tag_id: {
                            type: type.INTEGER,
                            unique: "item_tag_taggable"
                        },
                        taggable: {
                            type: type.STRING,
                            unique: "item_tag_taggable"
                        },
                        taggable_id: {
                            type: type.INTEGER,
                            unique: "item_tag_taggable",
                            references: null
                        }
                    });
                    this.Tag = this.sequelize.define("tag", {
                        name: type.STRING
                    });

                    this.Post.belongsToMany(this.Tag, {
                        through: {
                            model: this.ItemTag,
                            unique: false,
                            scope: {
                                taggable: "post"
                            }
                        },
                        foreignKey: "taggable_id",
                        constraints: false
                    });
                    this.Tag.belongsToMany(this.Post, {
                        through: {
                            model: this.ItemTag,
                            unique: false
                        },
                        foreignKey: "tag_id"
                    });

                    this.Image.belongsToMany(this.Tag, {
                        through: {
                            model: this.ItemTag,
                            unique: false,
                            scope: {
                                taggable: "image"
                            }
                        },
                        foreignKey: "taggable_id",
                        constraints: false
                    });
                    this.Tag.belongsToMany(this.Image, {
                        through: {
                            model: this.ItemTag,
                            unique: false
                        },
                        foreignKey: "tag_id"
                    });

                    this.Question.belongsToMany(this.Tag, {
                        through: {
                            model: this.ItemTag,
                            unique: false,
                            scope: {
                                taggable: "question"
                            }
                        },
                        foreignKey: "taggable_id",
                        constraints: false
                    });
                    this.Tag.belongsToMany(this.Question, {
                        through: {
                            model: this.ItemTag,
                            unique: false
                        },
                        foreignKey: "tag_id"
                    });
                });

                it("should create, find and include associations with scope values", async function () {
                    const self = this;
                    await Promise.all([
                        this.Post.sync({ force: true }),
                        this.Image.sync({ force: true }),
                        this.Question.sync({ force: true }),
                        this.Tag.sync({ force: true })
                    ]);
                    await this.ItemTag.sync({ force: true });
                    const [post, image, question, tagA, tagB, tagC] = await Promise.all([
                        this.Post.create(),
                        this.Image.create(),
                        this.Question.create(),
                        this.Tag.create({ name: "tagA" }),
                        this.Tag.create({ name: "tagB" }),
                        this.Tag.create({ name: "tagC" })
                    ]);
                    await Promise.all([
                        post.setTags([tagA]).then(() => {
                            return Promise.all([
                                post.createTag({ name: "postTag" }),
                                post.addTag(tagB)
                            ]);
                        }),
                        image.setTags([tagB]).then(() => {
                            return Promise.all([
                                image.createTag({ name: "imageTag" }),
                                image.addTag(tagC)
                            ]);
                        }),
                        question.setTags([tagC]).then(() => {
                            return Promise.all([
                                question.createTag({ name: "questionTag" }),
                                question.addTag(tagA)
                            ]);
                        })
                    ]);

                    const [postTags, imageTags, questionTags] = await Promise.all([
                        post.getTags(),
                        image.getTags(),
                        question.getTags()
                    ]);

                    expect(postTags.length).to.equal(3);
                    expect(imageTags.length).to.equal(3);
                    expect(questionTags.length).to.equal(3);

                    expect(postTags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["postTag", "tagA", "tagB"]);

                    expect(imageTags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["imageTag", "tagB", "tagC"]);

                    expect(questionTags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["questionTag", "tagA", "tagC"]);

                    const [_post, _image, _question] = await Promise.all([
                        self.Post.findOne({
                            where: {},
                            include: [self.Tag]
                        }),
                        self.Image.findOne({
                            where: {},
                            include: [self.Tag]
                        }),
                        self.Question.findOne({
                            where: {},
                            include: [self.Tag]
                        })
                    ]);
                    expect(_post.tags.length).to.equal(3);
                    expect(_image.tags.length).to.equal(3);
                    expect(_question.tags.length).to.equal(3);

                    expect(_post.tags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["postTag", "tagA", "tagB"]);

                    expect(_image.tags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["imageTag", "tagB", "tagC"]);

                    expect(_question.tags.map((tag) => {
                        return tag.name;
                    }).sort()).to.deep.equal(["questionTag", "tagA", "tagC"]);
                });
            });
        });
    }
});
