const express = require('express');
const app = express();
const cors= require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sqywi72.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const port= 5000;

app.use(express.json());
app.use(cors());

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
   const database = client.db('scholars');
   const userOperator = database.collection('userOperator');

  app.get('/userOperator',async(req,res)=>{
    const mail = req.query.email;
    const matchMail = {gmail:mail};
    const docs = {
      gmail: mail,
      operator: 'user'
    }
    const container = await userOperator.findOne(matchMail); 

    if(!container){
      await userOperator.insertOne(docs);
      const result = await userOperator.findOne(matchMail);
      res.send(result.operator)
    }else{
      res.send(container.operator)
    }
  })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log('working or not')
})