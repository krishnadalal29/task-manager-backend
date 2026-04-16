import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../db";
import { Tag } from "../entity/tag";
import { TaskTags } from "../entity/taskTags";

function getRequestUserId(req: Request): ObjectId {
    if (!req.authUserId) {
        throw new Error("Unauthorized request context (missing user)");
    }
    return req.authUserId;
}

export const getTags = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const tagRepo = AppDataSource.getRepository(Tag);
        const tags = await tagRepo.find({ where: { userId: userId as any } });
        return res.json(tags);
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        if (message.startsWith("Unauthorized request context")) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const createTag = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const { tagName } = req.body;
        if (!tagName || typeof tagName !== "string") {
            return res.status(400).json({ error: "tagName is required and must be a string" });
        }

        const tagRepo = AppDataSource.getRepository(Tag);
        const existing = await tagRepo.findOne({ where: { tagName, userId: userId as any } });

        if (existing) {
            return res.status(409).json({ error: "tag already exists", tag: existing });
        }

        const newTag = tagRepo.create({ tagName, userId });
        const saved = await tagRepo.save(newTag);

        return res.status(201).json([saved]);
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        if (message.startsWith("Unauthorized request context")) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const deleteTag = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const { tag_id } = req.params;
        if (!ObjectId.isValid(tag_id)) {
            return res.status(400).json({ error: "tag_id must be a valid ObjectId string" });
        }

        const tagRepo = AppDataSource.getRepository(Tag);
        const taskTagRepo = AppDataSource.getRepository(TaskTags);
        const tagObjectId = new ObjectId(tag_id);

        const existing = await tagRepo.findOne({
            where: { _id: tagObjectId as any, userId: userId as any }
        });
        if (!existing) {
            return res.status(404).json({ message: "Tag not found" });
        }

        const result = await tagRepo.delete({
            _id: tagObjectId,
            userId: userId as any
        });
        if (result.affected === 0) {
            return res.status(404).json({ message: "Tag not found" });
        }

        await taskTagRepo.delete({ tagId: tagObjectId as any });

        return res.status(201).json({ message: "Tag deleted successfully" });
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        if (message.startsWith("Unauthorized request context")) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};
