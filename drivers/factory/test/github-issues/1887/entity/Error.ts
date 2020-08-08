import { Entity, PrimaryGeneratedColumn} from "typeorm-core";
import { Column } from "typeorm-core";

@Entity("Error")
export class Error {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("uniqueidentifier", { nullable: false })
    executionGuid: string;

    @Column()
    errorNumber: number;

    @Column()
    errorDescription: string;

    @Column()
    errorDate: Date;
}
