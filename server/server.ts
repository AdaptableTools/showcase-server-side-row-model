import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { SqlCLient } from "./SqlCLient";
import importData from "./importData";

importData();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const sqlClient = new SqlCLient("id", "olympic_winners");

app.post("/api", function (req, res) {
  const { lastRow, rows } = sqlClient.getData(
    req.body,
    req.body.adaptableFilters
  );
  res.json({ rows: rows, lastRow });
});

app.listen(4000, () => {
  console.log("Started on localhost:4000");
});
