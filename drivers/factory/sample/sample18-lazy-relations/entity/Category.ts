import {Column, Entity, PrimaryGeneratedColumn} from "typeorm-core/build/compiled/src/index";
import {ManyToMany} from "typeorm-core/build/compiled/src/decorator/relations/ManyToMany";
import {Post} from "./Post";

@Entity("sample18_category")
export class Category {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(type => Post, post => post.categories)
    posts: Promise<Post[]>;

}
