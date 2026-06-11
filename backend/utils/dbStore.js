const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

let client;
let database;
let connectPromise;
let indexesPromise;
let mode = 'mongo';

const dataDir = path.join(__dirname, '..', 'data');

const normalizeDoc = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
};

const cloneDoc = (doc) => JSON.parse(JSON.stringify(doc));

const getFilePath = (name) => path.join(dataDir, `${name}.json`);

async function ensureCollectionFile(name) {
  const filePath = getFilePath(name);
  await fsp.mkdir(dataDir, { recursive: true });
  try {
    await fsp.access(filePath);
  } catch {
    await fsp.writeFile(filePath, '[]', 'utf8');
  }
}

async function readCollectionFile(name) {
  await ensureCollectionFile(name);
  const raw = await fsp.readFile(getFilePath(name), 'utf8');
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCollectionFile(name, items) {
  await ensureCollectionFile(name);
  const tmpPath = `${getFilePath(name)}.tmp`;
  await fsp.writeFile(tmpPath, JSON.stringify(items, null, 2), 'utf8');
  await fsp.rename(tmpPath, getFilePath(name));
}

function ensureCollectionFileSync(name) {
  const filePath = getFilePath(name);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
}

function readCollectionFileSync(name) {
  ensureCollectionFileSync(name);
  const raw = fs.readFileSync(getFilePath(name), 'utf8');
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollectionFileSync(name, items) {
  ensureCollectionFileSync(name);
  const tmpPath = `${getFilePath(name)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmpPath, getFilePath(name));
}

const matchQuery = (doc, query = {}) =>
  Object.entries(query).every(([key, value]) => {
    const current = doc[key];
    if (Array.isArray(value)) {
      return JSON.stringify(current) === JSON.stringify(value);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(current) === JSON.stringify(value);
    }
    return current === value;
  });

async function connectMongo() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careergenie';
  const dbName = process.env.MONGODB_DB_NAME || 'careergenie';

  client = new MongoClient(mongodbUri, {
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  database = client.db(dbName);
  mode = 'mongo';
  console.log(`Database Connected: MongoDB (${dbName})`);
  return database;
}

async function connect() {
  if (mode === 'file') {
    return {
      collection: (name) => new FileCollection(name)
    };
  }

  if (database) {
    return database;
  }

  if (!connectPromise) {
    connectPromise = connectMongo()
      .catch((err) => {
        connectPromise = null;
        database = null;
        client = null;
        mode = 'file';
        console.error(`Database Failed: ${err.message}`);
        console.warn('MongoDB unavailable, using local file-backed storage');
        return {
          collection: (name) => new FileCollection(name)
        };
      });
  }

  return connectPromise;
}

async function ensureIndexes() {
  if (mode === 'file') {
    return null;
  }

  if (indexesPromise) {
    return indexesPromise;
  }

  indexesPromise = (async () => {
    const db = await connect();
    const indexJobs = [];

    indexJobs.push(db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }).catch(() => null));
    indexJobs.push(db.collection('studentProfiles').createIndex({ userId: 1 }, { unique: true, name: 'studentProfiles_userId_unique' }).catch(() => null));
    indexJobs.push(db.collection('jobs').createIndex({ recruiterId: 1, createdAt: -1 }, { name: 'jobs_recruiter_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('jobs').createIndex({ status: 1, createdAt: -1 }, { name: 'jobs_status_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('applications').createIndex({ jobId: 1, studentId: 1 }, { unique: true, name: 'applications_job_student_unique' }).catch(() => null));
    indexJobs.push(db.collection('applications').createIndex({ studentId: 1, createdAt: -1 }, { name: 'applications_student_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('notifications').createIndex({ recipient: 1, createdAt: -1 }, { name: 'notifications_recipient_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('complaints').createIndex({ userId: 1, createdAt: -1 }, { name: 'complaints_user_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('uploads').createIndex({ userId: 1, createdAt: -1 }, { name: 'uploads_user_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('careerCopilotConversations').createIndex({ userId: 1, createdAt: -1 }, { name: 'copilot_user_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('githubProfiles').createIndex({ userId: 1 }, { unique: true, name: 'githubProfiles_user_unique' }).catch(() => null));
    indexJobs.push(db.collection('resumeTailorVersions').createIndex({ userId: 1, generatedAt: -1 }, { name: 'resume_versions_user_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('placementReadinessSnapshots').createIndex({ userId: 1, createdAt: -1 }, { name: 'placement_user_createdAt' }).catch(() => null));
    indexJobs.push(db.collection('interviewExperiences').createIndex({ company: 1, role: 1 }, { name: 'interview_company_role' }).catch(() => null));
    indexJobs.push(db.collection('skillAssessments').createIndex({ userId: 1, createdAt: -1 }, { name: 'assessments_user_createdAt' }).catch(() => null));

    await Promise.all(indexJobs);
  })().catch((err) => {
    indexesPromise = null;
    throw err;
  });

  return indexesPromise;
}

class FileCollection {
  constructor(name) {
    this.name = name;
  }

  async createIndex() {
    return null;
  }

  async read() {
    const cursor = this.find({});
    return cursor.toArray();
  }

  find(query = {}) {
    const items = readCollectionFileSync(this.name);
    const filtered = items.filter((item) => matchQuery(item, query)).map(cloneDoc);
    return {
      toArray: async () => filtered
    };
  }

  async findOne(query = {}) {
    const cursor = this.find(query);
    const items = await cursor.toArray();
    return items[0] || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const result = this.insertOne({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data
    });
    return cloneDoc(result.document);
  }

  insertOne(document) {
    const items = readCollectionFileSync(this.name);
    const newItem = cloneDoc(document);
    items.push(newItem);
    writeCollectionFileSync(this.name, items);
    return { acknowledged: true, insertedId: newItem.id, document: newItem };
  }

  async findByIdAndUpdate(id, updateData) {
    const items = readCollectionFileSync(this.name);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    items[index] = {
      ...items[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    writeCollectionFileSync(this.name, items);
    return cloneDoc(items[index]);
  }

  updateOne(filter, update) {
    const items = readCollectionFileSync(this.name);
    const index = items.findIndex((item) => matchQuery(item, filter));
    if (index === -1) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }

    const setData = update?.$set || {};
    items[index] = {
      ...items[index],
      ...setData,
      updatedAt: new Date().toISOString()
    };

    writeCollectionFileSync(this.name, items);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  async findByIdAndDelete(id) {
    const items = readCollectionFileSync(this.name);
    const nextItems = items.filter((item) => item.id !== id);
    const deleted = nextItems.length !== items.length;
    if (deleted) {
      writeCollectionFileSync(this.name, nextItems);
    }
    return deleted;
  }

  deleteOne(filter) {
    const items = readCollectionFileSync(this.name);
    const index = items.findIndex((item) => matchQuery(item, filter));
    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }

    items.splice(index, 1);
    writeCollectionFileSync(this.name, items);
    return { acknowledged: true, deletedCount: 1 };
  }

  deleteMany(query = {}) {
    const items = readCollectionFileSync(this.name);
    const nextItems = items.filter((item) => !matchQuery(item, query));
    const deletedCount = items.length - nextItems.length;
    if (deletedCount > 0) {
      writeCollectionFileSync(this.name, nextItems);
    }
    return { acknowledged: true, deletedCount };
  }
}

class MongoCollection {
  constructor(name) {
    this.name = name;
  }

  async getCollection() {
    const db = await connect();
    return db.collection(this.name);
  }

  async read() {
    return this.find({});
  }

  async find(query = {}) {
    const collection = await this.getCollection();
    const items = await collection.find(query).toArray();
    return items.map(normalizeDoc);
  }

  async findOne(query = {}) {
    const collection = await this.getCollection();
    const item = await collection.findOne(query);
    return normalizeDoc(item);
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(data) {
    const collection = await this.getCollection();
    const newItem = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data
    };

    await collection.insertOne(newItem);
    return newItem;
  }

  async findByIdAndUpdate(id, updateData) {
    const collection = await this.getCollection();
    await collection.updateOne(
      { id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      }
    );
    return this.findById(id);
  }

  async findByIdAndDelete(id) {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async deleteMany(query = {}) {
    const collection = await this.getCollection();
    const result = await collection.deleteMany(query);
    return result.deletedCount;
  }
}

const createCollection = (name) => new MongoCollection(name);

const db = {
  connect,
  ensureIndexes,
  get mode() {
    return mode;
  },
  users: createCollection('users'),
  studentProfiles: createCollection('studentProfiles'),
  jobs: createCollection('jobs'),
  applications: createCollection('applications'),
  notifications: createCollection('notifications'),
  complaints: createCollection('complaints'),
  uploads: createCollection('uploads'),
  careerCopilotConversations: createCollection('careerCopilotConversations'),
  githubProfiles: createCollection('githubProfiles'),
  resumeTailorVersions: createCollection('resumeTailorVersions'),
  placementReadinessSnapshots: createCollection('placementReadinessSnapshots'),
  interviewExperiences: createCollection('interviewExperiences'),
  skillAssessments: createCollection('skillAssessments')
};

module.exports = db;
