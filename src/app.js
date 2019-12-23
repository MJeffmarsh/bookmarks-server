require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('./config');
const bookmarkRouter = require('./bookmarks-router');
const bookmarksService = require('./bookmarksService');

const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(bookmarkRouter);

app.get('/bookmarks', (req, res, next) => {
  const knexInstance = req.app.get('db');
  bookmarksService
    .getAllBookmarks(knexInstance)
    .then(bookmarks => {
      res.json(bookmarks);
    })
    .catch(next);
});

app.get('/bookmarks/:bookmark_id', (req, res, next) => {
  const knexInstance = req.app.get('db');
  bookmarksService
    .getById(knexInstance, req.params.bookmark_id)
    .then(bookmark => {
      if (!bookmark) {
        return res.status(404).json({
          error: { message: `Bookmark doesn't exist` }
        });
      }
      res.json(bookamrk);
    })
    .catch(next);
});

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
