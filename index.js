const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.173efa4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const database = client.db("libraryLogDB");
    const categoryCollection = database.collection("categories");
    const bookCollection = database.collection("books");

    // Get all categories
    app.get("/categories", async (req, res) => {
      const categories = await categoryCollection.find().toArray();
      res.send(categories);
    });

    // Add new book data
    app.post("/books", async (req, res) => {
      const book = req.body;
      const result = await bookCollection.insertOne(book);
      res.send(result);
    });

    // Get all books data
    app.get("/books", async (req, res) => {
      let query = {};
      if (req.query.category) {
        query = { category: req.query.category };
      }
      const books = await bookCollection.find(query).toArray();
      res.send(books);
    });

    // Get single book data by id
    app.get("/books/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const book = await bookCollection.findOne(query);
      res.send(book);
    });

    // Update book quantity value
    app.patch("/books/:id", async (req, res) => {
      const field = req.body;
      console.log(field);
      const query = { _id: new ObjectId(req.params.id) };
      const result = await bookCollection.updateOne(query, {
        $inc: { quantity: -1 },
      });
      console.log(result);
      res.send(result)
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Testing
app.get("/", (req, res) => {
  res.send("libraryLog server is running");
});
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
