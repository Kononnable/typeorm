import "../sample1-simple-entity/node_modules/reflect-metadata";
import {createConnection} from "typeorm-core/build/compiled/src/index";
import {Post} from "./entity/Post";
import {BasePost} from "./entity/BasePost";
import {TypeormAndConnectionOptions} from "typeorm-core/build/compiled/src/index";
import { createDriver } from '../../src';

const options: TypeormAndConnectionOptions = {
    connectionOptions:{
        type: "mysql",
        host: "localhost",
        port: 3306,
        username: "test",
        password: "test",
        database: "test",
    },
    typeORMOptions:{
        logging: ["query", "error"],
        synchronize: true,
        entities: [Post, BasePost]
    }
};

createConnection(options, createDriver).then(connection => {

    let post = new Post();
    post.text = "Hello how are you?";
    post.title = "hello";
    post.likesCount = 0;

    let postRepository = connection.getRepository(Post);

    postRepository
        .save(post)
        .then(post => console.log("Post has been saved"));

}, error => console.log("Cannot connect: ", error));
