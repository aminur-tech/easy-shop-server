const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 4000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require("bcryptjs");

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f47fo9z.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("easy-shop");

        const productsCollection = db.collection("products");
        const usersCollection = db.collection("users");

        // ---------- AUTH ROUTES ---------- //

        // REGISTER
        app.post("/register", async (req, res) => {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ message: "All fields are required" });
            }

            // Strong password validation
            const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongPassword.test(password)) {
                return res.status(400).json({
                    message: "Password must be 8+ chars, include uppercase, lowercase, number & special char"
                });
            }

            // Check if user already exists
            const existing = await usersCollection.findOne({ email });
            if (existing) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = {
                name,
                email,
                password: hashedPassword,
                role: "user",
            };

            await usersCollection.insertOne(user);

            return res.status(201).json({ message: "Registration successful" });
        });

        // LOGIN
        app.post("/login", async (req, res) => {
            const { email, password } = req.body;

            // Check user exists
            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: "User not found" });
            }

            // Compare password
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(400).json({ message: "Incorrect password" });
            }

            return res.json({
                message: "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,

                }
            });
        });


        // ---------- PRODUCTS ROUTES ---------- //

        // Get all products
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        });
        app.get('/products-home', async (req, res) => {
            const result = await productsCollection.find().limit(6).toArray();
            res.send(result);
        });

        // Get single product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const result = await productsCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // Add product 
        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        });

        
    


        console.log("Connected to MongoDB Successfully");
    } finally { }
}

run().catch(console.dir);

// Server start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
