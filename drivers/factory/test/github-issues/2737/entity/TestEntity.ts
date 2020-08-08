import { Entity } from "typeorm-core";
import { Column } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
@Entity()
export class TestEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 100, nullable: true, unique: true })
    unique_column: string;

    @Column({ type: "varchar", length: 100, nullable: true, unique: false })
    nonunique_column: string;
}
