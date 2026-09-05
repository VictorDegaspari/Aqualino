<!doctype html>
<html lang="{{ $copy['locale'] }}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><meta name="color-scheme" content="dark">
<title>{{ $copy['title'] }} · Aqualino</title>
<link rel="stylesheet" href="/account-security.css?v={{ filemtime(public_path('account-security.css')) }}">
</head>
<body>
<main class="card">
<div class="orb" aria-hidden="true">💧</div><p class="brand">Aqualino</p>
<p class="eyebrow">{{ $copy['eyebrow'] }}</p><h1 id="heading">{{ $copy['title'] }}</h1>
<p class="intro" id="description">{{ $copy['body'] }}</p>
@if ($action === 'reset' && $validInput)
<form id="reset-form" method="post" action="/api/v1/auth/reset-password" data-token="{{ $token }}" data-endpoint="/api/v1/auth/reset-password">
<label for="email">{{ $copy['email_label'] }}</label><input id="email" name="email" type="email" value="{{ $email }}" readonly required autocomplete="email">
<label for="password">{{ $copy['password_label'] }}</label><input id="password" name="password" type="password" required minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-hint">
<p class="hint" id="password-hint">{{ $copy['password_hint'] }}</p>
<label for="confirmation">{{ $copy['confirmation_label'] }}</label><input id="confirmation" name="password_confirmation" type="password" required minlength="8" maxlength="128" autocomplete="new-password">
<p id="error" class="error" role="alert" hidden></p><button type="submit">{{ $copy['submit'] }}</button>
</form>
@elseif ($action === 'reset')
<p class="error" role="alert">{{ $copy['invalid_reset'] }}</p>
@endif
<a id="open-app" class="{{ $action === 'reset' && $validInput ? 'secondary' : 'button' }}" href="{{ $appUrl }}">{{ $copy['open_app'] }}</a>
<p class="footer">{{ $copy['footer'] }}</p>
</main>
@if ($action === 'reset' && $validInput)
<script>
const copy = {{ Illuminate\Support\Js::from($copy) }};
const form = document.getElementById('reset-form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  const error = document.getElementById('error');
  button.disabled = true; button.textContent = copy.working; error.hidden = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    if (!/\p{L}/u.test(form.password.value) || !/\p{N}/u.test(form.password.value)) {
      error.textContent = copy.password_hint; error.hidden = false; return;
    }
    if (form.password.value !== form.password_confirmation.value) {
      error.textContent = copy.password_mismatch; error.hidden = false; return;
    }
    const response = await fetch(form.dataset.endpoint, {
      method: 'POST', credentials: 'omit', signal: controller.signal,
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify({email: form.email.value, token: form.dataset.token, password: form.password.value, password_confirmation: form.password_confirmation.value}),
    });
    const body = await response.json();
    if (!response.ok) {
      error.textContent = body.error?.code === 'PASSWORD_RESET_INVALID' ? copy.invalid_reset : (Object.values(body.error?.fields ?? {}).flat()[0] || copy.error);
      error.hidden = false;
      return;
    }
    form.reset(); form.removeAttribute('data-token'); form.hidden = true;
    history.replaceState(null, '', location.pathname);
    document.getElementById('heading').textContent = copy.reset_success_title;
    document.getElementById('description').textContent = copy.reset_success;
    document.getElementById('open-app').href = 'aqualino://auth/sign-in';
    document.getElementById('open-app').className = 'button';
  } catch {
    error.textContent = copy.error; error.hidden = false;
  } finally {
    clearTimeout(timeout); button.disabled = false; button.textContent = copy.submit;
  }
});
</script>
@endif
</body></html>
