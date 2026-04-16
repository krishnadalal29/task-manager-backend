import { Column, Entity, ObjectIdColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity()
export class User {
    @ObjectIdColumn()
    _id!: ObjectId;

    @Column()
    provider!: string;

    @Column()
    providerId!: string;

    @Column()
    email?: string;

    @Column()
    name!: string;

    @Column()
    picture?: string;

    @Column()
    passwordHash?: string;

    @Column()
    passwordSalt?: string;

    @Column()
    createdAt!: Date;

    @Column()
    updatedAt!: Date;
}
