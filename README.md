# Pirate's Bounty Backend

## Description

This is the Pirate's Bounty Backend, running on Node.js v.7.4.0 and Express.js. Hosted on Chris' personal AWS EC2 server.


## How to use

The backend accepts HTTP requests on `http://ec2-54-183-31-165.us-west-1.compute.amazonaws.com`. e.g. `POST http://ec2-54-183-31-165.us-west-1.compute.amazonaws.com/user/create`. Send your data in the request body as `application/json`. The backend will respond with data in the response body as `application/json`. The backend will always respond with `code` and `message` in the body.

Code values:
* `200` means the action was successful.
* `400` means the action failed due to a user input error (e.g. username already taken).
* `500` means the action failed due to a server error. Try again later or contact Chris.

## Routes

These are all of the routes that you can make API calls on.

* `POST /user/create` // Creates a user
	*  Request Data
		* `username` String, 3-20 characters
		* `password` String
	* Response Data
		* `token` String
		* `session_ttl` Number/Date in UNIX time
* `POST /user/login` // Logs a user in
	*  Request Data
		* `username` String, 1-20 characters
		* `password` String
	* Response Data
		* `token` String
		* `session_ttl` Number/Date in UNIX time
* `POST /user/logout` // Logs a user out
	*  Request Data
		* `token` String
* `POST /user/reauthenticate` // Refreshes a user's session token
	*  Request Data
		* `token` String
	* Response Data
		* `session_ttl` Number/Date in UNIX time
