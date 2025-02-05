// controllers/fileController.js
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const fileSystem = require('fs');
const bcrypt = require('bcrypt');
const fileHelper = require('../utils/FileHelper');

/* ---------------------- Existing Endpoints ---------------------- */

// Render "My Uploads" view (with the user's directory structure).
exports.getMyUploads = async (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  const user = await db.collection('users').findOne({ _id: ObjectId(req.session.user._id) });
  res.render('myUploads', { request: req, uploaded: user.uploaded });
};

// Upload File endpoint.
// Supports an optional parentId (sent as a hidden field) to allow file upload into a folder.
exports.uploadFile = async (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  let user = await db.collection('users').findOne({ _id: ObjectId(req.session.user._id) });
  
  if (req.files.file && req.files.file.size > 0) {
    const uploadedObj = {
      _id: new ObjectId(),
      size: req.files.file.size,
      name: req.files.file.name,
      type: req.files.file.type,
      filePath: "",
      createdAt: new Date().getTime()
    };
    const parentId = req.fields.parentId || ''; // Optional parent folder id.
    const filePath = "public/uploads/" + user.email + "/" + new Date().getTime() + "-" + req.files.file.name;
    uploadedObj.filePath = filePath;
    
    if (!fileSystem.existsSync("public/uploads/" + user.email)){
      fileSystem.mkdirSync("public/uploads/" + user.email, { recursive: true });
    }
    
    fileSystem.readFile(req.files.file.path, function(err, data) {
      if (err) throw err;
      fileSystem.writeFile(filePath, data, async function(err) {
        if (err) throw err;
        // If a parent folder is specified, add the file there; otherwise push it to the root.
        if (parentId) {
          user.uploaded = fileHelper.getUpdatedArray(user.uploaded, parentId, uploadedObj);
        } else {
          user.uploaded.push(uploadedObj);
        }
        await db.collection('users').updateOne(
          { _id: ObjectId(req.session.user._id) },
          { $set: { uploaded: user.uploaded } }
        );
        req.session.status = "success";
        req.session.message = "File uploaded successfully.";
        res.redirect("/MyUploads");
      });
      fileSystem.unlink(req.files.file.path, function(err) {
        if (err) throw err;
      });
    });
  } else {
    req.status = "error";
    req.message = "Please select a valid file.";
    res.render('myUploads', { request: req });
  }
};

// Delete File (legacy endpoint for files that are not folders).
exports.deleteFile = async (req, res) => {
  const _id = req.fields._id;
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  let user = await db.collection('users').findOne({ _id: ObjectId(req.session.user._id) });
  user.uploaded = fileHelper.removeFileReturnUpdated(user.uploaded, _id, fileSystem);
  await db.collection('users').updateOne(
    { _id: ObjectId(req.session.user._id) },
    { $set: { uploaded: user.uploaded } }
  );
  res.redirect(req.header('Referer') || '/');
};

// Download File endpoint.
exports.downloadFile = async (req, res) => {
  const _id = req.fields._id;
  const db = req.app.get('database');
  // Check if file is shared publicly.
  let link = await db.collection('public_links').findOne({ "file._id": ObjectId(_id) });
  if (link) {
    fileSystem.readFile(link.file.filePath, function(err, data) {
      if (err) return res.json({ status: "error", message: "File read error." });
      res.json({
        status: "success",
        message: "Data fetched.",
        arrayBuffer: data,
        fileType: link.file.type,
        fileName: link.file.name
      });
    });
    return;
  }
  if (req.session.user) {
    let user = await db.collection('users').findOne({ _id: ObjectId(req.session.user._id) });
    let fileUploaded = fileHelper.recursiveGetFile(user.uploaded, _id);
    if (!fileUploaded) {
      return res.json({ status: "error", message: "File is not accessible." });
    }
    fileSystem.readFile(fileUploaded.filePath, function(err, data) {
      if (err) return res.json({ status: "error", message: "File read error." });
      res.json({
        status: "success",
        message: "Data fetched.",
        arrayBuffer: data,
        fileType: fileUploaded.type,
        fileName: fileUploaded.name
      });
    });
  } else {
    res.json({ status: "error", message: "Please login to perform this action." });
  }
};

// Render "Shared With Me" view.
exports.getSharedWithMe = async (req, res) => {
  res.render("sharedWithMe", { request: req });
};

// Render "My Shared Links" view.
exports.getMySharedLinks = async (req, res) => {
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  const links = await db.collection("public_links").find({ "uploadedBy._id": ObjectId(req.session.user._id) }).toArray();
  res.render("mySharedLinks", { request: req, links: links });
};

// Delete a public share link.
exports.deleteLink = async (req, res) => {
  const _id = req.fields._id;
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  let link = await db.collection("public_links").findOne({
    $and: [{ "uploadedBy._id": ObjectId(req.session.user._id) }, { "_id": ObjectId(_id) }]
  });
  if (!link) {
    req.session.status = "error";
    req.session.message = "Link does not exist.";
    return res.redirect(req.header("Referer") || "/");
  }
  await db.collection("public_links").deleteOne({
    $and: [{ "uploadedBy._id": ObjectId(req.session.user._id) }, { "_id": ObjectId(_id) }]
  });
  req.session.status = "success";
  req.session.message = "Link deleted.";
  res.redirect(req.header("Referer") || "/");
};

// Render "Shared Via Link" view.
exports.getSharedViaLink = async (req, res) => {
  const hash = req.params.hash;
  const db = req.app.get('database');
  let link = await db.collection("public_links").findOne({ hash: hash });
  if (!link) {
    req.session.status = "error";
    req.session.message = "Link expired.";
    return res.render("sharedViaLink", { request: req });
  }
  res.render("sharedViaLink", { request: req, link: link });
};

// Generate a shareable link for a file.
exports.shareViaLink = async (req, res) => {
  const _id = req.fields._id;
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  let file = fileHelper.recursiveGetFile(user.uploaded, _id);
  if (!file) {
    req.session.status = "error";
    req.session.message = "File does not exist.";
    return res.redirect(req.header("Referer") || "/");
  }
  bcrypt.hash(file.name, 10, async function(err, hash) {
    if (err) {
      req.session.status = "error";
      req.session.message = "Error generating link.";
      return res.redirect(req.header("Referer") || "/");
    }
    hash = hash.substring(10, 20);
    const linkUrl = req.mainURL + "/SharedViaLink/" + hash;
    await db.collection("public_links").insertOne({
      hash: hash,
      file: file,
      uploadedBy: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      createdAt: new Date().getTime()
    });
    req.session.status = "success";
    req.session.message = "Share link: " + linkUrl;
    res.redirect(req.header("Referer") || "/");
  });
};

// Search for files/folders.
exports.searchFiles = async (req, res) => {
  const search = req.query.search;
  if (!req.session.user) return res.redirect('/Login');
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  let fileUploaded = fileHelper.recursiveSearch(user.uploaded, search);
  let fileShared = fileHelper.recursiveSearchShared(user.sharedWithMe, search);
  if (!fileUploaded && !fileShared) {
    req.status = "error";
    req.message = "No matching file or folder found.";
    return res.render("search", { request: req });
  }
  let file = fileUploaded ? fileUploaded : fileShared;
  file.isShared = !fileUploaded;
  res.render("search", { request: req, file: file });
};

/* ---------------------- New API Endpoints for CRUD and Drag-and-Drop ---------------------- */

// Create Folder endpoint.
// If a parentId is provided, creates a subfolder; otherwise creates the folder in root.
exports.createFolder = async (req, res) => {
  if (!req.session.user) return res.json({ status: "error", message: "Unauthorized" });
  const { parentId, folderName } = req.fields;
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  
  let folderObj = {
    _id: new ObjectId(),
    name: folderName,
    size: 0,
    type: "folder",
    filePath: "",
    createdAt: new Date().getTime(),
    files: []
  };

  if (parentId) {
    let updated = fileHelper.addFolderToParent(user.uploaded, parentId, folderObj);
    if (!updated) return res.json({ status: "error", message: "Parent folder not found." });
  } else {
    user.uploaded.push(folderObj);
  }

  await db.collection("users").updateOne(
    { _id: ObjectId(req.session.user._id) },
    { $set: { uploaded: user.uploaded } }
  );
  return res.json({ status: "success", folder: folderObj });
};

// Rename Item endpoint.
// Renames either a file or folder given its itemId.
exports.renameItem = async (req, res) => {
  if (!req.session.user) return res.json({ status: "error", message: "Unauthorized" });
  const { itemId, newName } = req.fields;
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  let updated = fileHelper.renameItem(user.uploaded, itemId, newName);
  if (!updated) return res.json({ status: "error", message: "Item not found." });
  await db.collection("users").updateOne(
    { _id: ObjectId(req.session.user._id) },
    { $set: { uploaded: user.uploaded } }
  );
  return res.json({ status: "success", message: "Renamed successfully." });
};

// Delete Item endpoint.
// Deletes a file or folder given its itemId.
exports.deleteItem = async (req, res) => {
  if (!req.session.user) return res.json({ status: "error", message: "Unauthorized" });
  const { itemId } = req.fields;
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  let updated = fileHelper.deleteItem(user.uploaded, itemId, fileSystem);
  if (!updated) return res.json({ status: "error", message: "Item not found." });
  await db.collection("users").updateOne(
    { _id: ObjectId(req.session.user._id) },
    { $set: { uploaded: user.uploaded } }
  );
  return res.json({ status: "success", message: "Deleted successfully." });
};

// Get Directory Structure endpoint.
// Returns the complete directory tree for the current user.
exports.getDirectoryStructure = async (req, res) => {
  if (!req.session.user) return res.json({ status: "error", message: "Unauthorized" });
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  return res.json({ status: "success", directory: user.uploaded });
};

// Move Item endpoint.
// Implements drag-and-drop functionality by moving an item (file or folder)
// from its current location to a target folder (if targetFolderId is provided)
// or to the root if targetFolderId is empty.
exports.moveItem = async (req, res) => {
  if (!req.session.user) return res.json({ status: "error", message: "Unauthorized" });
  const { itemId, targetFolderId } = req.fields;
  const db = req.app.get('database');
  let user = await db.collection("users").findOne({ _id: ObjectId(req.session.user._id) });
  
  let updated = fileHelper.moveItem(user.uploaded, itemId, targetFolderId);
  if (!updated)
    return res.json({ status: "error", message: "Move operation failed. Check item and target folder." });
  
  await db.collection("users").updateOne(
    { _id: ObjectId(req.session.user._id) },
    { $set: { uploaded: user.uploaded } }
  );
  return res.json({ status: "success", message: "Item moved successfully." });
};
