const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY);
// middleware
app.use(cors());
app.use(express.json());

// verifyJWT
const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:'unauthorized access'});
  }

  const token=authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({error:true,message:'unauthorized and cant decode'})
    }
    req.decoded=decoded;
    next();
  })
}


const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lilwv8k.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const classCollection = client.db('craftSchool').collection('classes');
    const userCollection = client.db('craftSchool').collection('users');
    const selectCollection = client.db('craftSchool').collection('selected');
    const paymentCollection=client.db('restaurantDb').collection('payments');
    
    // verify admin
const verifyAdmin=async(req,res,next)=>{
  const email=req.decoded.email;
  const query={email:email};
  const user=await userCollection.findOne(query);
  if(user?.role !== 'admin'){
    return res.status(403).send({error:true,message:'forbidden message'});
  }
  next();
}
// verify admin

// isAdmin
app.get('/users/admin/:email',verifyJWT, async(req,res)=>{
  const email=req.params.email;
  const decodedEmail=req.decoded.email;
  if(decodedEmail !== email){
    res.send({admin:false})
  }
  const query={email:email}
  const user=await userCollection.findOne(query);
  const result={admin: user?.role==='admin'};
  res.send(result);
})
// isAdmin
    // classCollection
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().sort({
        enrolled_students: -1
      }).toArray();
      res.send(result);
    })

    // classCollection
    // userCollection
    app.post('/users',async(req,res)=>{
      const user=req.body;
      const query={email:user.email};
      const existing=await userCollection.findOne(query);
      if(existing){
        return res.send({message:'user already exist'})
      }
      const result=await userCollection.insertOne(user);
      res.send(result);
    })
    // userCollection

    // selectCollection
    app.post('/selected',async(req,res)=>{
      const item=req.body;
      console.log(item);
      const result=await selectCollection.insertOne(item);
      res.send(result);
    })

    app.get('/selected',verifyJWT, async(req,res)=>{
      const email=req.query.email;
      console.log(email);
      if(!email){
        res.send([])
      }
      const decodedEmail=req.decoded.email;
      if(email !==decodedEmail){
        return res.status(403).send({error:true,message:'forbidden access'})
      }
      const query={email:email};
      const result=await selectCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/selected/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)};
      const result=await selectCollection.deleteOne(query);
      res.send(result);
    })
    // selectCollection
    // jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1hr'
      });
      res.send({
        token
      });
    })
    // jwt

    // create payment intent
app.post('/create-payment-intent',verifyJWT,async(req,res)=>{
  const {price}=req.body;
  const amount=parseInt(price*100);
  const paymentIntent=await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types:['card']
  });
  res.send({
    clientSecret: paymentIntent.client_secret 
  })
})

// create payment intent
// paymentCollection
// 
app.post('/payments',verifyJWT,async(req,res)=>{
  const payment=req.body;
  const insertedResult=await paymentCollection.insertOne(payment);
  // delete purpose
  const query={_id: {$in: payment.classItems.map(id=>new ObjectId(id))}}
  const deletedResult=await selectCollection.deleteMany(query);
  res.send({insertedResult,deletedResult});

})
// paymentCollection
    // Send a ping to confirm a successful connection
    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('craft school is running');
});
app.listen(port, () => {
  console.log(`craft school is running on port ${port}`)
});