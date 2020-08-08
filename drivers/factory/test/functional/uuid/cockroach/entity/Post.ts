import {  PrimaryGeneratedColumn  } from "typeorm-core";
import {  Entity  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  Generated  } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    @Generated("uuid")
    uuid: string;
}
