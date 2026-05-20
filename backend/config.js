const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://anpadilla:P4d1llamran@cluster0.huh4a86.mongodb.net/cursos_online?authSource=admin";

const client = new MongoClient(uri);

async function connectDB() {
  await client.connect();
  console.log("✅ Conectado a MongoDB Atlas");
  return client.db("cursos_online");
}

module.exports = connectDB;