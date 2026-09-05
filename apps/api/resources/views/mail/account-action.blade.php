<!doctype html>
<html lang="{{ $copy['locale'] }}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ $copy['title'] }}</title></head>
<body style="margin:0;padding:0;background:#061c2b;font-family:Arial,sans-serif;color:#edf7f8;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#061c2b;padding:36px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#102e3b;border:1px solid #477c8c;border-radius:28px;overflow:hidden;">
<tr><td style="padding:34px 30px 12px;text-align:center;"><span style="font-size:42px;">💧</span><div style="font-size:27px;font-weight:800;color:#91c8d1;margin-top:10px;">Aqualino</div><p style="font-size:10px;letter-spacing:2px;color:#e7c478;">{{ $copy['eyebrow'] }}</p></td></tr>
<tr><td style="padding:8px 30px 32px;">
<h1 style="font-size:27px;line-height:1.25;text-align:center;color:#edf7f8;margin:8px 0 24px;">{{ $copy['title'] }}</h1>
<p style="font-size:16px;line-height:1.7;">{{ $copy['greeting'] }}, {{ $name }}!</p>
<p style="font-size:16px;line-height:1.7;color:#c9dedf;">{{ $copy['body'] }}</p>
<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center" style="padding:20px 0;"><a href="{{ $url }}" style="display:inline-block;border-radius:28px;padding:17px 32px;background:#91c8d1;color:#061c2b;font-size:16px;font-weight:bold;text-decoration:none;">{{ $copy['button'] }}</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#c9dedf;">{{ $copy['expiry'] }}</p>
<p style="font-size:13px;line-height:1.6;color:#a1bbc7;">{{ $copy['ignore'] }}</p>
<div style="border-top:1px solid #315d70;margin-top:25px;padding-top:20px;"><p style="font-size:12px;line-height:1.6;color:#a1bbc7;">{{ $copy['fallback'] }}</p><a href="{{ $url }}" style="font-size:12px;line-height:1.6;color:#91c8d1;word-break:break-all;">{{ $url }}</a></div>
</td></tr></table>
<p style="font-size:12px;color:#91c8d1;padding:14px;">{{ $copy['footer'] }}</p>
</td></tr></table>
</body></html>
