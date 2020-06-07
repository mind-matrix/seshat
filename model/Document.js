const { Schema, model } = require('mongoose');
const { createHash } = require('crypto');

const documentSchema = new Schema({
  title: { type: String, String, index: true },
  url: { type: String, unique: true, index: true },
  info: Schema.Types.Mixed,
  html: String,
  hash: {
    type: String,
    default: function () {
      return createHash('md5').update(this.html).digest('hex');
    }
  },
  content: {
    summary: String,
    sections: Schema.Types.Mixed
  },
  images: {
    main: String,
    all: [String]
  },
  links: [String]
}, { timestamps: true });

module.exports = model('Document', documentSchema);