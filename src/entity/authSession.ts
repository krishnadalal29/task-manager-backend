import { Column, Entity, ObjectIdColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity()
export class AuthSession {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column("objectId")
    userId!: ObjectId;

    @Column()
    tokenHash!: string;

    @Column()
    createdAt!: Date;

    @Column()
    expiresAt!: Date;

    @Column({ default: false })
    is_expired: boolean = false;

    @Column({ default: false })
    is_logged_out: boolean = false;

    @Column({ default: false })
    is_deleted: boolean = false;
}
