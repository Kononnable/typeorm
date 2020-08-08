import { Entity } from "typeorm-core";
import { Column } from "typeorm-core";
import { ManyToOne  } from "typeorm-core";
import { PrimaryColumn } from "typeorm-core";
import { Company } from "./Company";

@Entity()
export class User {
    @PrimaryColumn()
    id: number;

    @Column()
    name: string;

    @ManyToOne((type) => Company, (company) => company.id, {
        deferrable: "INITIALLY DEFERRED",
    })
    company: Company;
}
