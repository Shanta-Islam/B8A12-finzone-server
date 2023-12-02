
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.onvejqf.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const usersCollection = client.db("finzoneUser").collection("users");
    const postsCollection = client.db("finzoneUser").collection("posts");
    const announcementCollection = client.db("finzoneUser").collection("announcements");
    const commentCollection = client.db("finzoneUser").collection("comments");
    const tagsCollection = client.db("finzoneUser").collection("tags");
    const reportCollection = client.db("finzoneUser").collection("reports");
    // const paymentCollection = client.db("finzoneUser").collection("payments");



    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users api

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const query = {};
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const users = await usersCollection.find(query).skip(page * size).limit(size).toArray();
      res.send(users);
    })
    app.get('/usersCount', async (req, res) => {
      const count = await usersCollection.estimatedDocumentCount();
      res.send({ count });
    });
    app.get('/user/:email', async (req, res) => { 
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    })
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    //post api
    app.get('/post', async (req, res) => {
      const query = req.body;
      console.log(query);
      const result = await postsCollection.find().toArray();
      res.json(result);

    });
    app.get('/posts', async (req, res) => {
      // const filter = req.query;

      // console.log(filter);
      // const query ={
      //   tag: {
      //     $regex: filter.search, $options: 'i'
      //   }
      // } 
      // const result1 = await postsCollection.aggregate([
      //   {
      //     $addFields: {
      //       voteDifference: { $subtract: ["$upVote", "$downVote"] }
      //     }
      //   },
      //   {
      //     $sort: { voteDifference: -1 }
      //   }

      // ]).toArray();
      // res.send(result1);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await postsCollection.find().skip(page * size).limit(size).sort({ date: -1 }).toArray();

      res.send(result);
    })


    app.get('/postsCount', async (req, res) => {
      const count = await postsCollection.estimatedDocumentCount();
      res.json({ count });
      // console.log(count)

    });
    app.get('/recentPosts/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await postsCollection.find(query).sort({ date: -1 }).limit(3).toArray();
      res.send(result);
    })
    app.get('/posts/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const post = await postsCollection.find(query).skip(page * size).limit(size).toArray();
      res.send(post);
      // console.log(post)
    })
    app.get('/postsCount/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const count = await postsCollection.countDocuments(query);
      res.json({ count });
      console.log(count)

    });
    app.post('/posts', async (req, res) => {
      const postItem = req.body;
      const result = await postsCollection.insertOne(postItem);
      res.send(result);
    });
    app.get('/post/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    })
    app.delete('/post/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await postsCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/:id/like', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const user = req.body;
      const filter = { email: user.email }
      // const existingUser = await postsCollection.findOne(filter);
      // console.log(existingUser)
      // if (existingUser) {
      //   return res.send({ message: 'user already exists', modifiedCount: null })
      // }
      const updatedDoc = {
        $inc: {
          upVote: 1
        }

      }
      const result = await postsCollection.updateOne(query, updatedDoc);
      res.send(result);

    });

    app.patch('/:id/dislike', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // const existingUser = await postsCollection.findOne(query);

      // if (!existingUser) {
      //   // User does not exist, you might want to handle this case accordingly
      //   return res.send({ message: 'User not found', modifiedCount: null });
      // }

      // if (existingUser) {
      //   return res.send({ message: 'User already disliked', modifiedCount: null });
      // }

      const updatedDoc = {
        $inc: {
          downVote: 1
        }
      };

      const result = await postsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // announcement api
    app.get('/announcements', async (req, res) => {
      const query = {};
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await announcementCollection.find(query).skip(page * size).limit(size).toArray();
      res.send(result);
    });
    app.get('/announcementsCount', async (req, res) => {
      const count = await announcementCollection.estimatedDocumentCount();
      res.send({ count });
    });
    app.post('/announcement', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await announcementCollection.insertOne(item);
      res.send(result);
    });

    // comments api

    app.get('/comments', verifyToken, async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });
    app.get('/comment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      // console.log(filter); 
      const result = await commentCollection.findOne(filter);
      res.send(result);
    });
    app.get('/postComments/:postId', verifyToken, async (req, res) => {
      const postId = req.params.postId;
      const filter = { postId: postId }
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await commentCollection.find(filter).skip(page * size).limit(size).toArray();
      res.json(result);
    });
    app.get('/commentsCount/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { postId: id }
      const count = await commentCollection.countDocuments(filter);
      res.send({ count });
      // console.log(count);
    });
    app.post('/comments', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await commentCollection.insertOne(item);
      res.send(result);
    });

    //dashboard admin api
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const post = await postsCollection.estimatedDocumentCount();
      const user = await usersCollection.estimatedDocumentCount();
      const comments = await commentCollection.estimatedDocumentCount();
      res.send({
        post,
        user,
        comments
      });
    })

    //reports api
    app.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
      const query = {};
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await reportCollection.find(query).skip(page * size).limit(size).toArray();
      res.send(result);
    });
    app.get('/reportsCount', async (req, res) => {
      const count = await reportCollection.estimatedDocumentCount();
      res.send({ count });
    });
    app.post('/reports', async (req, res) => {
      const item = req.body;
      const result = await reportCollection.insertOne(item);
      res.send(result);
    });

    // tags api 
    app.get('/tags', async (req, res) => {
      const result = await tagsCollection.find().toArray();
      res.send(result);
    });
    app.post('/tags', async (req, res) => {
      const tagItem = req.body;
      const result = await tagsCollection.insertOne(tagItem);
      res.send(result);
    });

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: parseFloat(price *100),
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
      console.log(paymentIntent);
    });


    app.patch('/payments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updatedDoc = {
        $set: {
          status: 'Membership'
        }
      };

      const result = await usersCollection.updateOne(query, updatedDoc);
      res.send(result);
    });


    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('finzone server is running')
})

app.listen(port, () => {
  console.log(`finzone Server is running on port: ${port}`)
})