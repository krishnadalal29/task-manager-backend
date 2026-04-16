import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../db";
import { Tag } from "../entity/tag";
import { TaskTags } from "../entity/taskTags";
import { Tasks } from "../entity/tasks";

type TaskWithTags = Tasks & { tags: Tag[] };

function getRequestUserId(req: Request): ObjectId {
    if (!req.authUserId) {
        throw new Error("Unauthorized request context (missing user)");
    }
    return req.authUserId;
}

function getHexObjectId(value: unknown): string | null {
    if (value instanceof ObjectId) {
        return value.toHexString();
    }

    if (typeof value === "string" && ObjectId.isValid(value)) {
        return new ObjectId(value).toHexString();
    }

    return null;
}

function parseObjectId(value: unknown, fieldName: string): ObjectId {
    if (typeof value !== "string" || !ObjectId.isValid(value)) {
        throw new Error(`${fieldName} must be a valid ObjectId string`);
    }

    return new ObjectId(value);
}

async function normalizeTagIds(rawTags: unknown[] = [], userId: ObjectId): Promise<ObjectId[]> {
    const tagRepo = AppDataSource.getRepository(Tag);
    const normalized: ObjectId[] = [];
    const seenTagIds = new Set<string>();
    const userHexId = userId.toHexString();

    for (const item of rawTags) {
        if (typeof item !== "string" || !ObjectId.isValid(item)) {
            throw new Error("Invalid tag format (tags must be an array of tag _id strings)");
        }

        const tagObjectId = new ObjectId(item);
        const tagHexId = tagObjectId.toHexString();

        if (seenTagIds.has(tagHexId)) {
            continue;
        }
        seenTagIds.add(tagHexId);

        const found = await tagRepo.findOne({ where: { _id: tagObjectId as any } });
        if (!found) {
            throw new Error(`Tag not found for _id: ${item}`);
        }
        const foundTagUserHexId = getHexObjectId(found.userId);
        if (!foundTagUserHexId || foundTagUserHexId !== userHexId) {
            throw new Error(`Tag not found for _id: ${item}`);
        }

        normalized.push(tagObjectId);
    }

    return normalized;
}

async function buildTasksWithTags(tasks: Tasks[], userId: ObjectId): Promise<TaskWithTags[]> {
    if (tasks.length === 0) {
        return [];
    }

    const taskRepoIds = new Set(tasks.map((task) => task._id.toHexString()));
    const taskTagRepo = AppDataSource.getRepository(TaskTags);
    const tagRepo = AppDataSource.getRepository(Tag);

    const [allTaskTags, allTags] = await Promise.all([
        taskTagRepo.find(),
        tagRepo.find({ where: { userId: userId as any } })
    ]);
    const relevantTaskTags = allTaskTags.filter((taskTag) => {
        const taskHexId = getHexObjectId(taskTag.taskId);
        return !!taskHexId && taskRepoIds.has(taskHexId);
    });

    const tagsById = new Map(allTags.map((tag) => [tag._id.toHexString(), tag]));
    const tagsByTaskId = new Map<string, Tag[]>();

    for (const taskTag of relevantTaskTags) {
        const taskHexId = getHexObjectId(taskTag.taskId);
        const tagHexId = getHexObjectId(taskTag.tagId);

        if (!taskHexId || !tagHexId) {
            continue;
        }

        const tag = tagsById.get(tagHexId);
        if (!tag) {
            continue;
        }

        const existingTags = tagsByTaskId.get(taskHexId) ?? [];
        existingTags.push(tag);
        tagsByTaskId.set(taskHexId, existingTags);
    }

    return tasks.map((task) => ({
        ...task,
        tags: tagsByTaskId.get(task._id.toHexString()) ?? []
    }));
}

async function replaceTaskTags(taskId: ObjectId, tagIds: ObjectId[]): Promise<void> {
    const taskTagRepo = AppDataSource.getRepository(TaskTags);

    await taskTagRepo.delete({ taskId: taskId as any });

    if (tagIds.length === 0) {
        return;
    }

    const links = tagIds.map((tagId) =>
        taskTagRepo.create({
            taskId,
            tagId
        })
    );

    await taskTagRepo.save(links);
}

export const getTasks = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const taskRepo = AppDataSource.getRepository(Tasks);
        const tasks = await taskRepo.find({ where: { userId: userId as any } });
        const tasksWithTags = await buildTasksWithTags(tasks, userId);
        return res.json(tasksWithTags);
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        if (message.startsWith("Unauthorized request context")) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const createTask = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const { taskName, description, tags } = req.body;
        if (!taskName || typeof taskName !== "string") {
            return res.status(400).json({ error: "taskName is required and must be a string" });
        }

        const taskRepo = AppDataSource.getRepository(Tasks);
        let tagIds: ObjectId[] = [];

        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ error: "tags must be an array" });
            }
            tagIds = await normalizeTagIds(tags, userId);
        }

        const newTask = taskRepo.create({ taskName, description, userId });
        const saved = await taskRepo.save(newTask);
        await replaceTaskTags(saved._id, tagIds);

        const [createdTask] = await buildTasksWithTags([saved], userId);

        return res.status(201).json(createdTask);
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        if (
            message.startsWith("Unauthorized request context") ||
            message.startsWith("Invalid tag format") ||
            message.startsWith("Tag not found for _id:") ||
            message.endsWith("must be a valid ObjectId string")
        ) {
            const statusCode = message.startsWith("Unauthorized request context") ? 401 : 400;
            return res.status(statusCode).json({ error: message });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const deleteTask = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const { task_id } = req.params;
        const taskObjectId = parseObjectId(task_id, "task_id");

        const taskRepo = AppDataSource.getRepository(Tasks);
        const taskTagRepo = AppDataSource.getRepository(TaskTags);

        const taskToDelete = await taskRepo.findOne({
            where: { _id: taskObjectId as any, userId: userId as any }
        });
        if (!taskToDelete) {
            return res.status(404).json({ message: "Task not found" });
        }

        const result = await taskRepo.delete({
            _id: taskObjectId as any,
            userId: userId as any
        });
        await taskTagRepo.delete({ taskId: taskObjectId as any });

        if (result.affected === 0) {
            return res.status(404).json({ message: "Task not found" });
        }
        return res.status(201).json({ message: "Task deleted successfully" });

    } catch (err) {
        const message = (err as Error).message ?? "Internal Server Error";
        if (
            message.startsWith("Unauthorized request context") ||
            message.startsWith("Invalid tag _id") ||
            message.startsWith("Tag not found for _id:") ||
            message.endsWith("must be a valid ObjectId string")
        ) {
            const statusCode = message.startsWith("Unauthorized request context") ? 401 : 400;
            return res.status(statusCode).json({ error: message });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
}

export const updateTask = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const userId = getRequestUserId(req);
        const { task_id } = req.params;
        const { taskName, description, tags } = req.body;
        const taskObjectId = parseObjectId(task_id, "task_id");

        const taskRepo = AppDataSource.getRepository(Tasks);
        const existingTask = await taskRepo.findOne({
            where: { _id: taskObjectId as any, userId: userId as any }
        });

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (taskName !== undefined) {
            if (typeof taskName !== "string") {
                return res.status(400).json({ error: "taskName must be a string" });
            }
            existingTask.taskName = taskName;
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({ error: "description must be a string" });
            }
            existingTask.description = description;
        }

        if (tags !== undefined) {
            if (!Array.isArray(tags)) {
                return res.status(400).json({ error: "tags must be an array" });
            }
            const nextTagIds = await normalizeTagIds(tags, userId);
            await replaceTaskTags(existingTask._id, nextTagIds);
        }

        const updated = await taskRepo.save(existingTask);
        const [updatedTask] = await buildTasksWithTags([updated], userId);
        return res.json(updatedTask);
    } catch (err) {
        const message = (err as Error).message ?? "Internal Server Error";
        if (
            message.startsWith("Unauthorized request context") ||
            message.startsWith("Invalid tag _id") ||
            message.startsWith("Tag not found for _id:") ||
            message.endsWith("must be a valid ObjectId string")
        ) {
            const statusCode = message.startsWith("Unauthorized request context") ? 401 : 400;
            return res.status(statusCode).json({ error: message });
        }
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};
