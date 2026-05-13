import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI não configurada nas variáveis de ambiente");
}

const uri = process.env.MONGODB_URI;

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClient?: MongoClient;
};

function getClient() {
  if (process.env.NODE_ENV === "development") {
    if (!globalForMongo._mongoClient) {
      globalForMongo._mongoClient = new MongoClient(uri);
    }
    return globalForMongo._mongoClient;
  }
  return new MongoClient(uri);
}

const client = getClient();

export default client;

export function getDb() {
  return client.db("escalada");
}
