import {  Entity  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  PrimaryGeneratedColumn  } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    text: string;

    @Column({ select: false })
    authorName: string;
}
