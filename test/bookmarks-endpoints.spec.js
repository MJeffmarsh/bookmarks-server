process.env.TZ = 'UTC';
const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmark-fixtures');

describe('Bookmarks Endpoints', function() {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  before('clean the table', () => db('bookmarks').truncate());

  afterEach('cleanup', () => db('bookmarks').truncate());

  after('disconnect from db', () => db.destroy());

  describe('GET /api/bookmarks', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('gets all bookmarks and responds with 200', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
    context(`Given an XSS attack bookmark`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'http://www.badwebsite.com',
        rating: '3',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      };

      beforeEach('insert malicious bookmark', () => {
        return db.into('bookmarks').insert([maliciousBookmark]);
      });

      it('removes XSS attack rating', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(
              'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
            );
            expect(res.body.description).to.eql(
              `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
            );
          });
      });
    });
  });

  describe(`GET /api/bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .expect(200, expectedBookmark);
      });
    });
    context(`Given an XSS attack bookmark`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'http://www.badwebsite.com',
        rating: '3',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      };

      beforeEach('insert malicious bookmark', () => {
        return db.into('bookmarks').insert([maliciousBookmark]);
      });

      it('removes XSS attack rating', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(
              'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
            );
            expect(res.body.description).to.eql(
              `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
            );
          });
      });
    });
  });
  describe(`GET /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } });
      });
    });
  });
  describe(`POST /api/bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'https://testsite.com',
        rating: '3',
        description: 'test bookmark description'
      };
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    const requiredFields = ['title', 'url', 'rating'];
    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test new Bookmark',
        url: 'https://testbookmark.com',
        rating: '3'
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newBookmark[field];

        return supertest(app)
          .post('/api/bookmarks')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    it('removes XSS attack rating', () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: 'http://www.badwebsite.com',
        rating: '3',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(
            'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
          );
          expect(res.body.description).to.eql(
            `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
          );
        });
    });
  });
  describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
      const testbookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testbookmarks);
      });

      it('responds with 204 and removes the bookmark', () => {
        const idToRemove = 2;
        const expectedbookmarks = testbookmarks.filter(
          bookmark => bookmark.id !== idToRemove
        );
        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks`)
              .expect(expectedbookmarks)
          );
      });
    });
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } });
      });
    });
  });
  describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } });
      });
    });
    context('Given there are bookmarks in the database', () => {
      const testbookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testbookmarks);
      });

      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: 'updated bookmark title',
          url: 'https://updatebookmark.com',
          rating: '4',
          description: 'updated bookmark description'
        };
        const expectedBookmark = {
          ...testbookmarks[idToUpdate - 1],
          ...updateBookmark
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateBookmark)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)
          );
      });
      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'rating' or 'description'`
            }
          });
      });
      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updatebookmark = {
          title: 'updated bookmark title'
        };
        const expectedbookmark = {
          ...testbookmarks[idToUpdate - 1],
          ...updatebookmark
        };

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({
            ...updatebookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedbookmark)
          );
      });
    });
  });
});
