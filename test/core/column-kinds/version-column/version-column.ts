import { expect } from "chai";
import "reflect-metadata";
import { Connection } from "../../../../src";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
    sleep,
} from "../../../utils/test-utils";
import { Post } from "./entity/Post";

describe("column kinds > version column", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [__dirname + "/entity/*{.js,.ts}"],
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("version column should automatically be set by a database", () =>
        Promise.all(
            connections.map(async (connection) => {
                const postRepository = connection.getRepository(Post);

                // save a new post
                const post = new Post();
                post.title = "Post";
                await postRepository.save(post);

                // load and check if version is a date (generated by db)
                const loadedPost = await postRepository.findOne();
                expect(loadedPost).to.be.not.empty;
                expect(loadedPost!.title).to.be.eql("Post");
                expect(loadedPost!.version).to.be.eql(1);
            })
        ));

    it("version column should not update version if no changes were detected", () =>
        Promise.all(
            connections.map(async (connection) => {
                const postRepository = connection.getRepository(Post);

                // save a new post
                const post = new Post();
                post.title = "Post";
                await postRepository.save(post);

                // update post once again
                const loadedPost1 = await postRepository.findOneOrFail();
                await postRepository.save(loadedPost1);

                // load and check if version was a value set by us
                const loadedPost2 = await postRepository.findOne();

                // make sure version is the same
                expect(loadedPost2!.title).to.be.eql("Post");
                expect(loadedPost2!.version).to.be.eql(1);
            })
        ));

    it("version column can also be manually set by user", () =>
        Promise.all(
            connections.map(async (connection) => {
                const postRepository = connection.getRepository(Post);

                // save a new post
                const post = new Post();
                post.title = "Post";
                post.version = 5;
                await postRepository.save(post);

                // load and check if version was a value set by us
                const loadedPost = await postRepository.findOne();
                expect(loadedPost).to.be.not.empty;
                expect(loadedPost!.title).to.be.eql("Post");
                expect(loadedPost!.version).to.be.eql(5);
            })
        ));

    it("version column should be updated automatically on every change", () =>
        Promise.all(
            connections.map(async (connection) => {
                const postRepository = connection.getRepository(Post);

                // save a new post
                const post = new Post();
                post.title = "Post";
                await postRepository.save(post);

                // wait a second
                await sleep(1000);

                // update post once again
                post.title = "Updated Title";
                await postRepository.save(post);

                // check if date was updated
                const loadedPostAfterUpdate = await postRepository.findOne();
                expect(loadedPostAfterUpdate!.version).to.be.eql(2);
            })
        ));

    it("version column should set a custom value when specified", () =>
        Promise.all(
            connections.map(async (connection) => {
                const postRepository = connection.getRepository(Post);

                // save a new post
                const post = new Post();
                post.title = "Post";
                await postRepository.save(post);

                // update post once again
                post.title = "Updated Title";
                post.version = 6;
                await postRepository.save(post);

                // check if date was updated
                const loadedPost = await postRepository.findOne();
                expect(loadedPost!.version).to.be.eql(6);
            })
        ));
});
