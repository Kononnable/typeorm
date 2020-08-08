import {  Entity  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  ObjectIdColumn  } from "typeorm-core";
import {  Index  } from "typeorm-core";
import { ObjectID } from "typeorm-core/build/compiled/src/driver/mongodb/MongoDriver";

@Entity()
@Index(["title", "name"])
@Index(() => ({ title: -1, name: -1, count: 1 }))
@Index("title_name_count", () => ({ title: 1, name: 1, count: 1 }))
@Index("title_name_count_reversed", () => ({ title: -1, name: -1, count: -1 }))
@Index("count_in_background", () => ({ count: -1 }), { background: true })
@Index("count_expire", () => ({ title: -1 }), { expireAfterSeconds: 3600 })
export class Post {
    @ObjectIdColumn()
    id: ObjectID;

    @Column()
    @Index()
    title: string;

    @Column()
    @Index()
    name: string;

    @Column()
    @Index({ unique: true })
    count: number;
}
