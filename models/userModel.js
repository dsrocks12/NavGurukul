// models/userModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define a sub-schema for a File.
// Note: For a truly recursive folder structure, you might need to design a more advanced schema,
// but here we assume each file object contains its own properties.
const FileSchema = new Schema({
  // A new ObjectId is generated automatically when a file is created.
  _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
  filePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // If you want to allow nested folders, you can include a files array.
  // (Be aware that recursive schemas require extra care.)
  files: { type: [this], default: [] }
});

// Define the User schema.
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  reset_token: { type: String, default: "" },
  // Array of uploaded file objects (using the FileSchema above)
  uploaded: { type: [FileSchema], default: [] },
  // Array of files shared with the user; you might store similar file objects or references here.
  sharedWithMe: { type: Array, default: [] },
  isVerified: { type: Boolean, default: false },
  verification_token: { type: Number, default: Date.now }
}, { timestamps: true });

// You can add instance or static methods here if needed.

// Export the User model.
module.exports = mongoose.model('User', userSchema);
