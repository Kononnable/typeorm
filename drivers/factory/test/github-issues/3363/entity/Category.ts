import { PrimaryGeneratedColumn } from "typeorm-core";
import { Column } from "typeorm-core";
import { Entity } from "typeorm-core";

@Entity()
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
