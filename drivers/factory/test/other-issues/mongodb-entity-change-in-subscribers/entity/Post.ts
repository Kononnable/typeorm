import { Entity, ObjectIdColumn, ObjectID } from "typeorm-core";
import { Column } from "typeorm-core";
import { UpdateDateColumn } from "typeorm-core";
@Entity()
export class Post {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    title: string;

    @Column()
    active: boolean = false;

    @UpdateDateColumn()
    updateDate: Date;

    @Column()
    updatedColumns: number | string[] = 0;

    loaded: boolean = false;
}
