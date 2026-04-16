const { ObjectId } = require("mongodb");

const entityCollectionMap = {
  User: "users",
  AuthSession: "sessions",
  Tag: "tags",
  Tasks: "tasks",
  TaskTags: "taskTags"
};

function asHexObjectId(value) {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value).toHexString();
  }

  return null;
}

function valuesEqual(actual, expected) {
  const expectedHex = asHexObjectId(expected);
  if (expectedHex) {
    return asHexObjectId(actual) === expectedHex;
  }

  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }

  return actual === expected;
}

function matchesWhere(entity, where = {}) {
  return Object.entries(where).every(([field, expected]) => valuesEqual(entity[field], expected));
}

class MockRepository {
  constructor(collection) {
    this.collection = collection;
  }

  create(input) {
    const data = { ...(input ?? {}) };
    if (!data._id) {
      data._id = new ObjectId();
    }
    return data;
  }

  async find(options = {}) {
    if (!options.where) {
      return [...this.collection];
    }
    return this.collection.filter((entity) => matchesWhere(entity, options.where));
  }

  async findOne(options = {}) {
    if (!options.where) {
      return this.collection[0] ?? null;
    }

    const found = this.collection.find((entity) => matchesWhere(entity, options.where));
    return found ?? null;
  }

  async save(input) {
    if (Array.isArray(input)) {
      const output = [];
      for (const item of input) {
        output.push(await this.save(item));
      }
      return output;
    }

    const entity = { ...(input ?? {}) };
    if (!entity._id) {
      entity._id = new ObjectId();
    }

    const existingIndex = this.collection.findIndex((item) => valuesEqual(item._id, entity._id));
    if (existingIndex >= 0) {
      this.collection[existingIndex] = { ...this.collection[existingIndex], ...entity };
      return this.collection[existingIndex];
    }

    this.collection.push(entity);
    return entity;
  }

  async delete(criteria = {}) {
    const before = this.collection.length;
    const remaining = this.collection.filter((entity) => !matchesWhere(entity, criteria));
    this.collection.length = 0;
    this.collection.push(...remaining);
    return { affected: before - remaining.length };
  }
}

function createMockDataSource() {
  const collections = {
    users: [],
    sessions: [],
    tags: [],
    tasks: [],
    taskTags: []
  };

  const repositories = new Map();

  function getRepository(entity) {
    const collectionName = entityCollectionMap[entity?.name];
    if (!collectionName) {
      throw new Error(`Unsupported repository entity: ${entity?.name ?? "unknown"}`);
    }

    if (!repositories.has(collectionName)) {
      repositories.set(collectionName, new MockRepository(collections[collectionName]));
    }

    return repositories.get(collectionName);
  }

  function reset() {
    Object.values(collections).forEach((collection) => {
      collection.length = 0;
    });
  }

  return {
    getRepository,
    reset
  };
}

module.exports = {
  createMockDataSource
};
