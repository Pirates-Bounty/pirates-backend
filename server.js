
// Import all the libraries
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const Sequelize = require('sequelize');
const validator = require('validator');

// Define all the constants
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

// Initialize Express
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Initialize the database
const db = new Sequelize('pirates_bounty', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  dialectOptions: { charset: 'utf8mb4' },
});

db.authenticate()
  .then(() => {
    console.log('Successfully connected to the database.');
  })
  .catch((err) => {
    console.log('Failed to connect to the database.');
    throw err;
  });

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});

function createTTL() {
  return Date.now() + 1000 * 60 * 60 * 24 * 7;
}

// Create DB models
const User = db.define('users', {
  username: {
    type: Sequelize.STRING(20),
    allowNull: false,
    unique: true,
  },
  password: {
    type: Sequelize.STRING(512),
    allowNull: false,
    unique: false,
  },
}, {
  timestamps: true,
  paranoid: true,
});

User.sync();


const Session = db.define('sessions', {
  token: {
    type: Sequelize.STRING(512),
    allowNull: false,
    unique: true,
  },
  ttl: {
    type: Sequelize.DATE,
    allowNull: false,
    unique: false,
    defaultValue: createTTL(),
  },
}, {
  timestamps: true,
  paranoid: true,
});

Session.belongsTo(User);

Session.sync();

app.post('/user/create', (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.send({
      code: 400,
      message: 'Username field cannot be empty.',
    });
  }

  if (!password) {
    return res.send({
      code: 400,
      message: 'Password field cannot be empty.',
    });
  }

  if (!validator.isLength(username, { min: USERNAME_MIN, max: USERNAME_MAX })) {
    return res.send({
      code: 400,
      message: 'Username must be between 3-20 characters.',
    });
  }

  // Check if the username exists
  User.findOne({ where: { username } })
    .then((user) => {
      if (user) {
        res.send({
          code: 400,
          message: 'Username already taken.',
        });
      } else {
        bcrypt.hash(password, 8, (err, hash) => {
          User.create({ username, password: hash })
            .then((user) => {
              crypto.randomBytes(256, (err, nonce) => {
                const token = nonce.toString('base64');

                Session.create({ token, userId: user.id })
                  .then((session) => {
                    res.send({
                      code: 200,
                      message: 'User created successfully.',
                      token: session.token,
                      session_ttl: session.ttl,
                    });
                  })
                  .catch((err) => {
                    console.log(err);
                    res.send({
                      code: 500,
                      message: 'Something went wrong, please try again.',
                    });
                  });
              });
            })
            .catch((err) => {
              console.log(err);
              res.send({
                code: 500,
                message: 'Something went wrong, please try again.',
              });
            });
        });
      }
    });

});

app.post('/user/login', (req, res) => {
  const { username, password } = req.body;

  if (!username) {
    return res.send({
      code: 400,
      message: 'Username field cannot be empty.',
    });
  }

  if (!password) {
    return res.send({
      code: 400,
      message: 'Password field cannot be empty.',
    });
  }

  if (!validator.isLength(username, { min: USERNAME_MIN, max: USERNAME_MAX })) {
    return res.send({
      code: 400,
      message: 'Username must be between 3-20 characters.',
    });
  }

  User.findOne({ where: { username } })
    .then((user) => {
      if (!user) {
        res.send({
          code: 400,
          message: `Username doesn't exist.`,
        });
      } else {
        bcrypt.compare(password, user.password, (err, isSame) => {
          if (!isSame) {
            res.send({
              code: 400,
              message: 'Password is incorrect.',
            });
          } else {
            crypto.randomBytes(256, (err, nonce) => {
              const token = nonce.toString('base64');

              Session.create({ token, userId: user.id })
                .then((session) => {
                  res.send({
                    code: 200,
                    message: 'Logged in successfully.',
                    token: session.token,
                    session_ttl: session.ttl,
                  });
                })
                .catch((err) => {
                  console.log(err);
                  res.send({
                    code: 500,
                    message: 'Something went wrong, please try again.',
                  });
                });
            });
          }
        });
      }
    });
});

app.post('/user/logout', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.send({
      code: 400,
      message: 'Please provide a valid token.',
    });
  }

  Session.findOne({ where: { token }})
    .then((session) => {
      // If the session doesn't exist, pretend that it does and
      // tell the user they logged out.
      if (!session) {
        res.send({
          code: 200,
          message: 'Successfully logged out.',
        });
      } else {
        session.destroy()
          .then(() => {
            res.send({
              code: 200,
              message: 'Successfully logged out.',
            });
          });
      }
    });

});


app.post('/user/reauthenticate', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.send({
      code: 400,
      message: 'Please provide a valid token.',
    });
  }

  Session.findOne({ where: { token }})
    .then((session) => {
      // If the session doesn't exist, pretend that it does and
      // tell the user they logged out.
      if (!session) {
        res.send({
          code: 400,
          message: `Session doesn't exist.`,
        });
      } else {
        const ttl = createTTL();
        Session.update({ ttl }, { where: { token } })
          .then((_session) => {
            res.send({
              code: 200,
              message: 'Session has been refreshed.',
              session_ttl: ttl,
            });
          });
      }
    });


});
