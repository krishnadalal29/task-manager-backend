import { Entity, Column, ObjectIdColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity()
export class Tag {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column()
    tagName!: string;

    @Column("objectId")
    userId!: ObjectId;
}
