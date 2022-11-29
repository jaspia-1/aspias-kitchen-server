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
            const res1 = await bookedCollection.updateOne(filter, updateDoc);
            const res2 = await wishListCollection.updateOne(filter, updateDoc);
            const res3 = await productCollection.updateOne(filter2, updateDoc);
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
            const res1 = await wishListCollection.updateOne(filter, updateDoc);
            const res2 = await advertiseCollection.deleteOne(filter);
            const res3 = await bookedCollection.updateOne(filter, updateDoc);
            const res4 = await productCollection.updateOne(filter2, updateDoc);
            res.send(res4)
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