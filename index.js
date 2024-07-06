const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sqywi72.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const port = 5000;

app.use(express.json());
app.use(cors());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const database = client.db("scholars");
    const userOperator = database.collection("userOperator");
    const scholarshipData = database.collection("scholarshipData");
    const application = database.collection("application");
    const review = database.collection('review');
    const paymentInfo = database.collection('paymentInfo');

    app.get("/userOperator", async (req, res) => {
      const mail = req.query.email;
      const name = req.query.name;
      const matchMail = { gmail: mail };
      const docs = {
        gmail: mail,
        name: name,
        operator: "user",
      };
      const container = await userOperator.findOne(matchMail);

      if (!container) {
        await userOperator.insertOne(docs);
        const result = await userOperator.findOne(matchMail);
        res.send(result.operator);
      } else {
        res.send(container.operator);
      }
    });
    // add scholarship Data
    app.post("/scholarshipData", async (req, res) => {
      const allData = req.body;
      const docs = {};
      Object.keys(allData).forEach((value) => {
        docs[value] = allData[value];
      });

      const result = await scholarshipData.insertOne(docs);

      res.status(200).send(result);
    });
    // get scholarship Data
    app.get("/getScholarData", async (req, res) => {
      const pageNumber = parseInt(req.query.pageNumber) || 1;
      const limitation = parseInt(req.query.limitation) || 8;
      const searchItem = req.query.searchItem || "";

      const searchCategory = {
        $or: [{ university: { $regex: searchItem, $options: "i" } }],
      };

      const countDocs = await scholarshipData.countDocuments(searchCategory);
      const totalPage = Math.ceil(countDocs / limitation);

      const scholarData = scholarshipData
        .find(searchCategory)
        .skip((pageNumber - 1) * limitation)
        .limit(limitation);
      const result = await scholarData.toArray();

      const wrap = {
        result,
        totalPage,
      };

      res.send(wrap);
    });
    // specificData for editing
    app.get("/specificId", async (req, res) => {
      const id = req.query.editId;
      const query = { _id: new ObjectId(`${id}`) };
      const result = await scholarshipData.findOne(query);

      res.send(result);
    });
    // edit specific id data
    app.put("/editData", async (req, res) => {
      const id = req.query.editId;
      const info = req.body;
      const filter = { _id: new ObjectId(`${id}`) };
      const option = { upsert: true };

      const updateDoc = {
        $set: {},
      };

      Object.keys(info).forEach((value) => {
        updateDoc.$set[value] = info[value];
      });

      const result = await scholarshipData.updateOne(filter, updateDoc, option);

      res.status(200).send(result);
    });
    // retrieve all user
    app.get("/getAllUser", async (req, res) => {
      const result = await userOperator.find().toArray();

      res.send(result);
    });
    // updateOperator
    app.put("/updateOperator", async (req, res) => {
      const operatorId = req.body.id;
      const updateAuthor = req.body.author;
      const filter = { _id: new ObjectId(`${operatorId}`) };
      const docs = {
        $set: {
          operator: updateAuthor,
        },
      };

      const result = await userOperator.updateOne(filter, docs);

      res.send(result);
    });
    // remove user
    app.delete("/removeUser", async (req, res) => {
      const userId = req.query.userId;
      const filter = { _id: new ObjectId(`${userId}`) };

      const result = await userOperator.deleteOne(filter);

      res.send(result);
    });
    // get latest post
    app.get("/latestData", async (req, res) => {
      const result = await scholarshipData.find().limit(6).toArray();

      res.send(result);
    });
    // get all scholarship data
    app.get("/allScholarData", async (req, res) => {
      const pageNumber = parseInt(req.query.pageNumber) || 1;
      const limitation = parseInt(req.query.limitation) || 4;
      const searchItem = req.query.searchItem || "";

      const searchCategory = {
        $or: [
          { scholarshipName: { $regex: searchItem, $options: "i" } },
          { university: { $regex: searchItem, $options: "i" } },
          { diploma: { $regex: searchItem, $options: "i" } },
        ],
      };
      const countDocs = await scholarshipData.countDocuments(searchCategory);
      const totalPage = Math.ceil(countDocs / limitation);

      const scholarData = scholarshipData
        .find(searchCategory)
        .skip((pageNumber - 1) * limitation)
        .limit(limitation);
      const result = await scholarData.toArray();
      const wrap = {
        result,
        totalPage,
      };

      res.send(wrap);
    });
    // get specific scholarship item for details page & payment page
    app.get("/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(`${id}`) };
      const result = await scholarshipData.findOne(query);

      res.send(result);
    });
    // get university all degree category
    app.get("/universityDegree", async (req, res) => {
      const institute = req.query.institute;
      const query = { university: institute };

      const option = {
        projection: { diploma: 1, _id: 0 },
      };

      const result = await scholarshipData.find(query, option).toArray();

      res.send(result);
    });
    // post all application
    app.post("/application", async (req, res) => {
      const body = req.body;

      const result = await application.insertOne(body);

      res.send().status(200);
    });
    // get specific user application
    app.get("/userApplied/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };

      const result = await application.find(query).toArray();

      res.send(result);
    });
    // get data for review feature
    app.get("/additionalData", async (req, res) => {
      const tracking = req.query.trackingId;
      const query = { _id: new ObjectId(`${tracking}`) };
      const option = {
        projection: { _id: 1, scholarshipName: 1, university: 1 },
      };
      const result = await scholarshipData.findOne(query, option);

      res.send(result);
    });
    // add userReview
    app.post('/userReview',async (req,res)=>{
      const docs = req.body;
      const result= await review.insertOne(docs);

      res.send().status(200);
    })
    // check if already commented or not
    app.get('/checkExistence',async (req,res)=>{
      const trackEmail = req.query.trackEmail;
      const trackId = req.query.trackId;
      const query = {$and:[{email:trackEmail},{university_id:trackId}] }

      const result = await review.findOne(query);

      if(result == null){
        res.send(false);
      }else{
        res.send(true)
      }
    })
    // collect rating point for specific university
    app.get('/ratingCollector',async (req,res)=>{
      const university = req.query.university;
      const query = {university};
      const option={
        projection:{rating:1,_id:0}
      }

      const ratingPoint = await review.find(query,option).toArray();

      res.send(ratingPoint)
    })
    // get user based review
    app.get('/specificReview',async (req,res)=>{
      const mail = req.query.email;
      const query={email:mail};
      const result= await review.find(query).toArray();

      res.send(result);
    })
    // update review 
    app.put('/reviewUpdate', async (req,res)=>{
      const trackId = req.query.track;
      const data = req.body;
      const filter={_id:new ObjectId(`${trackId}`)};
      const updateDoc = {
        $set:{}
      }

      Object.keys(data).forEach((value)=>{
        updateDoc.$set[value] = data[`${value}`];
      })

      const result = await review.updateOne(filter,updateDoc);

      res.send().status(200);
      console.log(data)

    })
    // university based comment
    app.get('/universityBaseCom',async (req,res)=>{
      const university = req.query.university;
      const query = {university};
      const result= await review.find(query).toArray();

      res.send(result);
    })
    // retrieve all user review
    app.get('/reviewData', async (req,res)=>{
      const result = await review.find().toArray();

      res.send(result);
    })
    // user paymentData
    app.post('/paymentData',async (req,res)=>{
      const data = req.body;
      const result = await paymentInfo.insertOne(data);

      res.send().status(200);
    })
    // check whether already paid
    app.get('/paymentCheck',async (req,res)=>{
      const email = req.query.email;
      const track = req.query.track;
      const query = {$and:[{email},{track}]}
      const result= await paymentInfo.findOne(query);

      if(result == null){
        res.send(true)
      }else{
        res.send(false)
      }
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("working or not");
});
