const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/test", (req, res) => {
  console.log("hii from backend 🚀");
  res.json({ message: "Backend received" });
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
