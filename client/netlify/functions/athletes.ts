import { Handler } from "@netlify/functions";
import alasql from "alasql";
import { SqlClient } from "../../../server/SqlClient";

// @ts-ignore
import olympicdata from "../../../server/data/olympic_winners.txt";

alasql(olympicdata);

const sqlClient = new SqlClient("Id", "olympic_winners");

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

  if (event.httpMethod === "GET" && event.path.includes("/permitted-values")) {
    if (!event.queryStringParameters.columnId) {
      throw new Error("columnId is not defined");
    }
    const permittedValues = await sqlClient.getPermittedValues(
      event.queryStringParameters.columnId
    );
    return {
      statusCode: 200,
      body: JSON.stringify(permittedValues),
      headers: {
        ...corsHeaders,
      },
    };
  }

  try {
    let body: any = {};
    if (!event.body) {
      throw '"body" is required';
    }

    body = JSON.parse(event.body);

    const data = await sqlClient.getData(
      body,
      body.adaptableFilters,
      body.queryAST,
      body.includeCount,
      body.includeSQL
    );

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        ...corsHeaders,
      },
    };
  } catch (e) {
    console.log("failed to parse body", e);
  }

  return {
    statusCode: 404,
  };
};
