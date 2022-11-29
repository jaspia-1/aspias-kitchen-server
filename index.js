const express = require('express')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
const { query } = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
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