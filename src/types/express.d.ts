import { ObjectId } from "mongodb";
import { User } from "../entity/user";

declare global {
    namespace Express {
        interface Request {
            authToken?: string;
            authUserId?: ObjectId;
            authUser?: User;
        }
    }
}

export {};
