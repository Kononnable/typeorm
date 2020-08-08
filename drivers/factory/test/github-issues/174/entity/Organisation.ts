import { Entity } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
import { Column } from "typeorm-core";
import { Contact } from "./Contact";

@Entity()
export class Organisation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column((type) => Contact)
    contact: Contact;
}
