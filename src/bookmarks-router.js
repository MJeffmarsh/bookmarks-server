const express = require('express');
const xss = require('xss');
//const uuid = require('uuid/v4');
const logger = require('./logger');
const bookmarksService = require('./bookmarksService');
const bookmarkRouter = express.Router();
const jsonParser = express.json();

function serializeBookmark(bookmark) {
  return {
    id: bookmark.id,
    title: xss(bookmark.title), // sanitize title
    url: bookmark.url,
    rating: rating.url,
    description: xss(bookmark.description) // sanitize content
  };
}

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
  .post(jsonParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const newBookmark = { title, url, description, rating };

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating '${rating}' supplied`);
      return res.status(400).send(`'rating' must be a number between 0 and 5`);
    }

    BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializebookmark(bookmark));
      })
      .catch(next);
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
  .get((req, res, next) => {
    res.json(serializeBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    BookamrksService.deleteBookmark(req.app.get('db'), req.params.bookmark_id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarkRouter;
