// netlify/functions/api.js
const serverless = require('serverless-http');
const app = require('../../app');

exports.handler = async (event, context) => {
  // Simple test endpoint
  if (event.path.includes('/api/test')) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'Function is working!',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Normal API requests go to Express
  return serverless(app)(event, context);
};