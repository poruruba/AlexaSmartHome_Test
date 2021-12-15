'use strict';

const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;

exports.handler = async (event, context, callback) =>{
    console.log(JSON.stringify(event));
    console.log(context);

	var response = await do_post(process.env.FORWARD_URL, {
        event: event,
        context: context
    });
    console.log(JSON.stringify(response.body));
    callback(null, response.body);
}

function do_post(url, body) {
  const headers = new Headers({ "Content-Type": "application/json" });

  return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.json();
    });
}
