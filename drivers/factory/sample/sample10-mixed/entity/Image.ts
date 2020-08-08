import {Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm-core/build/compiled/src/index";
import {Post} from "./Post";
import {ImageDetails} from "./ImageDetails";
import {JoinColumn} from "typeorm-core/build/compiled/src/decorator/relations/JoinColumn";

@Entity("sample10_image")
export class Image {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToOne(type => Post, post => post.images)
    post: Post;

    @ManyToOne(type => Post, post => post.secondaryImages, {
        cascade: ["insert"]
    })
    secondaryPost: Post;

    @OneToOne(type => ImageDetails, details => details.image, {
        cascade: true
    })
    @JoinColumn()
    details: ImageDetails;

}
