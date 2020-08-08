import { Entity } from "typeorm-core";
import { Column } from "typeorm-core";
import { PrimaryGeneratedColumn } from "typeorm-core";

const transformer = {
    from(value: Date): number {
        return value.getTime();
    },
    to(value: number): Date {
        return new Date(value);
    },
};

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: Date, transformer })
    ts: number;
}
