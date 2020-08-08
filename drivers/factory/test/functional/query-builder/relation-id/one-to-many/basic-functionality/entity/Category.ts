import {  Entity  } from "typeorm-core";
import {  PrimaryGeneratedColumn  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  ManyToOne  } from "typeorm-core";
import {  OneToMany  } from "typeorm-core";
import { Image } from "./Image";
import { Post } from "./Post";

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    isRemoved: boolean = false;

    @OneToMany((type) => Image, (image) => image.category)
    images: Image[];

    imageIds: number[];

    @ManyToOne((type) => Post, (post) => post.categories)
    post: Post;

    postId: number;
}
