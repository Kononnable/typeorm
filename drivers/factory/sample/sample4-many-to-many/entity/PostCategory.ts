import {Column, Entity, PrimaryGeneratedColumn} from "typeorm-core/build/compiled/src/index";

@Entity("sample4_post_category")
export class PostCategory {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

}
