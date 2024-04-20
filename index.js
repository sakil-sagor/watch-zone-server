const express = require('express')
const app = express()
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()
app.use(express.json())
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const port = process.env.PORT || 5000
// middleware
var cors = require('cors')
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9clk0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db("test-for-newcollections");
        const productsCollection = database.collection("products");
        const ordersCollection = database.collection("orders");
        const reviewsCollection = database.collection("reviews");
        const usersCollection = database.collection("users");
        const addToCartCollection = database.collection("addToCart");
        const categorysCollection = database.collection("category");



        // get products with search, pagination 

        app.get('/products', async (req, res) => {
            try {
                const search = req.query.search;
                const page = parseInt(req.query.page || 0); // default to 0 if not provided
                const size = parseInt(req.query.size || 10); // default to 10 if not provided

                let query = {};
                if (search) {
                    query = { productName: { $regex: search, $options: 'i' } };
                }

                const cursor = productsCollection.find(query);
                const count = await cursor.count();

                const products = await cursor.skip(page * size).limit(size).toArray();

                res.json({
                    count,
                    products
                });
            } catch (error) {
                console.error("Error fetching products:", error);
                res.status(500).send("Internal Server Error");
            }
        });


        // get single product details 
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query)
            res.json(result);
        })
        // get single product details 
        app.get('/addToCart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await addToCartCollection.findOne(query)
            res.json(result);
        })

        // orders filter by email and all orders load
        app.get(`/orders`, async (req, res) => {
            let query = {};
            const email = req.query.email;
            if (email) {
                query = { email: email }
                const cursor = ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders)
            } else {
                const cursor = ordersCollection.find({});
                const orders = await cursor.toArray();
                res.send(orders);
            }

        })

        // get all reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        // find all admin form users 
        app.get('/users', async (req, res) => {
            query = { role: "admin" }
            const cursor = usersCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        })

        // confirm admin email 
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })

        // get all add to cart
        app.get('/addToCart', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = addToCartCollection.find(query);
            const addToCart = await cursor.toArray();
            res.send(addToCart);
        })
        // get all categorys
        app.get('/allBrands', async (req, res) => {

            const cursor = categorysCollection.find();
            const categorys = await cursor.toArray();
            res.send(categorys);
        })

        // get single add to cart order for payment
        app.get('/addToCart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await addToCartCollection.findOne(query)
            res.send(result);
        })

        //add to cart product
        app.post('/addToCart', async (req, res) => {
            const addToCart = req.body;
            const cartProductId = addToCart.productId;
            const cartProductName = addToCart.productName;
            const email = addToCart.email;
            const query = { productId: cartProductId, email: email, productName: cartProductName }
            const result = await addToCartCollection.findOne(query)
            if (!result) {
                const result = await addToCartCollection.insertOne(addToCart)
                res.json(result);
            } else {
                res.json(0);
            }
        })

        // add single product 
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.json(result);
        })

        // add single category 
        app.post('/addbrands', async (req, res) => {
            console.log(req.body);
            const product = req.body;
            const result = await categorysCollection.insertOne(product)
            res.json(result);
        })

        // add customer website single review 
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.json(result);
        })
        // add product review 
        app.post('/products/:id')

        // add single order 
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order)
            res.json(result);
        })
        // add user detials in database 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)

            res.json(result);
        })

        // update addToCart quentity 
        app.put('/addToCart/:id', async (req, res) => {
            const update = req.body.quantity;
            const payment = req.body
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            // const options = { upsert: true };
            const updateDoc = {
                $set: {
                    quantity: update,
                },
            };
            const result = await addToCartCollection.updateOne(query, updateDoc);
            res.json(result)
        })

        // update user orders status 
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: true,
                },
            };
            const result = await ordersCollection.updateOne(query, updateDoc, options);
            res.json(result)
        })

        // update Products in Stock  status 
        app.put('/products/:id', async (req, res) => {
            const update = req.body.InStock;
            const id = req.params.id;
            console.log(update, id);
            const query = { _id: ObjectId(id) };
            // const options = { upsert: true };
            const updateDoc = {
                $set: {
                    InStock: update,
                },
            };
            const result = await productsCollection.updateOne(query, updateDoc);
            res.json(result)
        })

        // Upsert system for google login 
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true }
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        // make admin  ok 
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.admin };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
        })
        // orders single delete 
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result)
        })
        // single product delete 
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result)
        })

        // single add to cart delete 
        app.delete('/addToCart/:id', async (req, res) => {
            const id = req.params.id;
            console.log("ami", id);
            const query = { _id: ObjectId(id) };
            console.log(query);
            const result = await addToCartCollection.deleteOne(query);
            console.log(result);
            res.json(result)
        })


        // payment method for stripe 
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.json({
                clientSecret: paymentIntent.client_secret,
            });
        });










    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running Node Server')
})

app.listen(port, () => {
    console.log(`Running Node Server at http://localhost:${port}`)
})
