document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('messagesContainer');
  if (container) {
    container.scrollTop = container.scrollHeight;
    startPolling();
  }

  // Auto-resize textarea
  const textarea = document.querySelector('.message-form textarea');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
  }
});

// ── Auto-polling for new messages ──
function startPolling() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;

  // Get group ID from the message form action e.g. /messages/group/5
  const form = document.querySelector('.message-form');
  if (!form) return;
  const groupId = form.action.split('/').pop();

  setInterval(async () => {
    // Don't reload if user is typing
    const textarea = document.querySelector('.message-form textarea');
    if (textarea && textarea.value.trim() !== '') return;

    try {
      const res = await fetch(`/groups/${groupId}/messages`);
      if (!res.ok) return;
      const html = await res.text();

      // Parse the returned fragment and replace the messages container
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newContainer = doc.getElementById('messagesContainer');
      if (!newContainer) return;

      // Only update if content actually changed
      if (newContainer.innerHTML !== container.innerHTML) {
        const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
        container.innerHTML = newContainer.innerHTML;
        if (wasAtBottom) container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      // Silently ignore network errors during polling
    }
  }, 2500); // Poll every 2.5 seconds
}

// Toggle emoji picker
function toggleEmojiPicker(btn, messageId) {
  const picker = document.getElementById('picker-' + messageId);
  document.querySelectorAll('.emoji-picker').forEach(p => {
    if (p !== picker) p.style.display = 'none';
  });
  picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
}

// Close emoji pickers when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.reactions-row')) {
    document.querySelectorAll('.emoji-picker').forEach(p => p.style.display = 'none');
  }
});

// Submit on Enter, newline on Shift+Enter
function submitOnEnter(event, form) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.submit();
  }
}