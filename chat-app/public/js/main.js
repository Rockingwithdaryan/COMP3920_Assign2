// Auto-scroll messages to bottom on page load
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('messagesContainer');
  if (container) container.scrollTop = container.scrollHeight;

  // Auto-resize textarea
  const textarea = document.querySelector('.message-form textarea');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
  }
});

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
