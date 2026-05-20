const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || "cursos_online";

if (!uri) {
  throw new Error(
    "MONGODB_URI no está definido. Define la variable de entorno en .env o en Vercel."
  );
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectDB() {
  await client.connect();
  return client.db(dbName);
}

module.exports = connectDB;