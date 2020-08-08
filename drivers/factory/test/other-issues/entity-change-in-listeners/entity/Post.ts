import { Entity } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";
import { Column } from "typeorm-core";
import { BeforeUpdate  } from "typeorm-core";
import { UpdateDateColumn } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ default: false })
    active: boolean;

    @UpdateDateColumn()
    updateDate: Date;

    @BeforeUpdate()
    beforeUpdate() {
        this.title += "!";
    }
}
