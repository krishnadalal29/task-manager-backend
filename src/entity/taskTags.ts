import { Entity, ObjectIdColumn, Column } from "typeorm";
import { ObjectId } from "mongodb";

@Entity()
export class TaskTags {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column("objectId")
    taskId!: ObjectId

    @Column("objectId")
    tagId!: ObjectId
}
