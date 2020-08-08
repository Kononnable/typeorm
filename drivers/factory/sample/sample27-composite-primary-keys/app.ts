import "../sample1-simple-entity/node_modules/reflect-metadata";
import { createConnection} from "typeorm-core/build/compiled/src/index";
import {Post} from "./entity/Post";
import {TypeormAndConnectionOptions} from "typeorm-core/build/compiled/src/index";
import { createDriver } from '../../src';

const options:  TypeormAndConnectionOptions = {
    connectionOptions:{
 type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "admin",
    database: "test",
    },
    typeORMOptions:{
           logging: ["query", "error"],
    synchronize: true,
    entities: [Post]
    }


};

createConnection(options, createDriver).then(async connection => {

    let postRepository = connection.getRepository(Post);

    const post = new Post();
    post.id = 1;
    post.type = "person";
    post.text = "this is test post!";

    console.log("saving the post: ");
    await postRepository.save(post);
    console.log("Post has been saved: ", post);

    console.log("now loading the post: ");
    const loadedPost = await postRepository.findOne({ id: 1, type: "person" });
    console.log("loaded post: ", loadedPost);

}, error => console.log("Error: ", error));
