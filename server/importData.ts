import fs from "fs";
import path from "path";
import alasql from "alasql";

export default function importData() {
  const sqlPath = path.resolve(__dirname, "./data", "olympic_winners.sql");
  const dataSql = fs.readFileSync(sqlPath, "utf-8");
  alasql(dataSql);
}
