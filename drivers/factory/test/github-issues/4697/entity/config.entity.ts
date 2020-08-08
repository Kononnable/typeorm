import { Entity, ObjectIdColumn, Column } from "typeorm-core";
import { ObjectID } from "typeorm-core/build/compiled/src/driver/mongodb/MongoDriver";
/**
 * @deprecated use item config instead
 */
@Entity()
export class Config {
    @ObjectIdColumn()
    _id: ObjectID;

    @Column()
    itemId: string;

    @Column({ type: "json" })
    data: any;
}
