import { Handler } from '@netlify/functions';
import { columnDefs, rowData } from './cars/data';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  'Access-Control-Allow-Origin': '*',
  Vary: 'Access-Control-Request-Headers',
  'Access-Control-Allow-Headers': 'content-type',
};

export const handler: Handler = async (event, context) => {
  console.log(event.httpMethod);
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
      },
    };
  }

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
      },
      body: JSON.stringify({
        data: rowData,
        columnDefs,
      }),
    };
  }

  return {
    statusCode: 200,
  };
};
