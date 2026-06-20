/* ===================================================================
   Medfinity — Auth page logic
=================================================================== */

const loginForm = document.getElementById('loginForm');
if (loginForm){
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorBox.classList.remove('is-visible');
    btn.disabled = true; btn.textContent = 'Logging in…';

    try {
      const user = await Auth.login(loginForm.username.value.trim(), loginForm.password.value);
      const type = user.user_type === 'pharmacist' ? 'pharmacy' : user.user_type;
      window.location.href = `/pages/${type}_dashboard.html`;
    } catch (err){
      errorBox.textContent = err.message || 'Incorrect username or password.';
      errorBox.classList.add('is-visible');
      btn.disabled = false; btn.textContent = 'Log in';
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm){
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('registerError');
    const btn = document.getElementById('registerBtn');
    errorBox.classList.remove('is-visible');
    btn.disabled = true; btn.textContent = 'Creating account…';

    const payload = {
      first_name: registerForm.first_name.value.trim(),
      last_name: registerForm.last_name.value.trim(),
      username: registerForm.username.value.trim(),
      email: registerForm.email.value.trim(),
      user_type: registerForm.user_type.value,
      password: registerForm.password.value,
    };

    try {
      await Auth.register(payload);
      showToast('Account created — log in to continue.', 'success');
      window.location.href = 'login.html';
    } catch (err){
      errorBox.textContent = err.message || 'Something went wrong creating your account.';
      errorBox.classList.add('is-visible');
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });
}
