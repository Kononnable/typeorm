import { Entity } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
import { Column } from "typeorm-core";

@Entity()
export class Abbreviation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
