// utils/fileHelper.js
const ObjectId = require('mongodb').ObjectId;

/* ---------- Existing Functions ---------- */

// Recursively searches for a file (non-folder) by its _id.
function recursiveGetFile(files, _id) {
  for (let file of files) {
    if (file.type !== "folder") {
      if (file._id == _id) return file;
    }
    if (file.type === "folder" && file.files && file.files.length > 0) {
      const found = recursiveGetFile(file.files, _id);
      if (found) return found;
    }
  }
  return null;
}

// Recursively adds an uploaded object to a folder matching _id.
function getUpdatedArray(arr, _id, uploadedObj) {
  for (let item of arr) {
    if (item.type === "folder") {
      if (item._id == _id) {
        item.files.push(uploadedObj);
      }
      if (item.files && item.files.length > 0) {
        getUpdatedArray(item.files, _id, uploadedObj);
      }
    }
  }
  return arr;
}

// Recursively removes a file (non-folder) by _id and, if applicable, deletes its file from disk.
function removeFileReturnUpdated(arr, _id, fileSystem) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].type !== "folder" && arr[i]._id == _id) {
      try { fileSystem.unlinkSync(arr[i].filePath); } catch (exp) {}
      arr.splice(i, 1);
      break;
    }
    if (arr[i].type === "folder" && arr[i].files && arr[i].files.length > 0) {
      removeFileReturnUpdated(arr[i].files, _id, fileSystem);
    }
  }
  return arr;
}

// Recursively searches for a file or folder (by name) in the directory structure.
function recursiveSearch(files, query) {
  for (let file of files) {
    if (file.type === "folder") {
      if (file.folderName && file.folderName.toLowerCase().includes(query.toLowerCase())) {
        return file;
      }
      if (file.files && file.files.length > 0) {
        const found = recursiveSearch(file.files, query);
        if (found) {
          if (found.type !== "folder") found.parent = file;
          return found;
        }
      }
    } else {
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        return file;
      }
    }
  }
  return null;
}

// Recursively searches in shared files for a match.
function recursiveSearchShared(files, query) {
  for (let item of files) {
    const file = (typeof item.file === "undefined") ? item : item.file;
    if (file.type === "folder") {
      if (file.folderName && file.folderName.toLowerCase().includes(query.toLowerCase())) {
        return file;
      }
      if (file.files && file.files.length > 0) {
        const found = recursiveSearchShared(file.files, query);
        if (found) {
          if (found.type !== "folder") found.parent = file;
          return found;
        }
      }
    } else {
      if (file.name.toLowerCase().includes(query.toLowerCase())) {
        return file;
      }
    }
  }
  return null;
}

/* ---------- New Functions for CRUD and Drag‐Drop ---------- */

// Searches for a folder with a matching parentId and appends folderObj to its files array.
function addFolderToParent(arr, parentId, folderObj) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]._id.toString() === parentId.toString() && arr[i].type === "folder") {
      arr[i].files = arr[i].files || [];
      arr[i].files.push(folderObj);
      return arr;
    }
    if (arr[i].type === "folder" && arr[i].files && arr[i].files.length > 0) {
      let result = addFolderToParent(arr[i].files, parentId, folderObj);
      if (result) return arr;
    }
  }
  return null;
}

// Recursively searches for an item (file or folder) by its _id and renames it.
function renameItem(arr, itemId, newName) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]._id.toString() === itemId.toString()) {
      arr[i].name = newName;
      return arr;
    }
    if (arr[i].type === "folder" && arr[i].files && arr[i].files.length > 0) {
      let result = renameItem(arr[i].files, itemId, newName);
      if (result) return arr;
    }
  }
  return null;
}

// Recursively searches for an item (file or folder) and deletes it.
// For files, it also deletes the file from disk using fileSystem.unlinkSync.
function deleteItem(arr, itemId, fileSystem) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]._id.toString() === itemId.toString()) {
      if (arr[i].type !== "folder" && arr[i].filePath) {
        try {
          fileSystem.unlinkSync(arr[i].filePath);
        } catch (e) {
          console.error(e);
        }
      }
      arr.splice(i, 1);
      return arr;
    }
    if (arr[i].type === "folder" && arr[i].files && arr[i].files.length > 0) {
      let result = deleteItem(arr[i].files, itemId, fileSystem);
      if (result) return arr;
    }
  }
  return null;
}

// Recursively extracts (removes and returns) an item from the tree.
function extractItem(arr, itemId) {
  let extracted = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]._id.toString() === itemId.toString()) {
      extracted = arr[i];
      arr.splice(i, 1);
      return extracted;
    }
    if (arr[i].type === "folder" && arr[i].files && arr[i].files.length > 0) {
      extracted = extractItem(arr[i].files, itemId);
      if (extracted) return extracted;
    }
  }
  return null;
}

// Moves an item from its current location to a new target folder.
// If targetFolderId is null, the item is moved to the root.
function moveItem(arr, itemId, targetFolderId) {
  // Extract the item from the tree.
  let item = extractItem(arr, itemId);
  if (!item) return null;
  if (targetFolderId) {
    // Append the item to the target folder.
    let result = addFolderToParent(arr, targetFolderId, item);
    if (!result) return null;
  } else {
    // Move to root.
    arr.push(item);
  }
  return arr;
}

module.exports = {
  recursiveGetFile,
  getUpdatedArray,
  removeFileReturnUpdated,
  recursiveSearch,
  recursiveSearchShared,
  addFolderToParent,
  renameItem,
  deleteItem,
  extractItem,
  moveItem
};
