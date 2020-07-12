import "reflect-metadata";
import { expect } from "chai";
import { SapDriver } from "../../../../src/driver/sap/SapDriver";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
} from "../../../utils/test-utils";
import { Connection } from "../../../../src/connection/Connection";
import { Post } from "./entity/Post";
import { Category } from "./entity/Category";

describe("transaction > transaction with full isolation support", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [`${__dirname}/entity/*{.js,.ts}`],
                enabledDrivers: ["mysql", "mssql", "postgres", "sap"], // todo: for some reasons mariadb tests are not passing here
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should execute all operations in a single transaction with READ UNCOMMITTED isolation level", () =>
        Promise.all(
            connections.map(async (connection) => {
                // SAP does not support READ UNCOMMITTED isolation level
                if (connection.driver instanceof SapDriver) return;

                let postId: number | undefined = undefined;
                let categoryId: number | undefined = undefined;

                await connection.manager.transaction(
                    "READ UNCOMMITTED",
                    async (entityManager) => {
                        const post = new Post();
                        post.title = "Post #1";
                        await entityManager.save(post);

                        const category = new Category();
                        category.name = "Category #1";
                        await entityManager.save(category);

                        postId = post.id;
                        categoryId = category.id;
                    }
                );

                const post = await connection.manager.findOne(Post, {
                    where: { title: "Post #1" },
                });
                expect(post).not.to.be.undefined;
                post!.should.be.eql({
                    id: postId,
                    title: "Post #1",
                });

                const category = await connection.manager.findOne(Category, {
                    where: { name: "Category #1" },
                });
                expect(category).not.to.be.undefined;
                category!.should.be.eql({
                    id: categoryId,
                    name: "Category #1",
                });
            })
        ));

    it("should execute all operations in a single transaction with READ COMMITTED isolation level", () =>
        Promise.all(
            connections.map(async (connection) => {
                let postId: number | undefined = undefined;
                let categoryId: number | undefined = undefined;

                await connection.manager.transaction(
                    "READ COMMITTED",
                    async (entityManager) => {
                        const post = new Post();
                        post.title = "Post #1";
                        await entityManager.save(post);

                        const category = new Category();
                        category.name = "Category #1";
                        await entityManager.save(category);

                        postId = post.id;
                        categoryId = category.id;
                    }
                );

                const post = await connection.manager.findOne(Post, {
                    where: { title: "Post #1" },
                });
                expect(post).not.to.be.undefined;
                post!.should.be.eql({
                    id: postId,
                    title: "Post #1",
                });

                const category = await connection.manager.findOne(Category, {
                    where: { name: "Category #1" },
                });
                expect(category).not.to.be.undefined;
                category!.should.be.eql({
                    id: categoryId,
                    name: "Category #1",
                });
            })
        ));

    it("should execute all operations in a single transaction with REPEATABLE READ isolation level", () =>
        Promise.all(
            connections.map(async (connection) => {
                let postId: number | undefined = undefined;
                let categoryId: number | undefined = undefined;

                await connection.manager.transaction(
                    "REPEATABLE READ",
                    async (entityManager) => {
                        const post = new Post();
                        post.title = "Post #1";
                        await entityManager.save(post);

                        const category = new Category();
                        category.name = "Category #1";
                        await entityManager.save(category);

                        postId = post.id;
                        categoryId = category.id;
                    }
                );

                const post = await connection.manager.findOne(Post, {
                    where: { title: "Post #1" },
                });
                expect(post).not.to.be.undefined;
                post!.should.be.eql({
                    id: postId,
                    title: "Post #1",
                });

                const category = await connection.manager.findOne(Category, {
                    where: { name: "Category #1" },
                });
                expect(category).not.to.be.undefined;
                category!.should.be.eql({
                    id: categoryId,
                    name: "Category #1",
                });
            })
        ));

    it("should execute all operations in a single transaction with SERIALIZABLE isolation level", () =>
        Promise.all(
            connections.map(async (connection) => {
                let postId: number | undefined = undefined;
                let categoryId: number | undefined = undefined;

                await connection.manager.transaction(
                    "SERIALIZABLE",
                    async (entityManager) => {
                        const post = new Post();
                        post.title = "Post #1";
                        await entityManager.save(post);

                        const category = new Category();
                        category.name = "Category #1";
                        await entityManager.save(category);

                        postId = post.id;
                        categoryId = category.id;
                    }
                );

                const post = await connection.manager.findOne(Post, {
                    where: { title: "Post #1" },
                });
                expect(post).not.to.be.undefined;
                post!.should.be.eql({
                    id: postId,
                    title: "Post #1",
                });

                const category = await connection.manager.findOne(Category, {
                    where: { name: "Category #1" },
                });
                expect(category).not.to.be.undefined;
                category!.should.be.eql({
                    id: categoryId,
                    name: "Category #1",
                });
            })
        ));
});
