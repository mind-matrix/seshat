const { Schema, model } = require('mongoose');

const relationSchema = new Schema({
  corpus: { type: Schema.Types.ObjectId, ref: 'Research' },
  relation: { type: String, required: true }
});

const researchSchema = new Schema({
  title: String,
  tags: [{ type: String, index: true }],
  relations: { type: [relationSchema], default: [] },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }]
}, { timestamps: true });

module.exports = model('Research', researchSchema);