import { PrimaryGeneratedColumn, Entity, Column } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({
        type: "json",
    })
    meta: any;
}
