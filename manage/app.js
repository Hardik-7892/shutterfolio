var photos = [];
var fileSha = null;
var pendingImage = null;
var dirty = false;

const MAX_TITLE_LEN = 100;
const MAX_CATEGORY_LEN = 50;
const MAX_DESCRIPTION_LEN = 500;
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'];
const MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'video/mp4': [[0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x00, 0x6D, 0x6F, 0x6F, 0x76]],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
  'video/quicktime': [[0x00, 0x00, 0x00, 0x00, 0x66, 0x74, 0x79, 0x70]]
};

function sanitizeFilename(filename) {
  var parts = filename.split('.');
  var ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
  if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) ext = 'bin';
  var name = parts.slice(0, -1).join('.').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
  return name + '.' + ext;
}

function validateMagicBytes(buffer, mimeType) {
  var signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;
  var bytes = new Uint8Array(buffer.slice(0, 12));
  for (var i = 0; i < signatures.length; i++) {
    var sig = signatures[i];
    var match = true;
    for (var j = 0; j < sig.length; j++) {
      if (sig[j] !== null && bytes[j] !== sig[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

async function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is ' + (MAX_FILE_SIZE / 1024 / 1024) + 'MB.');
  }
  if (ALLOWED_MIME_TYPES.indexOf(file.type) === -1) {
    throw new Error('File type not allowed. Allowed: images (JPEG, PNG, WebP, GIF) and videos (MP4, WebM, MOV).');
  }
  var buffer = await file.arrayBuffer();
  if (!validateMagicBytes(buffer, file.type)) {
    throw new Error('File content does not match its type. Possible corrupt or malicious file.');
  }
  return true;
}

async function loadGallery() {
  showStatus('Loading...', 'loading');
  document.getElementById('status-text').textContent = 'Connecting...';
  document.getElementById('error-container').style.display = 'none';

  try {
    var res = await fetch('/api/gallery');
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'HTTP ' + res.status);
    }
    var data = await res.json();
    fileSha = data.sha;
    photos = data.photos || [];
    document.getElementById('status-text').textContent = 'Connected';
    showStatus('', '');
    document.getElementById('toolbar').style.display = 'flex';
    renderPhotos();
  } catch (err) {
    document.getElementById('status-text').textContent = 'Error';
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('error-container').style.display = 'block';
    document.getElementById('photo-grid').innerHTML = '';
    document.getElementById('loading-state').style.display = 'none';
    showStatus('', '');
  }
}

function renderPhotos() {
  var grid = document.getElementById('photo-grid');
  grid.innerHTML = '';

  if (photos.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h2>No photos</h2><p>Click "Add Photo" to get started.</p></div>';
    return;
  }

  photos.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

  photos.forEach(function(photo, index) {
    var card = document.createElement('div');
    card.className = 'admin-card';
    card.draggable = true;
    card.dataset.index = index;

    var title = escapeHtml(photo.title || 'Untitled');
    var cat = escapeHtml(photo.category || 'Uncategorized');
    var imgSrc = photo.image || '';

    card.innerHTML =
      '<div class="drag-handle">&#x2630;</div>' +
      '<img src="' + imgSrc + '" alt="' + title + '" loading="lazy" onerror="this.parentElement.classList.add(\'img-error\');this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23eee%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23999%22 x=%22200%22 y=%22150%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo image%3C/text%3E%3C/svg%3E\'" />' +
      '<div class="card-body">' +
        '<h4>' + title + '</h4>' +
        '<span class="category-tag">' + cat + '</span>' +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="btn btn-outline" onclick="editPhoto(' + index + ')">Edit</button>' +
        '<button class="btn btn-danger" onclick="deletePhoto(' + index + ')">Delete</button>' +
      '</div>';

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    grid.appendChild(card);
  });
}

var dragSrcIndex = null;

function setDirty(val) {
  dirty = val;
  var btn = document.getElementById('save-btn');
  if (dirty) {
    btn.textContent = 'Save Changes \u2605';
    btn.style.outline = '2px solid #e67e22';
    btn.style.outlineOffset = '2px';
  } else {
    btn.textContent = 'Save Changes';
    btn.style.outline = 'none';
    btn.style.outlineOffset = '0';
  }
}

function handleDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  var targetIndex = parseInt(this.dataset.index);
  if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
    var moved = photos.splice(dragSrcIndex, 1)[0];
    photos.splice(targetIndex, 0, moved);
    photos.forEach(function(p, i) { p.order = i + 1; });
    renderPhotos();
    setDirty(true);
  }
  dragSrcIndex = null;
}

function handleDragEnd() {
  this.classList.remove('dragging');
  var overs = document.querySelectorAll('.drag-over');
  for (var i = 0; i < overs.length; i++) { overs[i].classList.remove('drag-over'); }
}

function openAddModal() {
  document.getElementById('modal-title').textContent = 'Add Photo';
  document.getElementById('edit-id').value = '';
  document.getElementById('edit-index').value = '';
  document.getElementById('photo-title').value = '';
  document.getElementById('photo-category').value = '';
  document.getElementById('photo-description').value = '';
  document.getElementById('preview-container').style.display = 'none';
  document.getElementById('save-photo-btn').textContent = 'Add Photo';
  pendingImage = null;
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('photo-title').focus();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  pendingImage = null;
}

function editPhoto(index) {
  var photo = photos[index];
  document.getElementById('modal-title').textContent = 'Edit Photo';
  document.getElementById('edit-id').value = photo.id || '';
  document.getElementById('edit-index').value = index;
  document.getElementById('photo-title').value = photo.title || '';
  document.getElementById('photo-category').value = photo.category || '';
  document.getElementById('photo-description').value = photo.description || '';
  document.getElementById('save-photo-btn').textContent = 'Save Changes';
  pendingImage = null;

  if (photo.image) {
    document.getElementById('preview-img').src = photo.image;
    document.getElementById('preview-container').style.display = 'block';
  } else {
    document.getElementById('preview-container').style.display = 'none';
  }

  document.getElementById('modal').style.display = 'flex';
  document.getElementById('photo-title').focus();
}

function deletePhoto(index) {
  var photo = photos[index];
  if (!confirm('Delete "' + (photo.title || 'Untitled') + '"?')) return;
  photos.splice(index, 1);
  photos.forEach(function(p, i) { p.order = i + 1; });
  renderPhotos();
  setDirty(true);
}

async function savePhoto() {
  var title = sanitizeInput(document.getElementById('photo-title').value, MAX_TITLE_LEN);
  var category = sanitizeInput(document.getElementById('photo-category').value, MAX_CATEGORY_LEN);
  var description = sanitizeInput(document.getElementById('photo-description').value, MAX_DESCRIPTION_LEN);
  var editId = document.getElementById('edit-id').value;
  var editIndex = document.getElementById('edit-index').value;
  var isEdit = editIndex !== '';

  if (!title) return alert('Please enter a title.');
  if (!category) return alert('Please enter a category.');

  var imagePath = null;

  if (pendingImage) {
    var btn = document.getElementById('save-photo-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading image...';
    try {
      var base64 = await fileToBase64(pendingImage);
      var res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingImage.name,
          type: pendingImage.type,
          content: base64
        })
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        throw new Error(err.error || 'Upload failed');
      }
      var data = await res.json();
      imagePath = data.path;
    } catch (err) {
      alert(sanitizeError(err));
      btn.disabled = false;
      btn.textContent = isEdit ? 'Save Changes' : 'Add Photo';
      return;
    }
    btn.disabled = false;
  }

  if (isEdit) {
    var idx = parseInt(editIndex);
    photos[idx].title = title;
    photos[idx].category = category;
    photos[idx].description = description;
    if (imagePath) photos[idx].image = imagePath;
  } else {
    if (!imagePath) return alert('Please select an image.');
    photos.push({
      id: generateId(title),
      title: title,
      image: imagePath,
      category: category,
      description: description,
      order: photos.length + 1
    });
  }

  renderPhotos();
  closeModal();
  setDirty(true);
}

function removeImage() {
  pendingImage = null;
  document.getElementById('preview-container').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  loadGallery();

  var uploadZone = document.getElementById('upload-zone');
  var fileInput = document.getElementById('file-input');

  uploadZone.addEventListener('click', function() {
    fileInput.click();
  });

  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', function() {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  });

  fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) {
      handleFile(fileInput.files[0]);
      fileInput.value = '';
    }
  });
});

async function handleFile(file) {
  try {
    await validateFile(file);
    pendingImage = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
  } catch (err) {
    alert(err.message);
  }
}

async function saveChanges() {
  var btn = document.getElementById('save-btn');
  btn.disabled = true;
  showStatus('Saving...', 'loading');

  try {
    photos.forEach(function(p, i) { p.order = i + 1; });

    var cleanPhotos = photos.map(function(p) {
      var cp = {};
      for (var key in p) {
        if (p.hasOwnProperty(key) && p[key] !== undefined && p[key] !== null && p[key] !== '') {
          cp[key] = p[key];
        }
      }
      return cp;
    });

    var res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: cleanPhotos, sha: fileSha })
    });

    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'Save failed');
    }

    var data = await res.json();
    fileSha = data.sha;
    setDirty(false);
    showStatus('Saved successfully!', 'success');
    setTimeout(function() { showStatus('', ''); }, 3000);
  } catch (err) {
    showStatus(sanitizeError(err), 'error');
  }

  btn.disabled = false;
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      resolve(reader.result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeError(err) {
  var msg = err && err.message ? err.message : String(err);
  if (msg.indexOf('401') !== -1 || msg.indexOf('Unauthorized') !== -1 || msg.indexOf('Bad credentials') !== -1) {
    return 'Authentication failed. Check your Vercel environment variables.';
  }
  if (msg.indexOf('403') !== -1 || msg.indexOf('Forbidden') !== -1) {
    return 'Permission denied. Check your GitHub PAT token scope.';
  }
  if (msg.indexOf('404') !== -1 || msg.indexOf('Not Found') !== -1) {
    return 'Repository not found. Check your Vercel environment variables.';
  }
  if (msg.indexOf('Network') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
    return 'Network error. Check your connection.';
  }
  return msg || 'An error occurred. Please try again.';
}

function showStatus(msg, type) {
  var el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = 'save-status' + (type ? ' ' + type : '');
}

function generateId(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40) || 'photo-' + Date.now();
}

function sanitizeInput(str, maxLen) {
  if (typeof str !== 'string') return '';
  var trimmed = str.trim();
  if (maxLen && trimmed.length > maxLen) trimmed = trimmed.substring(0, maxLen);
  var div = document.createElement('div');
  div.textContent = trimmed;
  return div.innerHTML;
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function adminLogout() {
  window.location.href = 'https://log:out@' + window.location.host + '/';
}
