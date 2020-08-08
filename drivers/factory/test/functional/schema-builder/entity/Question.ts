import { Entity } from "typeorm-core";
import { Column } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";

@Entity()
export class Question {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
