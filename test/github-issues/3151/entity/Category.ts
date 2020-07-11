import {
    Column,
    PrimaryGeneratedColumn,
    Entity,
    ManyToMany,
} from "../../../../src";

import { Note } from "./Note";

@Entity()
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string;

    @ManyToMany((type) => Note, (note) => note.categories)
    notes: Note[];
}
