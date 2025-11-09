const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//variables
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

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
    await client.connect();

    //database collections
    const imxportDB = client.db("imxportDB");
      const productCollection = imxportDB.collection("products");
      const importCollection = imxportDB.collection("importProducts")

    //simple get operation
    app.get("/", (req, res) => {
      res.send("ImXport server after connecting to mongodb");
    });
    // CRUD for Products
    //GET for all products
    app.get("/products", async (req, res) => {
      const findProduct = productCollection.find();
      const result = await findProduct.toArray();
      res.send(result);
    });

    //   GET for single product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    //   POST for products
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    //   PUT a product
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDocument = {
        $set: {
          productName: updateProduct.productName,
          imageUrl: updateProduct.imageUrl,
          price: updateProduct.price,
          origin: updateProduct.origin,
          rating: updateProduct.rating,
          quantity: updateProduct.quantity,
        },
      };

      const result = await productCollection.updateOne(query, updateDocument);
      res.send(result);
    });

    //   DELETE a product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
      
    //   CRUD for imported products
    
    //GET for all product
    app.get('/import', async (req, res) => {
      const email = req.query.email

      if (!email) {
        return res
          .status(400)
          .send({ success: false, message: "Email is required" });
      }

      const query = { userEmail: email }
      const imports = await importCollection.find(query).toArray()

      res.send(imports);
    })

    //POST for imported product
    app.post('/import', async (req, res) => {
      const { productId, quantity, userEmail } = req.body;
      const query = { _id: new ObjectId(productId) }
      
      const findProduct = await productCollection.findOne(query)
      if (!findProduct) {
        return res.status(404).send({success: false, message: "Product not found"})
      }

      if (quantity > findProduct.quantity) {
        return res
          .status(400)
          .send({ success: false, message: "Not enough stock available" });
      }

      const productData = {
        productId,
        productName: findProduct.productName,
        imageUrl: findProduct.imageUrl,
        price: findProduct.price,
        rating: findProduct.rating,
        origin: findProduct.origin,
        importedQuantity: quantity,
        userEmail,
        importDate: new Date(),
      };

      const result = await importCollection.insertOne(productData)

      await productCollection.updateOne(
        query,
        {$inc:{quantity : -quantity}}
      )

      res.send({
        success: true,
        message: "Product imported successfully",
        data: result,
      });

    })
    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port);
