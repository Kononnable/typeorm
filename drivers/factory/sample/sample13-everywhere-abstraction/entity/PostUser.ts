import {Column, Entity, PrimaryGeneratedColumn} from "typeorm-core/build/compiled/src/index";

@Entity("sample13_post_user")
export class PostUser {

    @PrimaryGeneratedColumn()
    id: number;

    @Column("int")
    name: string;

    @Column()
    firstName: string;

    @Column()
    secondName: string;

}
