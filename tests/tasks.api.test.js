const { ObjectId } = require("mongodb");
const request = require("supertest");

jest.mock("../dist/db", () => {
  const { createMockDataSource } = require("./helpers/mockDataSource");
  return {
    AppDataSource: createMockDataSource()
  };
});

const app = require("../dist/app").default;
const { AppDataSource } = require("../dist/db");
const { AuthSession } = require("../dist/entity/authSession");
const { Tag } = require("../dist/entity/tag");
const { Tasks } = require("../dist/entity/tasks");
const { TaskTags } = require("../dist/entity/taskTags");
const { User } = require("../dist/entity/user");
const { hashAuthToken } = require("../dist/middleware/authMiddleware");

async function createAuthenticatedUser(token = "valid-token") {
  const userRepo = AppDataSource.getRepository(User);
  const sessionRepo = AppDataSource.getRepository(AuthSession);

  const user = await userRepo.save(
    userRepo.create({
      provider: "local",
      providerId: `${token}@example.com`,
      email: `${token}@example.com`,
      name: "Test User",
      createdAt: new Date(),
      updatedAt: new Date()
    })
  );

  await sessionRepo.save(
    sessionRepo.create({
      userId: user._id,
      tokenHash: hashAuthToken(token),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      is_expired: false,
      is_logged_out: false,
      is_deleted: false
    })
  );

  return { token, user };
}

describe("Tasks API", () => {
  beforeEach(() => {
    AppDataSource.reset();
  });

  test("POST /api/tasks/createTask creates task with tags", async () => {
    const { token, user } = await createAuthenticatedUser();
    const tagRepo = AppDataSource.getRepository(Tag);

    const tag = await tagRepo.save(
      tagRepo.create({
        tagName: "backend",
        userId: user._id
      })
    );

    const response = await request(app)
      .post("/api/tasks/createTask")
      .set("Authorization", `Bearer ${token}`)
      .send({
        taskName: "Write tests",
        description: "Create API tests with Jest",
        tags: [tag._id.toHexString()]
      });

    const taskRepo = AppDataSource.getRepository(Tasks);
    const taskTagRepo = AppDataSource.getRepository(TaskTags);
    const tasks = await taskRepo.find({ where: { userId: user._id } });
    const taskTags = await taskTagRepo.find();

    expect(response.status).toBe(201);
    expect(response.body.taskName).toBe("Write tests");
    expect(response.body.tags).toHaveLength(1);
    expect(tasks).toHaveLength(1);
    expect(taskTags).toHaveLength(1);
  });

  test("POST /api/tasks/createTask rejects unknown tag ids", async () => {
    const { token } = await createAuthenticatedUser();
    const unknownTagId = new ObjectId().toHexString();

    const response = await request(app)
      .post("/api/tasks/createTask")
      .set("Authorization", `Bearer ${token}`)
      .send({
        taskName: "Write tests",
        tags: [unknownTagId]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Tag not found");
  });

  test("GET /api/tasks/getAllTasks returns current user's tasks with tags", async () => {
    const userOne = await createAuthenticatedUser("token-user-one");
    const userTwo = await createAuthenticatedUser("token-user-two");
    const tagRepo = AppDataSource.getRepository(Tag);
    const taskRepo = AppDataSource.getRepository(Tasks);
    const taskTagRepo = AppDataSource.getRepository(TaskTags);

    const userOneTag = await tagRepo.save(
      tagRepo.create({
        tagName: "priority",
        userId: userOne.user._id
      })
    );
    const userOneTask = await taskRepo.save(
      taskRepo.create({
        taskName: "User one task",
        description: "Visible for user one",
        userId: userOne.user._id
      })
    );
    await taskTagRepo.save(
      taskTagRepo.create({
        taskId: userOneTask._id,
        tagId: userOneTag._id
      })
    );

    await taskRepo.save(
      taskRepo.create({
        taskName: "User two task",
        description: "Should not be returned",
        userId: userTwo.user._id
      })
    );

    const response = await request(app)
      .get("/api/tasks/getAllTasks")
      .set("Authorization", `Bearer ${userOne.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].taskName).toBe("User one task");
    expect(response.body[0].tags).toHaveLength(1);
    expect(response.body[0].tags[0].tagName).toBe("priority");
  });

  test("PUT /api/tasks/updateTask/:task_id updates fields and replaces tags", async () => {
    const { token, user } = await createAuthenticatedUser();
    const tagRepo = AppDataSource.getRepository(Tag);
    const taskRepo = AppDataSource.getRepository(Tasks);
    const taskTagRepo = AppDataSource.getRepository(TaskTags);

    const oldTag = await tagRepo.save(
      tagRepo.create({
        tagName: "old-tag",
        userId: user._id
      })
    );
    const newTag = await tagRepo.save(
      tagRepo.create({
        tagName: "new-tag",
        userId: user._id
      })
    );

    const task = await taskRepo.save(
      taskRepo.create({
        taskName: "Old task",
        description: "Old description",
        userId: user._id
      })
    );
    await taskTagRepo.save(
      taskTagRepo.create({
        taskId: task._id,
        tagId: oldTag._id
      })
    );

    const response = await request(app)
      .put(`/api/tasks/updateTask/${task._id.toHexString()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        taskName: "Updated task",
        description: "Updated description",
        tags: [newTag._id.toHexString()]
      });

    const taskTags = await taskTagRepo.find({ where: { taskId: task._id } });

    expect(response.status).toBe(200);
    expect(response.body.taskName).toBe("Updated task");
    expect(response.body.description).toBe("Updated description");
    expect(response.body.tags).toHaveLength(1);
    expect(response.body.tags[0].tagName).toBe("new-tag");
    expect(taskTags).toHaveLength(1);
    expect(taskTags[0].tagId.toHexString()).toBe(newTag._id.toHexString());
  });

  test("DELETE /api/tasks/deleteTask/:task_id deletes task and mapping rows", async () => {
    const { token, user } = await createAuthenticatedUser();
    const taskRepo = AppDataSource.getRepository(Tasks);
    const taskTagRepo = AppDataSource.getRepository(TaskTags);

    const task = await taskRepo.save(
      taskRepo.create({
        taskName: "Task to delete",
        description: "Cleanup",
        userId: user._id
      })
    );
    await taskTagRepo.save(
      taskTagRepo.create({
        taskId: task._id,
        tagId: new ObjectId()
      })
    );

    const response = await request(app)
      .delete(`/api/tasks/deleteTask/${task._id.toHexString()}`)
      .set("Authorization", `Bearer ${token}`);

    const tasks = await taskRepo.find({ where: { userId: user._id } });
    const taskTags = await taskTagRepo.find({ where: { taskId: task._id } });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Task deleted successfully");
    expect(tasks).toHaveLength(0);
    expect(taskTags).toHaveLength(0);
  });
});
