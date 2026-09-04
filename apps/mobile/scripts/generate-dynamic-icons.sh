#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mobile_dir="$(cd "$script_dir/.." && pwd)"
project_dir="$(cd "$mobile_dir/../.." && pwd)"
android_res="$mobile_dir/android/app/src/main/res"
ios_icons="$mobile_dir/ios/Aqualino/Images.xcassets"
app_icon_sources="$mobile_dir/src/assets/app-icon/source"
runtime_mascots="$mobile_dir/src/assets/mascot/static"
android_mascots="$mobile_dir/android/app/src/main/res/drawable-nodpi"

mkdir -p "$android_mascots"

render_icon() {
  local source="$1"
  local size="$2"
  local output="$3"

  ffmpeg -nostdin -hide_banner -loglevel error -y \
    -i "$source" \
    -vf "scale=${size}:${size}:flags=lanczos,format=rgb24" \
    -frames:v 1 -threads 1 "$output"
}

for density_and_size in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  density="${density_and_size%%:*}"
  size="${density_and_size##*:}"
  render_icon "$app_icon_sources/aqualino-face-happy.png" "$size" "$android_res/mipmap-$density/ic_launcher_happy.png"
  render_icon "$app_icon_sources/aqualino-face-sad.png" "$size" "$android_res/mipmap-$density/ic_launcher_sad.png"
done

render_ios_set() {
  local source="$1"
  local set_dir="$2"

  while IFS=: read -r filename size; do
    render_icon "$source" "$size" "$set_dir/$filename"
  done <<'EOF'
icon-20@2x.png:40
icon-20@3x.png:60
icon-29@2x.png:58
icon-29@3x.png:87
icon-40@2x.png:80
icon-40@3x.png:120
icon-60@2x.png:120
icon-60@3x.png:180
icon-marketing.png:1024
EOF
}

render_ios_set "$app_icon_sources/aqualino-face-happy.png" "$ios_icons/AppIcon.appiconset"
render_ios_set "$app_icon_sources/aqualino-face-sad.png" "$ios_icons/AppIconSad.appiconset"

render_mascot() {
  local source="$1"
  local basename="$2"
  local png_output="$runtime_mascots/$basename.png"
  local webp_output="$android_mascots/$basename.webp"

  ffmpeg -nostdin -hide_banner -loglevel error -y \
    -i "$source" \
    -vf "scale=512:-2:flags=lanczos" \
    -frames:v 1 -threads 1 "$png_output"
  ffmpeg -nostdin -hide_banner -loglevel error -y \
    -i "$source" \
    -vf "scale=512:-2:flags=lanczos" \
    -c:v libwebp -lossless 1 -compression_level 6 \
    -frames:v 1 -threads 1 "$webp_output"
}

render_mascot "$project_dir/happy_aqualino.png" "aqualino_happy_active"
render_mascot "$project_dir/sad_aqualino.png" "aqualino_sad"
render_mascot "$project_dir/strong_aqualino.png" "aqualino_strong"

cp "$runtime_mascots/aqualino_happy_active.png" \
  "$ios_icons/aqualino_happy_active.imageset/aqualino_happy_active.png"
cp "$runtime_mascots/aqualino_sad.png" \
  "$ios_icons/aqualino_sad.imageset/aqualino_sad.png"
cp "$runtime_mascots/aqualino_strong.png" \
  "$ios_icons/aqualino_strong.imageset/aqualino_strong.png"
