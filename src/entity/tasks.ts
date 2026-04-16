import { Entity, ObjectIdColumn, Column } from "typeorm";
import { ObjectId } from "mongodb";

@Entity()
export class Tasks {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column()
    taskName!: string;

    @Column()
    description?: string;

    @Column("objectId")
    userId!: ObjectId;
}
