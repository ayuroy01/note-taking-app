const API_URL = '/api/notes';

let currentNoteId = null;
let currentNoteType = 'text'; // 'text', 'voice', 'math', 'sticky'
let notesData = [];
let audioBase64 = null;

// Audio Recording State
let mediaRecorder;
let audioChunks = [];

// DOM Elements
const editorPane = document.getElementById('editor-container');
const boardPane = document.getElementById('board-container');
const contentInput = document.getElementById('content-input');
const mathDisplay = document.getElementById('math-display');
const voiceInterface = document.getElementById('voice-interface');
const audioPlayback = document.getElementById('audio-playback');

// Toast
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `[SYSTEM]: ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format Date
function formatTime(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleTimeString() + " " + d.toLocaleDateString();
}

// Fetch Notes
async function getNotes() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Fetch failed');
    notesData = await response.json();
    renderList();
    renderBoard();
  } catch (err) {
    showToast('DB_CONNECTION_FAILED');
  }
}

// Render Sidebar List
function renderList() {
  const list = document.getElementById('note-list');
  list.innerHTML = '';
  const listNotes = notesData.filter(n => n.type !== 'sticky');
  
  if(listNotes.length === 0) {
    list.innerHTML = '<li class="note-item" style="color:#555">NO_DATA_FOUND</li>';
    return;
  }

  listNotes.forEach(note => {
    const li = document.createElement('li');
    li.className = `note-item ${note._id === currentNoteId ? 'active' : ''}`;
    
    li.innerHTML = `
      <div class="note-item-title">${note.title || 'UNTITLED'}</div>
      <div class="note-item-type">TYPE: ${note.type.toUpperCase()}</div>
    `;
    li.addEventListener('click', () => selectNote(note._id));
    list.appendChild(li);
  });
}

// Render Board Canvas (Sticky Notes)
function renderBoard() {
  const canvas = document.getElementById('board-canvas');
  canvas.innerHTML = '';
  const stickyNotes = notesData.filter(n => n.type === 'sticky');

  stickyNotes.forEach(note => {
    const sticky = document.createElement('div');
    sticky.className = 'sticky-note';
    sticky.style.left = `${note.position?.x || 0}px`;
    sticky.style.top = `${note.position?.y || 0}px`;
    
    sticky.innerHTML = `
      <div class="sticky-header" onmousedown="startDrag(event, '${note._id}')">${note.title || 'UNTITLED'}</div>
      <div class="sticky-body">${note.content}</div>
    `;
    
    // Double click body to edit sticky quickly (optional feature)
    canvas.appendChild(sticky);
  });
}

// Views Manager
function switchView(view) {
  document.getElementById('view-list-btn').classList.remove('active');
  document.getElementById('view-board-btn').classList.remove('active');
  
  if (view === 'list') {
    document.getElementById('view-list-btn').classList.add('active');
    editorPane.style.display = 'flex';
    boardPane.style.display = 'none';
  } else {
    document.getElementById('view-board-btn').classList.add('active');
    editorPane.style.display = 'none';
    boardPane.style.display = 'block';
  }
}
document.getElementById('view-list-btn').addEventListener('click', () => switchView('list'));
document.getElementById('view-board-btn').addEventListener('click', () => switchView('board'));

// Dynamic Editor Mode UI
function setEditorMode(type) {
  currentNoteType = type;
  document.getElementById('note-type-label').textContent = `TYPE: ${type.toUpperCase()}_NODE`;
  
  // Reset visibility
  contentInput.style.display = 'block';
  mathDisplay.style.display = 'none';
  voiceInterface.style.display = 'none';
  audioPlayback.style.display = 'none';
  audioBase64 = null;

  if (type === 'math') {
    mathDisplay.style.display = 'block';
  } else if (type === 'voice') {
    contentInput.style.display = 'none'; // Only show title and voice box
    voiceInterface.style.display = 'block';
  } else if (type === 'sticky') {
     // A sticky gets edited in the editor, but displays on the board
  }
}

// Select Note into Editor
function selectNote(id) {
  switchView('list');
  const note = notesData.find(n => n._id === id);
  if (!note) return;
  
  currentNoteId = note._id;
  setEditorMode(note.type || 'text');

  document.getElementById('title-input').value = note.title;
  document.getElementById('content-input').value = note.content;
  document.getElementById('date-stamp').textContent = formatTime(note.createdAt);
  document.getElementById('delete-note-btn').style.display = 'block';

  if (note.type === 'math') {
    renderMath();
  }

  if (note.type === 'voice' && note.audioData) {
    audioBase64 = note.audioData;
    audioPlayback.src = note.audioData;
    audioPlayback.style.display = 'block';
  }

  renderList();
}

// Create New Forms
function initNewNote(type) {
  switchView('list');
  currentNoteId = 'new';
  setEditorMode(type);
  document.getElementById('title-input').value = '';
  document.getElementById('content-input').value = '';
  document.getElementById('date-stamp').textContent = formatTime();
  document.getElementById('delete-note-btn').style.display = 'none';
  
  if(type === 'math') renderMath();
  renderList();
  document.getElementById('title-input').focus();
}

document.getElementById('new-text-btn').addEventListener('click', () => initNewNote('text'));
document.getElementById('new-voice-btn').addEventListener('click', () => initNewNote('voice'));
document.getElementById('new-math-btn').addEventListener('click', () => initNewNote('math'));
document.getElementById('new-sticky-btn').addEventListener('click', () => initNewNote('sticky')); // Edits sticky contents

// Math Notes live rendering
function renderMath() {
  const code = contentInput.value;
  try {
    katex.render(code || 'E = mc^2', mathDisplay, {
      throwOnError: false,
      displayMode: true
    });
  } catch(e) {
    mathDisplay.innerHTML = `<span style="color:red">PARSE_ERR: ${e.message}</span>`;
  }
}
contentInput.addEventListener('input', () => {
  if (currentNoteType === 'math') renderMath();
});

// Voice Notes Logic (MediaRecorder)
document.getElementById('record-btn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        audioBase64 = reader.result;
        audioPlayback.src = audioBase64;
        audioPlayback.style.display = 'block';
        showToast('AUDIO_CAPTURED');
      };
    };

    mediaRecorder.start();
    document.getElementById('recording-status').style.display = 'inline';
    document.getElementById('record-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
  } catch (err) {
    showToast('MIC_ACCESS_DENIED');
  }
});

document.getElementById('stop-btn').addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    document.getElementById('recording-status').style.display = 'none';
    document.getElementById('record-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
    // Release streams
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
});

// Drag & Drop for Board Canvas
let activeStickyId = null;
let offsetX = 0;
let offsetY = 0;

window.startDrag = function(e, id) {
  activeStickyId = id;
  const stickyElement = e.target.parentElement; // The header wrapper
  const rect = stickyElement.getBoundingClientRect();
  const canvasRect = document.getElementById('board-canvas').getBoundingClientRect();
  
  // Calculate relative offset of mouse within the sticky itself
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
};

function onDrag(e) {
  if (!activeStickyId) return;
  const canvasRect = document.getElementById('board-canvas').getBoundingClientRect();
  
  // Calculate new absolute positions relative to the canvas
  let newX = e.clientX - canvasRect.left - offsetX;
  let newY = e.clientY - canvasRect.top - offsetY;

  // Prevent dragging out of bounds (negative)
  if(newX < 0) newX = 0;
  if(newY < 0) newY = 0;
  
  // Update visually temporarily
  const stickyDivs = document.querySelectorAll('.sticky-note');
  // We don't have a direct reference easily so we just re-render on drop, but for smooth dragging we should update inline styles.
  // Easiest is to traverse DOM based on index, but for simplicity we rely on React-like re-render or updating data structure.
  const note = notesData.find(n => n._id === activeStickyId);
  if(note) {
    if(!note.position) note.position = {x:0, y:0};
    note.position.x = newX;
    note.position.y = newY;
    renderBoard(); // Brute force DOM update for now
  }
}

async function endDrag() {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  if (!activeStickyId) return;

  // Persist position mathematically
  const note = notesData.find(n => n._id === activeStickyId);
  if (note) {
    try {
      await fetch(`${API_URL}/${activeStickyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: note.position })
      });
    } catch(err) {} 
  }
  activeStickyId = null;
}

// Upload / Save Note
document.getElementById('save-note-btn').addEventListener('click', async () => {
  const title = document.getElementById('title-input').value.trim();
  const content = document.getElementById('content-input').value.trim();
  
  const payload = { 
    title, 
    content, 
    type: currentNoteType 
  };

  if (currentNoteType === 'voice') payload.audioData = audioBase64;
  if (currentNoteType === 'sticky') {
    // Determine center of canvas if new sticky
    payload.position = {x: 500, y: 500}; // Arbitrary center drop-in
  }

  try {
    if (currentNoteId && currentNoteId !== 'new') {
      const response = await fetch(`${API_URL}/${currentNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error();
      showToast('DATA_SYNCED');
    } else {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error();
      const createdNote = await response.json();
      currentNoteId = createdNote._id;
      if(currentNoteType === 'sticky') {
        showToast('STICKY_NODE_DEPLOYED');
        switchView('board'); // Immediately show the board
      } else {
        showToast('NEW_NODE_CREATED');
      }
    }
    await getNotes();
  } catch (err) {
    showToast('UPLOAD_FAILED');
  }
});

// Purge / Delete Note
document.getElementById('delete-note-btn').addEventListener('click', async () => {
  if (!currentNoteId || currentNoteId === 'new') return;
  if(confirm('INITIATE_PURGE_SEQUENCE?')) {
    try {
      await fetch(`${API_URL}/${currentNoteId}`, { method: 'DELETE' });
      showToast('DATA_PURGED');
      currentNoteId = 'new';
      document.getElementById('title-input').value = '';
      document.getElementById('content-input').value = '';
      await getNotes();
    } catch (err) {}
  }
});

// Auto load
document.addEventListener('DOMContentLoaded', getNotes);