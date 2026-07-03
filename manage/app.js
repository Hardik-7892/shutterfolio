var photos = [];
var fileSha = null;
var pendingImage = null;

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
    renderPhotos();
  } catch (err) {
    document.getElementById('status-text').textContent = 'Error';
    document.getElementById('error-container').style.display = 'block';
    document.getElementById('photo-grid').innerHTML = '';
    document.getElementById('loading-state').style.display = 'none';
    showStatus('', '');
  }
}

function absImageUrl(path) {
  return path && !path.startsWith('/') && !path.startsWith('http') ? '/' + path : path || '';
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
    var imgSrc = absImageUrl(photo.image);

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
    autoSave();
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
  document.getElementById('photo-featured').checked = false;
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
  document.getElementById('photo-featured').checked = !!photo.featured;
  document.getElementById('save-photo-btn').textContent = 'Save Changes';
  pendingImage = null;

  if (photo.image) {
    document.getElementById('preview-img').src = absImageUrl(photo.image);
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
  autoSave();
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
    photos[idx].featured = document.getElementById('photo-featured').checked;
    if (imagePath) photos[idx].image = imagePath;
  } else {
    if (!imagePath) return alert('Please select an image.');
    photos.push({
      id: generateId(title),
      title: title,
      image: imagePath,
      category: category,
      description: description,
      featured: document.getElementById('photo-featured').checked,
      order: photos.length + 1
    });
  }

  renderPhotos();
  closeModal();
  autoSave();
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

async function autoSave() {
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
    showStatus('Saved', 'success');
    setTimeout(function() { showStatus('', ''); }, 2000);
  } catch (err) {
    showStatus(sanitizeError(err), 'error');
  }
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
  window.location.href = '/manage/logout';
}

// ========== Settings Editor ==========

var settingsData = {};
var settingsSaveTimer = null;

function switchTab(tab) {
  document.getElementById('tab-gallery').classList.toggle('active', tab === 'gallery');
  document.getElementById('tab-settings').classList.toggle('active', tab === 'settings');
  document.getElementById('photo-grid').style.display = tab === 'gallery' ? '' : 'none';
  document.getElementById('add-photo-btn').style.display = tab === 'gallery' ? '' : 'none';
  document.getElementById('settings-form').style.display = tab === 'settings' ? '' : 'none';
  document.getElementById('error-container').style.display = 'none';
  if (tab === 'settings' && !document.getElementById('settings-form').querySelector('.settings-section')) {
    loadSettings();
  }
}

async function loadSettings() {
  document.getElementById('settings-form').innerHTML = '<div class="empty-state" style="margin-top:0"><h2>Loading settings...</h2></div>';
  try {
    var res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    settingsData = await res.json();
    renderSettings();
  } catch (err) {
    document.getElementById('settings-form').innerHTML = '<div class="empty-state" style="margin-top:0"><h2>Failed to load settings</h2><p style="color:var(--empty-text);font-size:0.85rem;margin-top:8px">' + sanitizeError(err) + '</p><button class="btn btn-primary" onclick="loadSettings()" style="margin-top:16px">Retry</button></div>';
  }
}

function renderSettings() {
  var s = settingsData;
  var html = '';

  html += sectionFieldset('Site', function() {
    return field('sett-site-title', 'Title', s.site?.title || '') +
           field('sett-site-desc', 'Description', s.site?.description || '');
  });

  html += sectionFieldset('Photographer', function() {
    return field('sett-photo-name', 'Name', s.photographer?.name || '') +
           field('sett-photo-tagline', 'Tagline', s.photographer?.tagline || '') +
           textarea('sett-photo-bio', 'Bio', s.photographer?.bio || '');
  });

  var heroImg = s.hero?.background || '';
  html += sectionFieldset('Hero', function() {
    return imageField('sett-hero-bg', 'Background Image', heroImg) +
           field('sett-hero-heading', 'Heading (leave blank to use photographer name)', s.hero?.heading || '') +
           field('sett-hero-subheading', 'Subheading (leave blank to use tagline)', s.hero?.subheading || '') +
           field('sett-hero-btn-text', 'Button Text', s.hero?.buttonText || 'View Gallery') +
           field('sett-hero-btn-link', 'Button Link', s.hero?.buttonLink || '#gallery');
  });

  html += sectionFieldset('Social Links', function() {
    var items = '';
    (s.social || []).forEach(function(item, i) {
      items += arrayItem('Social #' + (i + 1), [
        field('sett-social-name-' + i, 'Name', item.name || '', 'name'),
        field('sett-social-url-' + i, 'URL', item.url || '', 'url'),
        field('sett-social-label-' + i, 'Label (short text for contact icons)', item.label || '', 'label')
      ], 'removeSocialItem(this)');
    });
    return items + '<button class="array-add-btn" onclick="addSocialItem()">+ Add Link</button>';
  });

  html += sectionFieldset('Contact', function() {
    return field('sett-contact-email', 'Email', s.contact?.email || '');
  });

  var aboutImg = s.about?.image || '';
  html += sectionFieldset('About', function() {
    return imageField('sett-about-img', 'Image', aboutImg);
  });

  html += sectionFieldset('Services', function() {
    var items = '';
    (s.services || []).forEach(function(item, i) {
      items += arrayItem('Service #' + (i + 1), [
        field('sett-svc-title-' + i, 'Title', item.title || '', 'title'),
        textarea('sett-svc-desc-' + i, 'Description', item.description || '', 'description'),
        iconToggleHtml('svc-' + i, item)
      ], 'removeServiceItem(this)');
    });
    return items + '<button class="array-add-btn" onclick="addServiceItem()">+ Add Service</button>';
  });

  html += sectionFieldset('Testimonials', function() {
    var items = '';
    (s.testimonials || []).forEach(function(item, i) {
      items += arrayItem(item.name || 'Testimonial #' + (i + 1), [
        field('sett-test-name-' + i, 'Name', item.name || '', 'name'),
        textarea('sett-test-text-' + i, 'Text', item.text || '', 'text'),
        iconToggleHtml('test-' + i, item)
      ], 'removeTestimonialItem(this)');
    });
    return items + '<button class="array-add-btn" onclick="addTestimonialItem()">+ Add Testimonial</button>';
  });

  html += sectionFieldset('Instagram', function() {
    return field('sett-insta-username', 'Username', s.instagram?.username || '');
  });

  document.getElementById('settings-form').innerHTML = html;
}

function sectionFieldset(name, contentFn) {
  var id = 'sett-section-' + name.replace(/\s+/g, '-');
  return '<div class="settings-section" id="' + id + '">' +
    '<div class="settings-section-header" onclick="toggleSection(this)">' +
      escapeHtml(name) +
      '<span class="arrow">&#9660;</span>' +
    '</div>' +
    '<div class="settings-section-body">' +
      contentFn() +
    '</div>' +
  '</div>';
}

function toggleSection(header) {
  header.classList.toggle('collapsed');
  var body = header.nextElementSibling;
  if (body) body.classList.toggle('collapsed');
}

function field(id, label, value, dataField) {
  dataField = dataField || id;
  return '<div class="settings-field">' +
    '<label>' + escapeHtml(label) + '</label>' +
    '<input id="' + id + '" data-field="' + dataField + '" value="' + escapeAttr(value) + '" onchange="scheduleSettingsSave()" />' +
  '</div>';
}

function textarea(id, label, value, dataField) {
  dataField = dataField || id;
  return '<div class="settings-field">' +
    '<label>' + escapeHtml(label) + '</label>' +
    '<textarea id="' + id + '" data-field="' + dataField + '" onchange="scheduleSettingsSave()">' + escapeAttr(value) + '</textarea>' +
  '</div>';
}

function imageField(id, label, currentSrc, dataField) {
  var src = currentSrc ? absImageUrl(currentSrc) : '';
  return '<div class="settings-field">' +
    '<label>' + escapeHtml(label) + '</label>' +
    '<div class="upload-zone-sm" onclick="triggerSettingsUpload(\'' + id + '\')">' +
      (src ? 'Click to change image' : 'Click to upload image') +
    '</div>' +
    '<input type="file" accept="image/*" style="display:none" id="' + id + '-file" onchange="handleSettingsImageUpload(event, \'' + id + '\')" />' +
    '<input type="hidden" id="' + id + '" data-field="' + (dataField || id) + '" value="' + escapeAttr(currentSrc) + '" />' +
    (src ? '<div class="preview-sm"><img src="' + src + '" /></div>' : '') +
  '</div>';
}

function iconToggleHtml(prefix, item) {
  var iconType = item.iconType || 'text';
  var iconVal = item.icon || '';
  var colorVal = item.iconColor || '#e74c3c';
  var imgVal = item.iconImage || '';

  var textActive = iconType === 'text' ? 'active' : '';
  var imgActive = iconType === 'image' ? 'active' : '';
  var textVisible = iconType === 'text' ? '' : 'style="display:none"';
  var imgVisible = iconType === 'image' ? '' : 'style="display:none"';

  return '<div class="settings-field">' +
    '<label>Icon Type</label>' +
    '<div class="toggle-group">' +
      '<button type="button" class="toggle-btn ' + textActive + '" onclick="setIconMode(\'' + prefix + '\', \'text\', this)">Text</button>' +
      '<button type="button" class="toggle-btn ' + imgActive + '" onclick="setIconMode(\'' + prefix + '\', \'image\', this)">Image</button>' +
    '</div>' +
    '<input type="hidden" id="' + prefix + '-iconType" data-field="iconType" value="' + escapeAttr(iconType) + '" />' +
  '</div>' +
  '<div id="' + prefix + '-text-fields" class="icon-text-fields" ' + textVisible + '>' +
    '<div class="settings-field" style="display:flex;gap:8px;align-items:end">' +
      '<div style="flex:1"><label>Character</label><input id="' + prefix + '-icon" data-field="icon" value="' + escapeAttr(iconVal) + '" onchange="scheduleSettingsSave()" placeholder="W" /></div>' +
      '<div><label>Color</label><input type="color" id="' + prefix + '-iconColor" data-field="iconColor" value="' + escapeAttr(colorVal) + '" onchange="scheduleSettingsSave()" style="width:60px;height:38px;padding:2px" /></div>' +
    '</div>' +
  '</div>' +
  '<div id="' + prefix + '-image-field" class="icon-image-field" ' + imgVisible + '>' +
    imageField(prefix + '-iconImage', 'Icon Image', imgVal, 'iconImage') +
  '</div>';
}

function setIconMode(prefix, mode, btn) {
  document.getElementById(prefix + '-iconType').value = mode;
  var allBtns = btn.parentNode.querySelectorAll('.toggle-btn');
  allBtns.forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var textFields = document.getElementById(prefix + '-text-fields');
  var imageField = document.getElementById(prefix + '-image-field');
  if (textFields) textFields.style.display = mode === 'text' ? '' : 'none';
  if (imageField) imageField.style.display = mode === 'image' ? '' : 'none';
  scheduleSettingsSave();
}

function arrayItem(label, fieldsHtml, removeHandler) {
  return '<div class="array-item">' +
    '<div class="array-item-header">' +
      '<span class="item-label">' + escapeHtml(label) + '</span>' +
      '<button class="array-item-remove" onclick="' + removeHandler + '">Remove</button>' +
    '</div>' +
    fieldsHtml +
  '</div>';
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function triggerSettingsUpload(id) {
  document.getElementById(id + '-file').click();
}

async function handleSettingsImageUpload(event, id) {
  var file = event.target.files[0];
  if (!file) return;

  try {
    await validateFile(file);
    var formData = new FormData();
    formData.append('file', file);
    var res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'Upload failed');
    }
    var data = await res.json();
    document.getElementById(id).value = data.path;

    var preview = document.getElementById(id).closest('.settings-field').querySelector('.preview-sm');
    if (preview) {
      preview.querySelector('img').src = absImageUrl(data.path);
    } else {
      var container = document.getElementById(id).closest('.settings-field');
      var p = document.createElement('div');
      p.className = 'preview-sm';
      p.innerHTML = '<img src="' + absImageUrl(data.path) + '" />';
      container.appendChild(p);
    }

    scheduleSettingsSave();
  } catch (err) {
    alert(sanitizeError(err));
  }

  event.target.value = '';
}

function scheduleSettingsSave() {
  if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
  showStatus('Unsaved changes...', 'loading');
  settingsSaveTimer = setTimeout(doSaveSettings, 500);
}

async function doSaveSettings() {
  showStatus('Saving...', 'loading');

  try {
    var data = collectAllSettings();
    var res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'Save failed');
    }

    showStatus('Saved', 'success');
    setTimeout(function() { showStatus('', ''); }, 2000);
  } catch (err) {
    showStatus(sanitizeError(err), 'error');
  }
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

function addSocialItem() {
  var data = collectAllSettings();
  data.social = data.social || [];
  data.social.push({ name: '', url: '', label: '' });
  settingsData = data;
  renderSettings();
  scheduleSettingsSave();
}

function removeSocialItem(btn) {
  modifyArray(btn, 'social');
}

function addServiceItem() {
  var data = collectAllSettings();
  data.services = data.services || [];
  data.services.push({ title: '', description: '', iconType: 'text', icon: '', iconColor: '#e74c3c', iconImage: '' });
  settingsData = data;
  renderSettings();
  scheduleSettingsSave();
}

function removeServiceItem(btn) {
  modifyArray(btn, 'services');
}

function addTestimonialItem() {
  var data = collectAllSettings();
  data.testimonials = data.testimonials || [];
  data.testimonials.push({ name: '', text: '', image: '', iconType: 'text', icon: '', iconColor: '#3498db', iconImage: '' });
  settingsData = data;
  renderSettings();
  scheduleSettingsSave();
}

function removeTestimonialItem(btn) {
  modifyArray(btn, 'testimonials');
}

function modifyArray(btn, key) {
  var data = collectAllSettings();
  var arr = data[key];
  if (!arr) return;
  var item = btn.closest('.array-item');
  var container = btn.closest('.settings-section-body');
  var items = container.querySelectorAll('.array-item');
  var idx = Array.prototype.indexOf.call(items, item);
  if (idx === -1) return;
  arr.splice(idx, 1);
  data[key] = arr;
  settingsData = data;
  renderSettings();
  scheduleSettingsSave();
}

function collectAllSettings() {
  return {
    site: {
      title: val('sett-site-title'),
      description: val('sett-site-desc')
    },
    photographer: {
      name: val('sett-photo-name'),
      tagline: val('sett-photo-tagline'),
      bio: val('sett-photo-bio')
    },
    hero: {
      background: val('sett-hero-bg'),
      heading: val('sett-hero-heading'),
      subheading: val('sett-hero-subheading'),
      buttonText: val('sett-hero-btn-text'),
      buttonLink: val('sett-hero-btn-link')
    },
    social: collectSectionArray('sett-section-Social-Links', ['name', 'url', 'label']),
    contact: { email: val('sett-contact-email') },
    about: { image: val('sett-about-img') },
    services: collectSectionArray('sett-section-Services', ['title', 'description', 'iconType', 'icon', 'iconColor', 'iconImage']),
    testimonials: collectSectionArray('sett-section-Testimonials', ['name', 'text', 'image', 'iconType', 'icon', 'iconColor', 'iconImage']),
    instagram: { username: val('sett-insta-username') }
  };
}

function collectSectionArray(sectionId, fields) {
  var section = document.getElementById(sectionId);
  if (!section) return [];
  var items = section.querySelectorAll('.array-item');
  var result = [];
  items.forEach(function(item) {
    var entry = {};
    fields.forEach(function(f) {
      var input = item.querySelector('[data-field="' + f + '"]');
      if (input) entry[f] = input.value;
    });
    if (entry[fields[0]]) result.push(entry);
  });
  return result;
}
