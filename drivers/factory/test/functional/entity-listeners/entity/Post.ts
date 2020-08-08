import { BeforeUpdate } from "typeorm-core";
import { Column } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
import { Entity } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    text: string;

    @BeforeUpdate()
    beforeUpdate() {
        this.title = this.title.trim();
    }
}
