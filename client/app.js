// Get notes from the server
async function getNotes() {
  try {
    const response = await fetch('http://localhost:3000/api/notes');
    const notes = await response.json();
    const noteList = document.getElementById('note-list');
    noteList.innerHTML = '';
    notes.forEach(note => {
      const li = document.createElement('li');
      li.innerHTML = `
        <h3>${note.title}</h3>
        <p>${note.content}</p>
        <button class="delete-btn" data-id="${note._id}">Delete</button>
        <button class="edit-btn" data-id="${note._id}">Edit</button>
      `;
      noteList.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to retrieve notes:', error);
  }
}

// Create a new note
async function createNote(note) {
  try {
    await fetch('http://localhost:3000/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(note)
    });
    getNotes();
  } catch (error) {
    console.error('Failed to create note:', error);
  }
}

// Update a note
async function updateNote(noteId, updatedNote) {
  try {
    await fetch(`http://localhost:3000/api/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedNote)
    });
    getNotes();
  } catch (error) {
    console.error('Failed to update note:', error);
  }
}

// Delete a note
async function deleteNote(noteId) {
  try {
    await fetch(`http://localhost:3000/api/notes/${noteId}`, {
      method: 'DELETE'
    });
    getNotes();
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

// Event listener for form submission
const createNoteForm = document.getElementById('create-note-form');
createNoteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('title-input');
  const contentInput = document.getElementById('content-input');
  const note = {
    title: titleInput.value.trim(),
    content: contentInput.value.trim()
  };

  const noteId = createNoteForm.getAttribute('data-id');
  if (noteId) {
    // Update existing note
    await updateNote(noteId, note);
    createNoteForm.removeAttribute('data-id');
    const submitButton = createNoteForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Create Note';
  } else {
    // Create new note
    await createNote(note);
  }

  titleInput.value = '';
  contentInput.value = '';
});

// Event listener for delete and edit buttons
const noteList = document.getElementById('note-list');
noteList.addEventListener('click', async (e) => {
  const target = e.target;
  if (target.classList.contains('delete-btn')) {
    const noteId = target.getAttribute('data-id');
    await deleteNote(noteId);
  } else if (target.classList.contains('edit-btn')) {
    const noteId = target.getAttribute('data-id');
    const noteElement = target.closest('li');
    const titleElement = noteElement.querySelector('h3');
    const contentElement = noteElement.querySelector('p');
    const title = titleElement.textContent.trim();
    const content = contentElement.textContent.trim();

    
    createNoteForm.setAttribute('data-id', noteId);

    
    titleInput.value = title;
    contentInput.value = content;

    // Update Note
    const submitButton = createNoteForm.querySelector('button[type="submit"]');
    submitButton.textContent = 'Update Note';
  }
});

// Start the application
getNotes();