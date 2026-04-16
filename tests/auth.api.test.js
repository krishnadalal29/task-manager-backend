const { randomBytes, scryptSync } = require("crypto");
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
const { User } = require("../dist/entity/user");
const { hashAuthToken } = require("../dist/middleware/authMiddleware");

function createPasswordCredentials(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

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

describe("Auth API", () => {
  beforeEach(() => {
    AppDataSource.reset();
  });

  test("POST /api/auth/signup returns 400 for invalid payload", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      email: "alice@example.com",
      password: "password123"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("name is required");
  });

  test("POST /api/auth/signup creates account and session", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      name: "Alice",
      email: "Alice@Example.com",
      password: "password123"
    });

    const userRepo = AppDataSource.getRepository(User);
    const sessionRepo = AppDataSource.getRepository(AuthSession);
    const users = await userRepo.find();
    const sessions = await sessionRepo.find();

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe("alice@example.com");
    expect(users).toHaveLength(1);
    expect(sessions).toHaveLength(1);
  });

  test("POST /api/auth/login rejects wrong password", async () => {
    const { salt, hash } = createPasswordCredentials("password123");
    const userRepo = AppDataSource.getRepository(User);
    await userRepo.save(
      userRepo.create({
        provider: "local",
        providerId: "alice@example.com",
        email: "alice@example.com",
        name: "Alice",
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    );

    const response = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  test("GET /api/auth/me requires bearer token", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Missing Authorization");
  });

  test("GET /api/auth/me returns authenticated user", async () => {
    const { token, user } = await createAuthenticatedUser();

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(user.email);
  });

  test("POST /api/auth/logout marks session as logged out", async () => {
    const { token } = await createAuthenticatedUser();

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    const sessionRepo = AppDataSource.getRepository(AuthSession);
    const [session] = await sessionRepo.find();

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logged out");
    expect(session.is_logged_out).toBe(true);
    expect(session.is_deleted).toBe(true);
  });
});
