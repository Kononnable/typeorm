import { Entity, PrimaryGeneratedColumn, Column } from "typeorm-core";

@Entity()
export class Role {
    @PrimaryGeneratedColumn() id: number;

    @Column() name: string;
}
