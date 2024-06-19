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
    const name = req.query.name;
    const matchMail = {gmail:mail};
    const docs = {
      gmail: mail,
      name : name,
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

  app.put('/editData',async (req,res)=>{
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
  // retrieve all user
  app.get('/getAllUser',async (req,res)=>{
    const result = await userOperator.find().toArray();

    res.send(result)
  })
  // updateOperator
  app.put('/updateOperator',async (req,res)=>{
    const operatorId = req.body.id;
    const updateAuthor= req.body.author;
    const filter = {_id: new ObjectId(`${operatorId}`)};
    const docs ={
      $set:{
        operator: updateAuthor
      }
    }

    const result = await userOperator.updateOne(filter,docs)

    res.send(result)
  })
  // remove user
  app.delete('/removeUser',async(req,res)=>{
    const userId = req.query.userId;
    const filter = {_id: new ObjectId(`${userId}`)};

    const result = await userOperator.deleteOne(filter);

    res.send(result);
  })
  // get latest post
  app.get('/latestData', async (req,res)=>{
    const result = await scholarshipData.find().limit(6).toArray();

    res.send(result);
  })
  // get all scholarship data
  app.get('/allScholarData', async (req,res)=>{
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const limitation = parseInt(req.query.limitation) || 4;
    const searchItem = req.query.searchItem || "";
    
    const searchCategory = {
      $or:[
        {scholarshipName:{$regex:searchItem,$options:'i'}},
        {university:{$regex:searchItem,$options:'i'}},
        {diploma:{$regex:searchItem,$options:'i'}}
      ]
    }
    const countDocs = await scholarshipData.countDocuments(searchCategory);
    const totalPage = Math.ceil(countDocs/limitation);

    const scholarData = scholarshipData.find(searchCategory).skip((pageNumber - 1) * limitation).limit(limitation);
    const result = await scholarData.toArray();
    const wrap ={
      result,
      totalPage
    }

    res.send(wrap);
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