// models/publicLinkModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const publicLinkSchema = new Schema({
  hash: { type: String, required: true, unique: true },
  // Embedded file information for the shared file.
  file: {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    filePath: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  // Information about the user who created the link.
  uploadedBy: {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

// You can also add helper or static methods to generate or verify links if needed.

// Export the PublicLink model.
module.exports = mongoose.model('PublicLink', publicLinkSchema);
