const params = new URLSearchParams(window.location.search);

document.getElementById('logo').src = params.get('icon') ?? '';
document.getElementById(params.get('view') === 'setup' ? 'setup' : 'starting').hidden = false;

const form = document.getElementById('setup-form');
const errorText = document.getElementById('error');
const saveButton = document.getElementById('save');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  errorText.hidden = true;

  const { error } = await window.pmsDesktop.saveConnection(document.getElementById('connection').value);

  if (error) {
    errorText.textContent = error;
    errorText.hidden = false;
    saveButton.disabled = false;
  }
});
