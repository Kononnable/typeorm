import { Entity } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
import { Column } from "typeorm-core";

@Entity()
export class B {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}
