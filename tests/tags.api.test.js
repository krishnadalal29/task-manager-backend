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
const { TaskTags } = require("../dist/entity/taskTags");
const { User } = require("../dist/entity/user");
const { hashAuthToken } = require("../dist/middleware/authMiddleware");

async function createAuthenticatedUser() {
  const userRepo = AppDataSource.getRepository(User);
  const sessionRepo = AppDataSource.getRepository(AuthSession);

  const user = await userRepo.save(
    userRepo.create({
      provider: "local",
      providerId: "alice@example.com",
      email: "alice@example.com",
      name: "Alice",
      createdAt: new Date(),
      updatedAt: new Date()
    })
  );

  const token = "valid-token";
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

describe("Tags API", () => {
  beforeEach(() => {
    AppDataSource.reset();
  });

  test("GET /api/tags/getAllTags returns 401 without auth", async () => {
    const response = await request(app).get("/api/tags/getAllTags");
    expect(response.status).toBe(401);
  });

  test("POST /api/tags/createTag creates a tag for authenticated user", async () => {
    const { token, user } = await createAuthenticatedUser();

    const response = await request(app)
      .post("/api/tags/createTag")
      .set("Authorization", `Bearer ${token}`)
      .send({ tagName: "urgent" });

    const tagRepo = AppDataSource.getRepository(Tag);
    const tags = await tagRepo.find({ where: { userId: user._id } });

    expect(response.status).toBe(201);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].tagName).toBe("urgent");
    expect(tags).toHaveLength(1);
  });

  test("POST /api/tags/createTag returns 409 for duplicate tag", async () => {
    const { token, user } = await createAuthenticatedUser();
    const tagRepo = AppDataSource.getRepository(Tag);
    await tagRepo.save(
      tagRepo.create({
        tagName: "urgent",
        userId: user._id
      })
    );

    const response = await request(app)
      .post("/api/tags/createTag")
      .set("Authorization", `Bearer ${token}`)
      .send({ tagName: "urgent" });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("tag already exists");
  });

  test("DELETE /api/tags/deleteTag/:tag_id validates object id format", async () => {
    const { token } = await createAuthenticatedUser();
    const response = await request(app)
      .delete("/api/tags/deleteTag/not-an-object-id")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("valid ObjectId");
  });

  test("DELETE /api/tags/deleteTag/:tag_id removes tag and task links", async () => {
    const { token, user } = await createAuthenticatedUser();
    const tagRepo = AppDataSource.getRepository(Tag);
    const taskTagRepo = AppDataSource.getRepository(TaskTags);

    const createdTag = await tagRepo.save(
      tagRepo.create({
        tagName: "urgent",
        userId: user._id
      })
    );
    await taskTagRepo.save(
      taskTagRepo.create({
        taskId: new ObjectId(),
        tagId: createdTag._id
      })
    );

    const response = await request(app)
      .delete(`/api/tags/deleteTag/${createdTag._id.toHexString()}`)
      .set("Authorization", `Bearer ${token}`);

    const remainingTags = await tagRepo.find();
    const remainingTaskTags = await taskTagRepo.find();

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Tag deleted successfully");
    expect(remainingTags).toHaveLength(0);
    expect(remainingTaskTags).toHaveLength(0);
  });
});
