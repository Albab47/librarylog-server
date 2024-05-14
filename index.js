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

// function to generate token
const generateToken = (payload) => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;
  const options = {
    expiresIn: "1h",
  };
  const token = jwt.sign(payload, secretKey, options);
  return token;
};

// function to verify token
const verifyToken = (req, res, next) => {
  const secretKey = process.env.ACCESS_TOKEN_SECRET;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  if (token) {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorized access" });
      } else {
        console.log(decoded);
        req.user = decoded;
        next();
      }
    });
  }
};

async function run() {
  try {
    // await client.connect();
    const database = client.db("libraryLogDB");
    const categoryCollection = database.collection("categories");
    const bookCollection = database.collection("books");
    const borrowedBookCollection = database.collection("borrowedBooks");

    // -------------- Auth related API ------------------

    // Generation token for user
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = generateToken(user);
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Clear token from cookie
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });



    // ------------ Service related API ------------------

    // Get all categories
    app.get("/categories", async (req, res) => {
      const categories = await categoryCollection.find().toArray();
      res.send(categories);
    });

    // Add new book data
    app.post("/books", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      if(tokenEmail !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
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
      if(req.query.filter) {
        query = { quantity: {$gt: 0} }
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

    // Get single book data by id
    app.get("/books/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const book = await bookCollection.findOne(query);
      res.send(book);
    });

    // Update book data by id
    app.patch("/update-book/:id", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      console.log(tokenEmail, req.query.email);
      if(tokenEmail !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const updatedFields = req.body;
      const query = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: { ...updatedFields },
      };
      const result = await bookCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Update book quantity value
    app.patch("/books/:id", async (req, res) => {
      const data = req.body;
      console.log(data);
      const query = { _id: new ObjectId(req.params.id) };
      const result = await bookCollection.updateOne(query, {
        $inc: { ...data },
      });
      console.log(result);
      res.send(result);
    });

    // Add new borrowed book data
    app.post("/borrowed-books", async (req, res) => {
      const book = req.body;
      const result = await borrowedBookCollection.insertOne(book);
      res.send(result);
    });

    // Get all books data by user email
    app.get("/borrowed-books/:email", async (req, res) => {
      const query = { "borrower.email": req.params.email };
      const books = await borrowedBookCollection.find(query).toArray();
      res.send(books);
    });

    // Remove book data on return
    app.delete("/borrowed-books/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      console.log(query);
      const result = await borrowedBookCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    // Check if a user's book exist in borrowed books
    app.get("/borrowed-books/find/:id", async (req, res) => {
      const email = req.query.email;
      const id = req.params.id;
      console.log(email, id);
      const query = { bookId: id, 'borrower.email': email};
      const options = {projection: { _id: 0, bookId: 1, name: 1 },}
      const book = await borrowedBookCollection.findOne(query, options);
      console.log(book);
      res.send(book);
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
