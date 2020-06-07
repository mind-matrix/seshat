const { Service } = require('@mindmatrix/marvin');
const wiki = require('wikijs').default;
const { connect } = require('mongoose');
const { Corpus, Document } = require('./model');
const TextSummarizer = require('./summarizer');

connect('mongodb://localhost:27017/seshat', {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true
});

// UTILITY FUNCTION: editDistances

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// UTILITY FUNCTION: similarity based on Levenshtein distance

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

/**
 * @class SeshatRPC Representing a service that provides an Oracle
 */
class SeshatRPC {
  constructor () {
    this.wiki = wiki();
  }
  /**
   * Searches cached or online resources and provides a summary for the given subject
   * in the given number of lines
   * 
   * @param {string} subject The subject of interest
   * @param {number} [nlines=100] The number of lines for summary. Default: 100 lines
   * @returns {string} A summary of the topic within the given number of lines.
   */
  summary (subject, nlines=100) {
    return new Promise(async (resolve, reject) => {
      if(!subject) {
        reject('Error: No subject');
      }
      let doc = await Document.findOne({ title: { $regex: subject, $options: 'i' } });
      if(doc) {
        try {
          const summary = TextSummarizer(doc.content.summary, nlines);
          resolve(summary);
        } catch(e) {
          reject(e);
        }
      }
      else {
        this.wiki.find(subject).then(async (page) => {
          doc = await Document.findOne({ url: page.url().toString() });
          if(!doc) {
            doc = new Document({
              title: page.raw.title,
              url: page.url().toString(),
              infobox: await page.fullInfo(),
              html: await page.html(),
              content: {
                summary: await page.summary(),
                sections: await page.content()
              },
              images: {
                main: await page.mainImage(),
                all: await page.images()
              },
              links: await page.links()
            });
            await doc.save();
          }
          return doc.content.summary;
        }).then((text) => {
          try {
            const summary = TextSummarizer.summary(text, nlines);
            resolve(summary);
          } catch(e) {
            reject(e);
          }
        }).catch((e) => resolve(null));
      }
    });
  }
  /**
   * Searches cached or online resources and provides an article on the closest related
   * topic to the given subject that it can find
   * @param {*} subject
   * @returns {object} The article
   */
  article (subject) {
    return new Promise(async (resolve, reject) => {
      if(!subject) {
        reject('Error: No subject');
      }
      let doc = await Document.findOne({ title: { $regex: subject, $options: 'i' } });
      if(doc) {
        try {
          resolve({
            title: doc.title,
            image: doc.images.main,
            content: doc.content
          });
        } catch(e) {
          reject(e);
        }
      }
      else {
        this.wiki.find(subject).then(async (page) => {
          doc = await Document.findOne({ url: page.url().toString() });
          if(!doc) {
            doc = new Document({
              title: page.raw.title,
              url: page.url().toString(),
              infobox: await page.fullInfo(),
              html: await page.html(),
              content: {
                summary: await page.summary(),
                sections: await page.content()
              },
              images: {
                main: await page.mainImage(),
                all: await page.images()
              },
              links: await page.links()
            });
            await doc.save();
          }
          return doc;
        }).then((doc) => {
          try {
            resolve({
              title: doc.title,
              image: doc.images.main,
              content: doc.content
            });
          } catch(e) {
            reject(e);
          }
        }).catch((e) => resolve(null));
      }
    });
  }
  /**
   * Answer a question based on preliminary research a given subject.
   * 
   * @param {string} subject The subject of research. Provides context for answering the given question.
   * @param {string} question The question to be answered.
   * @param {number} [nlines=100] The number of lines in answer text.
   * @param {boolean} [deep=false] Do a deep research. Sometimes unfavourable as too much data yields irrelevant information.
   * @param {number} [inspect_on=0.5] Inspect sub-corpus on similarity to question greater than given threshold.
   * @returns {string} The compiled answer
   */
  answer (subject, question, nlines=100, deep=false, inspect_on=0.5) {
    return new Promise(async (resolve, reject) => {
      if(!subject) {
        reject('Error: No subject');
      }
      let doc = await Document.findOne({ title: { $regex: subject, $options: 'i' } });
      if(doc) {
        try {
          let corpus = doc.content.summary;
          if (deep) {
            corpus += doc.content.sections
            .filter((section) => similarity(section.title, question) >= inspect_on)
            .map((section) => {
              let data = section.content;
              if(section.items) {
                data += section.items
                .filter((item) => similarity(item.title, question) >= inspect_on)
                .map((item) => item.content).join(' ');
              }
              return data;
            }).join(' ');
          }
          const summary = TextSummarizer.summaryWithQuestion(question, corpus, nlines);
          resolve(summary);
        } catch(e) {
          reject(e);
        }
      }
      else {
        this.wiki.find(subject).then(async (page) => {
          doc = await Document.findOne({ url: page.url().toString() });
          if(!doc) {
            doc = new Document({
              title: page.raw.title,
              url: page.url().toString(),
              infobox: await page.fullInfo(),
              html: await page.html(),
              content: {
                summary: await page.summary(),
                sections: await page.content()
              },
              images: {
                main: await page.mainImage(),
                all: await page.images()
              },
              links: await page.links()
            });
            await doc.save();
          }
          return doc;
        }).then((doc) => {
          try {
            let corpus = doc.content.summary;
            if (deep) {
              corpus += doc.content.sections
              .filter((section) => similarity(section.title, question) >= inspect_on)
              .map((section) => {
                let data = section.content;
                if(section.items) {
                  data += section.items
                  .filter((item) => similarity(item.title, question) >= inspect_on)
                  .map((item) => item.content).join(' ');
                }
                return data;
              }).join(' ');
            }
            const summary = TextSummarizer.summaryWithQuestion(question, corpus, nlines);
            resolve(summary);
          } catch(e) {
            reject(e);
          }
        });
      }
    });
  }
  /**
   * Research on a topic with/without some questions in focus and
   * compile facts and observations into sections for future use.
   * @param {string} subject The subject of research
   * @param {string|string[]} question The focus questions
   * @returns {boolean} Success status for the research 
   */
}

const seshat = new Service('@sagnikmodak/seshat', { keyFile: 'key' });
seshat.register(SeshatRPC);