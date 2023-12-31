const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser=require('cookie-parser')
require('dotenv').config()
const app  = express();
const port = process.env.PORT || 5000;


// middleware

app.use(cors({
    origin:['http://localhost:5173'],
    credentials:true
}))
app.use(express.json())
app.use(cookieParser())

// console.log(process.env.DB_PASS)


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const cookieParser = require('cookie-parser');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.stv3jdc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



// custom middleware

const logger = async (req,es,next)=>{
 console.log('called:', req.host , req.originalUrl)
 next()
}

const verifyToken = (req,res,next)=>{
    const token = req.cookies?.token
    console.log('value of token', token)
    if(!token){
       return res.status(401).send({message: 'not authorized'})
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        // error
        if(err){
            console.log(err)
            return res.status(401).send({message: 'not authorized'})
        }
        
        // if token is valid then it would be decoded
        console.log('value in the token', decoded)
        req.user=decoded;
        next()
    })

    
}





async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const serviceCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('booking')


    // auth related api

    app.post('/jwt', logger,  async(req,res)=>{
        const user = req.body;
        console.log(user)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
        res
        .cookie('token', token,{
            httpOnly:true,
            secure:false,
            // sameSite:'none'
        })
        .send({success:true})
    })




    // service related api

    // read

    app.get('/services', logger, async(req,res)=>{
        const cursor = serviceCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    // find

    app.get('/services/:id', async(req,res)=>{
        const id=req.params.id
        const query = {_id: new ObjectId(id)}
        const result = await serviceCollection.findOne(query)
        res.send(result)

    })

    // bookings

    // read
    app.get('/booking', logger, verifyToken, async(req,res)=>{
        console.log(req.query.email)
        console.log('tok tok token', req.cookies.token)
        console.log('user in the token', req.user)
        if(req.query.email !== req.query.email){
          return  res.status(403).send({message: 'forbidden access'})
        }
        let query = {}
        if(req.query?.email){
            query = {email: req.query.email}
        }
        const cursor = bookingCollection.find(query)
        const result = await cursor.toArray()
        res.send(result) 
    })


    // create

    app.post('/booking', async (req,res)=>{
        const newBooking = req.body;
        const result = await bookingCollection.insertOne(newBooking)
        res.send(result)
    })

    // update

    app.patch('/booking/:id', async(req,res)=>{
        const updateConfirm=req.body
        const id=req.params.id
        const filter = {_id: new ObjectId(id)}
        const updateDoc={
            $set:{
                status:bookingCollection.status
            }
            
        }
        const result =  await bookingCollection.updateOne(filter,updateDoc)
        res.send(result)

    })

    // delete

    app.delete('/booking/:id', async(req,res)=>{
        const id=req.params.id;
        const query={_id: new ObjectId(id)}
        const result = await bookingCollection.deleteOne(query)
        res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('Car Doctor Is Running...')
})

app.listen(port,()=>{
    console.log(`Car Doctor server is running on port ${port}`)
})