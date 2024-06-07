const express = require('express');
const app = express();
const cors= require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
   const scholarshipData=database.collection('scholarshipData');

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
  // add scholarship Data
  app.post('/scholarshipData',async (req,res)=>{
    const allData = req.body;
    const docs={};
    Object.keys(allData).forEach(value=>{
      docs[value] = allData[value]
    })

    const result = await scholarshipData.insertOne(docs);

    res.status(200).send(result);
  })
  // get scholarship Data
  app.get('/getScholarData',async (req,res)=>{
    const containerData = scholarshipData.find();
    const result = await containerData.toArray();

    res.send(result);
  })
  // specificData for editing
  app.get('/specificId',async(req,res)=>{
    const id = req.query.editId;
    const query = {_id: new ObjectId(`${id}`)};
    const result = await scholarshipData.findOne(query);

    res.send(result)
  })
  // edit specific id data

  app.post('/editData',async (req,res)=>{
    const id = req.query.editId;
    const info = req.body;
    const filter= {_id : new ObjectId(`${id}`)};

    const updateDoc = {
      $set:{}
    }

    Object.keys(info).forEach((value)=>{
      updateDoc.$set[value] = info[value]
    })

    const result = await scholarshipData.updateOne(filter,updateDoc);

    res.status(200).send(result)
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