import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { SqlClient } from './SqlClient';
import importData from './importData';

importData();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const sqlClient = new SqlClient('id', 'olympic_winners');

app.post('/api', async function (req, res) {
  const data = await sqlClient.getData(
    req.body,
    req.body.adaptableFilters,
    req.body.queryAST,
    req.body.includeCount,
    req.body.includeSQL
  );

  res.json(data);
});

app.get('/api/permitted-values', function (req, res) {
  if (!req.query.columnId) {
    throw new Error('columnId is not defined');
  }

  const permittedValues = sqlClient.getPermittedValues(req.query.columnId as string);

  res.json(permittedValues);
});

app.post('/api/report', function (req, res) {
  const permittedValues = sqlClient.getPermittedValues(req.query.columnId as string);

  res.json(permittedValues);
});

app.listen(4000, () => {
  console.log('Started on localhost:4000');
});
