import {  PrimaryGeneratedColumn  } from "typeorm-core";
import {  Entity  } from "typeorm-core";
import {  Column  } from "typeorm-core";
import {  Index  } from "typeorm-core";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("geometry", {
        nullable: true,
    })
    @Index({
        spatial: true,
    })
    geom: object;

    @Column("geometry", {
        nullable: true,
        spatialFeatureType: "Point",
    })
    pointWithoutSRID: object;

    @Column("geometry", {
        nullable: true,
        spatialFeatureType: "Point",
        srid: 4326,
    })
    point: object;

    @Column("geography", {
        nullable: true,
    })
    geog: object;
}
