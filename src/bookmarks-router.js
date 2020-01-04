const express = require('express');
const uuid = require('uuid/v4');
const logger = require('./logger');
const bookmarks = require('./store');
const bookmarksService = require('./bookmarksService');
const bookmarkRouter = express.Router();
const bodyParser = express.json();

// todo - import service
// modify each endpoint to use the service rather than the bookmarks store

bookmarkRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    bookmarksService
      .getAllBookmarks(knexInstance)
      .then(bookmark => {
        res.json(bookmark);
      })
      .catch(next);
  })
  .post(bodyParser, (req, res) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res.status(400).send('Invalid data');
    }

    if (!url) {
      logger.error(`URL is required`);
      return res.status(400).send('Invalid data');
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res.status(400).send('Invalid data');
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send(`'rating' must be a number between 0 and 5`);
    }

    const id = uuid();

    const bookmark = {
      id,
      title,
      url,
      description,
      rating
    };

    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${id} has been made`);

    res
      .status(201)
      .location(`http://localhost:8000/bookmark/${id}`)
      .json(bookmark);
  });

bookmarkRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    bookmarksService
      .getById(knexInstance, req.params.bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          });
        }
        res.json(bookmark);
      })
      .catch(next);
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found`);
      return res.status(404).send('Not found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted`);

    res.status(204).end();
  });

module.exports = bookmarkRouter;
