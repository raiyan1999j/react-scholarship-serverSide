const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require('cookie-parser');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sqywi72.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const secretKey = process.env.SECRET_KEY;
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(`${process.env.STRIPE_KEY}`)
const port = 5000;

app.use(express.json());
app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}));
app.use(cookieParser());

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
    const notification= database.collection('notification');

    // create token
    app.post('/createToken',async (req,res)=>{
      const email = req.body.email;
      const token = jwt.sign({email},secretKey,{expiresIn:'30m'});

      res.cookie("secret",token,{
        httpOnly: true,
        secure: false,
      }).send({success:true});
    })
    // verify token
    const verifyToken=(req,res,next)=>{
      const token = req.cookies.secret;

      if(token){
        jwt.verify(token,secretKey,(err,user)=>{
          if(err){
            res.status(401).send("unauthorized")
          }else{
            req.user = user;
            next()
          }
        })
      }else{
        res.status(401).send("unauthorized")
      }
    }
    // create operator
    app.post("/userOperator", async (req,res)=>{
      const mail = req.query.email;
      const name = req.query.name;
      const docs = {
        gmail: mail,
        name: name,
        operator: "user"
      }
      const result = userOperator.insertOne(docs);

      res.send().status(200);
    })
    // retrieve all operator
    app.get("/operatorFinder", async (req,res)=>{
      const mail = req.query.email;
      const matchMail = {gmail : mail};
      const container = await userOperator.findOne(matchMail);

      res.send(container?.operator)
    })
    // login user info
    app.get("/loginUserInfo", async (req,res)=>{
      const mail = req.query.email;
      const matchMail = {gmail : mail}
      const result = await userOperator.findOne(matchMail);

      res.send(result.operator);
    })
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
      const allData = await scholarshipData.find().toArray();
      let requirement;

      allData.sort((a,b)=>{return new Date(a.postDate) - new Date(b.postDate)});
      allData.sort((a,b)=>{return parseInt(a.application) - parseInt(b.application)});

      requirement = allData.slice(0,6)

      res.send(requirement);
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
    app.get("/userApplied/:email",verifyToken, async (req, res) => {
      const user = req.user.email;
      const email= req.params.email;
      const query= {user_email: email};

      if(user == email){
        const result = await application.find(query).toArray();
        res.send(result);
      }else{
        res.status(400).send('bad request')
      }
    });
    // get data for review feature
    app.get("/additionalData", async (req, res) => {
      const tracking = req.query.trackingId;
      const query = { _id: new ObjectId(`${tracking}`) };
      const option = {
        projection: { _id: 1, scholarshipName: 1, university: 1, subject: 1 },
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
      const {email,track} = req.query;
      const query = {$and:[{email},{track}]}
      const result= await paymentInfo.findOne(query);

      if(result == null){
        res.send(true)
      }else{
        res.send(false)
      }
    })
    // check already applied or not
    app.get('/appCheck',async (req,res)=>{
      const email = req.query.email;
      const track = req.query.track;
      const query = {$and:[{user_email:email},{scholarship_id:track}]};
      const result= await application.findOne(query);

      if(result == null){
        res.send(true)
      }else{
        res.send(false)
      }
    })
    // applicant info
    app.get('/applicantInfo', async (req,res)=>{
      const container = await application.find().toArray();

      res.send(container);
    })
    // get specific applicant info
    app.get('/specificApplicant',async (req,res)=>{
      const id = req.query.trackId;
      const query = {_id: new ObjectId(`${id}`)};
      const result= await application.findOne(query);

      res.send(result)
    })
    // manage applied application by status
    app.put('/workStatus',async (req,res)=>{
      const userId = req.query.trackId;
      const updateValue = req.body;
      const filter = {_id: new ObjectId(`${userId}`)};
      const updateDoc={$set:{}};
      const option = {upsert : true}
      let result;

      Object.keys(updateValue).map((value)=>{
        updateDoc.$set[`${value}`] = updateValue[`${value}`]
      })

      result = await application.updateOne(filter,updateDoc,option);
      res.send().status(200)
    })
    // notification send for any changes
    app.post('/manageAppNotification',async (req,res)=>{
      const container = req.body;
      const result = await notification.insertOne(container);

      res.send().status(200)
    })
    // get notification 
    app.get('/getNotification',async (req,res)=>{
      const query = {user: req.query.email};
      const result = await notification.find(query).toArray();

      res.send(result)
    })
    // remove notification;
    app.delete('/removeNotification',async (req,res)=>{
      const trackId = req.query.userId;
      const filter = {_id: new ObjectId(`${trackId}`)};
      const result = await notification.deleteOne(filter);
      const allNotification = await notification.find().toArray();

      res.send(allNotification).status(200)
    })
    // envelope open or close
    app.put('/envelopeCondition',async (req,res)=>{
      const userId = req.query.userId;
      const condition= req.body.condition;
      const filter = {_id: new ObjectId(`${userId}`)};
      const updateDoc = {
        $set:{
          envelope: condition
        }
      }

      const result = await application.updateOne(filter,updateDoc);

      res.send().status(200)
    })
    // my application edit data id base
    app.get('/myApplicationEditData', async(req,res)=>{
      const trackId = req.query.trackId;
      const query = {scholarship_id: trackId};
      const result = await application.findOne(query);

      res.send(result);
    })
    // update applicant data by user
    app.put('/updateApplicantData',async (req,res)=>{
      const trackId = req.query.trackId;
      const data = req.body;
      const filter = {scholarship_id:`${trackId}`};
      const updateDoc={$set:{}}

      Object.keys(data).map((value)=>{
        updateDoc.$set[value] = data[`${value}`]
      })

      const result = await application.updateOne(filter,updateDoc);

      res.send().status(200)
    })
    // user cancel application,remove application
    app.delete('/userApplicationRemoved',async (req,res)=>{
      const trackId = req.query.trackingId;
      const query = {scholarship_id : `${trackId}`};
      const payment={track : `${trackId}`};

      const paymentRemove= await paymentInfo.deleteOne(payment);
      const result= await application.deleteOne(query);
      
      res.send().status(200)
    })
    // remove scholarship data by admin or moderator
    app.delete('/removeScholarshipData', async (req,res)=>{
      const trackId = req.query.trackId;
      const query = {_id: new ObjectId(`${trackId}`)};
      const result= await scholarshipData.deleteOne(query);

      res.send().status(200);
    })
    // retrieve all user review
    app.get('/allUserReview',async (req,res)=>{
      const result = await review.find().toArray();

      res.send(result);
    })
    // user review remove
    app.delete('/reviewRemove',async (req,res)=>{
      const trackId = req.query.trackId;
      const query = {_id : new ObjectId(`${trackId}`)};
      const result = await review.deleteOne(query);

      res.send().status(200)
    })
    // payment api
    app.post('/clientPayment',async (req,res)=>{
      const {amount,id} = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
          amount : amount * 100,
          currency: 'bdt',
          automatic_payment_methods: {
            enabled: true,
          }
      })
      res.send({clientSecret: paymentIntent.client_secret})
    })
    // get specific application
    app.get("/particularApplication",async (req,res)=>{
      const {trackId} = req.query;
      const query = {_id: new ObjectId(`${trackId}`)};
      const result= await scholarshipData.findOne(query);

      res.send(result);
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
