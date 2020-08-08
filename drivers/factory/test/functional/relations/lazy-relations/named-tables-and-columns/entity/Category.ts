import {  Entity  } from "typeorm-core";
import {  PrimaryGeneratedColumn  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  ManyToMany  } from "typeorm-core";
import {  OneToMany  } from "typeorm-core";
import {  OneToOne  } from "typeorm-core";
import { Post } from "./Post";

@Entity("s_category_named_all", {
    orderBy: {
        id: "ASC",
    },
})
export class Category {
    @PrimaryGeneratedColumn({
        name: "s_category_id",
    })
    id: number;

    @Column()
    name: string;

    @OneToOne((type) => Post, (post) => post.oneCategory)
    onePost: Promise<Post>;

    @ManyToMany((type) => Post, (post) => post.twoSideCategories)
    twoSidePosts: Promise<Post[]>;

    @OneToMany((type) => Post, (post) => post.twoSideCategory)
    twoSidePosts2: Promise<Post[]>;

    // ManyToMany with named properties
    @ManyToMany((type) => Post, (post) => post.categoriesNamedAll)
    postsNamedAll: Promise<Post[]>;

    // OneToMany with named properties
    @OneToMany((type) => Post, (post) => post.categoryNamedAll)
    onePostsNamedAll: Promise<Post[]>;

    // OneToOne with named properties
    @OneToOne((type) => Post, (post) => post.oneCategoryNamedAll)
    onePostNamedAll: Promise<Post>;
}
