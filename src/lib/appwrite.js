import { Client, Databases, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || "6a1ab06700390e26dfcb");

export const databases = new Databases(client);
export { ID, Query };

export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID || "ttt";
export const COLLECTION_ID = "teilnehmer";
