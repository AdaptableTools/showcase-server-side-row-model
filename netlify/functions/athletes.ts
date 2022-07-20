import { Handler } from "@netlify/functions";
import alasql from "alasql";
import { SqlCLient } from "../../server/SqlCLient";

// @ts-ignore netlify does not know how to load .sql files
import olympicdata from "../../server/data/olympic_winners.txt";

alasql(olympicdata);

const sqlClient = new SqlCLient("Id", "olympic_winners");

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "Access-Control-Allow-Origin": "*",
  Vary: "Access-Control-Request-Headers",
  "Access-Control-Allow-Headers": "content-type",
};

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
      },
    };
  }

  let body: any = {};
  if (!event.body) {
    throw '"body" is required';
  }

  try {
    body = JSON.parse(event.body);
    const data = await sqlClient.getData(body, body.adaptableFilters);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        ...corsHeaders,
      },
    };
  } catch (e) {
    console.log("failed to parse body");
  }

  return {
    statusCode: 404,
  };
};
