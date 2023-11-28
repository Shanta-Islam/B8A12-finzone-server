const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
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

    app.get('/posts', async (req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result);
    })
    app.get('/recentPosts/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await postsCollection.find(query).sort({ date: -1 }).limit(3).toArray();
      res.send(result);
    })
    app.get('/post/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    })
    app.get('/posts/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const post = await postsCollection.find(query).toArray();
      res.send(post);
    })
    app.get('/users', verifyToken, async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    })
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    })
    app.get('/announcements', async (req, res) => {
      const query = {};
      const result = await announcementCollection.find(query).toArray();
      res.send(result);
    });
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

    app.post('/posts', async (req, res) => {
      const postItem = req.body;
      const result = await postsCollection.insertOne(postItem);
      res.send(result);
    });

    app.post('/announcement', async (req, res) => {
      const item = req.body;
      const result = await announcementCollection.insertOne(item);
      res.send(result);
    });
    // app.post('/:id/like/:email', async (req, res) => {
    //   const id = req.params.id;
    //   const email = req.params.email;
    //   const query = { _id: new ObjectId(id) };
    //   const filter = { email: email };
    //   const existingUser = await postsCollection.findOne(filter);
    //   if (existingUser.upVote ==1) {
    //     return res.send({ message: 'user already exists', modifiedCount: null })
    //   }
    //   const updatedDoc = {
    //     $inc: {
    //       upVote: 1
    //     }

    //   }
    //   const result = await postsCollection.updateOne(query, updatedDoc);
    //   res.send(result);

    // });


    app.post('/:id/like/:email', async (req, res) => {
      const id = req.params.id;
      const email = req.params.email;
      const query = { _id: new ObjectId(id), email: email };
      const existingUser = await postsCollection.findOne(query);

      if (!existingUser) {
        // User does not exist, you might want to handle this case accordingly
        return res.send({ message: 'User not found', modifiedCount: null });
      }

      if (existingUser.upVote === 1) {
        return res.send({ message: 'User already upvoted', modifiedCount: null });
      }

      const updatedDoc = {
        $inc: {
          upVote: 1
        }
      };

      const result = await postsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.post('/:id/dislike/:email', async (req, res) => {
      const id = req.params.id;
      const email = req.params.email;
      const query = { _id: new ObjectId(id), email: email };
      const existingUser = await postsCollection.findOne(query);
    
      if (!existingUser) {
        // User does not exist, you might want to handle this case accordingly
        return res.send({ message: 'User not found', modifiedCount: null });
      }
    
      if (existingUser.downVote === 1) {
        return res.send({ message: 'User already disliked', modifiedCount: null });
      }
    
      const updatedDoc = {
        $inc: {
          downVote: 1
        }
      };
    
      const result = await postsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.delete('/post/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await postsCollection.deleteOne(query);
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