const express = require('express')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { query } = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors())
app.use(express.json())


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const username = process.env.DB_USER
const password = process.env.DB_PASSWORD
const uri = `mongodb+srv://${username}:${password}@cluster0.9sysdmk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {


        const userCollection = client.db('bikebd').collection('users');
        const productCollection = client.db('bikebd').collection('product');
        const wishListCollection = client.db('bikebd').collection('wishlist');
        const bookedCollection = client.db('bikebd').collection('booked');
        const advertiseCollection = client.db('bikebd').collection('advertise');

        const verifySeller = async (req, res, next) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'Seller') {

                req.role = ''
                req.verified = false
            } else {
                req.verified = false
                req.role = 'Seller'
                if (user.verifiedSeller) {
                    req.verified = true
                }
            }
            next();
        }
        const verifyAdmin = async (req, res, next) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {

                req.role = ''
            } else {
                req.role = 'admin'
            }
            next();
        }
        app.get('/wishlist', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const products = await wishListCollection.find(query).toArray();
            res.send(products);
        })
        app.put('/wishlist', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email, serial: user._id };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: user.email,
                    serial: user._id,
                    catagory: user.catagory,
                    name: user.name,
                    img: user.img,
                    issold: user.issold,
                    newOwner: user.newOwner,
                    price: user.price,
                    txnid: user.txnid
                }
            };
            const result = await wishListCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })
        app.put('/user', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    email: user.email,
                    role: user.role,
                    img: user.img,
                    name: user.name,
                    verifiedSeller: false
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
            console.log(result)


        })
        app.put('/payment', async (req, res) => {
            const user = req.body;
            const filter = { serial: user.bookingId };
            const filter2 = { _id: ObjectId(user.bookingId) }
            const updateDoc = {
                $set: {
                    issold: true,
                    newOwner: user.email,
                    txnid: user.transactionID
                }
            };
            const result = await advertiseCollection.deleteOne(filter);
            const result2 = await bookedCollection.updateMany(filter, updateDoc);
            const result3 = await productCollection.updateMany(filter2, updateDoc);
            const result4 = await wishListCollection.updateMany(filter, updateDoc);
            res.send(result4)
        })
        app.post('/booking', async (req, res) => {
            const bookedData = req.body;

            const query = {
                serial: bookedData.serial,
                email: bookedData.email
            }
            const alreadyBooked = await bookedCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const msg = `Already booked the ${bookedData.name}`
                return res.send({ acknowledged: false, msg })
            }
            const result = await bookedCollection.insertOne(bookedData);
            res.send(result);

        })
        app.get('/payinfo/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await productCollection.findOne(query);
            res.send(booking);
        })
        app.get('/user/seller', verifySeller, async (req, res) => {
            res.send({ isSeller: req?.role === 'Seller', verified: req.verified });

        })
        app.get('/catagory/:id', async (req, res) => {
            const catagory = req.params.id;
            const query = { catagory: catagory, issold: false };
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/user/admin', verifyAdmin, async (req, res) => {

            res.send({ isAdmin: req?.role === 'admin' });

        })
        app.post('/productadd', async (req, res) => {
            const data = req.body;
            data.date = new Date(Date.now()).toISOString();
            const resut = await productCollection.insertOne(data);
            res.send(resut);
        })
        app.get('/product', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })
        app.delete('/singlebike/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { serial: id };
            const filter2 = { _id: ObjectId(id) }
            const res1 = await bookedCollection.deleteOne(filter);
            const res2 = await advertiseCollection.deleteOne(filter);
            const res3 = await wishListCollection.deleteOne(filter);
            const res4 = await productCollection.deleteOne(filter2);
            res.send(res4);

        })
        app.put('/available', async (req, res) => {
            const id = req.body;
            const filter = { serial: id._id };
            const filter2 = { _id: ObjectId(id._id) }
            const updateDoc = {
                $set: {
                    issold: false,
                    newOwner: "",
                    txnid: ""
                }
            };
            const res1 = await bookedCollection.updateMany(filter, updateDoc);
            const res2 = await wishListCollection.updateMany(filter, updateDoc);
            const res3 = await productCollection.updateMany(filter2, updateDoc);
            res.send(res3)
        })
        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            const query = {
                serial: advertise.id,
            }
            const alreadyadvertised = await advertiseCollection.find(query).toArray();
            if (alreadyadvertised.length) {
                return res.send({ acknowledged: false })
            }
            const result = await advertiseCollection.insertOne(advertise);
            res.send(result);
        })
        app.put('/sold', async (req, res) => {
            const id = req.body;
            const filter = { serial: id._id };
            const filter2 = { _id: ObjectId(id._id) }
            const updateDoc = {
                $set: {
                    issold: true,
                    newOwner: "The owner",
                    txnid: "No Payment"
                }
            };
            const res1 = await wishListCollection.updateMany(filter, updateDoc);
            const res2 = await advertiseCollection.deleteOne(filter);
            const res3 = await bookedCollection.updateMany(filter, updateDoc);
            const res4 = await productCollection.updateMany(filter2, updateDoc);
            res.send(res4)
        })
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 10;
            console.log(price)
            console.log(amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],

            });
            res.send({
                clientSecret: paymentIntent.client_secret,

            })
        })
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            console.log("WOrking")
            const query = {
                role: req.query.role
            }
            const products = await userCollection.find(query).toArray();
            res.send(products);
        })
        app.put('/verify', verifyAdmin, async (req, res) => {
            if (req.role === 'admin') {
                const filter = { email: req.body.email }
                const updateDoc = {
                    $set: {
                        verifiedSeller: true
                    }
                }
                const result = await productCollection.updateMany(filter, updateDoc);
                const result2 = await userCollection.updateMany(filter, updateDoc);
                if (result.acknowledged && result2.acknowledged) {
                    res.send({ msg: true })
                }
                else {
                    res.send({ msg: false })
                }
            }
            else {
                res.send({ msg: false })
            }

        })
        app.get('/advertise', async (req, res) => {
            const query = {}
            const products = await advertiseCollection.find(query).toArray();
            res.send(products);
        })
        app.delete('/userdelete', verifyAdmin, async (req, res) => {
            if (req.role === 'admin') {
                const selleremail = req.query.selleremail;
                const query = { email: selleremail }
                const result = await userCollection.deleteMany(query);
                const result2 = await bookedCollection.deleteMany(query);
                const result3 = await productCollection.deleteMany(query);
                const result4 = await advertiseCollection.deleteMany(query);
                res.send({ msg: true })
            }
            else {
                res.send({ msg: false })
            }
        })
        app.get('/bookinglist', async (req, res) => {
            const email = req.query.email;

            const query = {
                email: email
            }
            const products = await bookedCollection.find(query).toArray();
            res.send(products);
        })


    }
    catch {

    }

}


run().catch(error => console.log(error))
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})