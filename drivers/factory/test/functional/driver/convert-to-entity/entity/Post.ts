import {  Entity  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  PrimaryColumn  } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryColumn("int")
    id: number;

    @Column({ nullable: true })
    isNew: boolean;
}
