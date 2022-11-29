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