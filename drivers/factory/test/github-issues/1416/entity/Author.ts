import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    OneToMany,
} from "typeorm-core";
import { Photo } from "./Photo";

@Entity()
export class Author {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany((type) => Photo, (photo) => photo.author)
    photos: Photo[];
}
