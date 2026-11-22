#!/usr/bin/env bash
# Downloads the original public-domain / CC recordings from Wikimedia Commons and pushes
# them to the "music-src" branch, so scripts/build-music.mjs can trim and encode them.
# Run from anywhere; it works in a temporary folder and leaves your checkout alone.
set -euo pipefail

REPO="https://github.com/dmiller1006/story-shelf.git"
UA="StoryShelfMusicPicker/0.1 (https://github.com/dmiller1006/story-shelf; personal non-commercial use)"
URLS=(
  "https://upload.wikimedia.org/wikipedia/commons/0/04/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_v._happiness.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/0/06/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/0/0a/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_viii._at_the_fireside.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/1/14/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vi._an_important_event.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/1/1a/Musopen_-_Morning.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/2/2d/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_ii._a_curious_story.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/4/42/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_xiii._the_poet_speaks.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/4/49/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_iv._pleading_child.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/5/5a/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_x._almost_too_serious.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/7/78/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_ix._knight_of_the_hobbyhorse.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/8/8d/Saint-Saens_-_The_Carnival_of_the_Animals_-_02_Poules_et_coqs.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/b/b3/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_iii._blind_man%27s_buff.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/b/bb/Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/c/c0/Rimsky-Korsakov_-_flight_of_the_bumblebee.oga?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/c/c2/Saint-Saens_-_The_Carnival_of_the_Animals_-_07_Aquarium.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/c/ce/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_i._of_foreign_lands_and_peoples.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
  "https://upload.wikimedia.org/wikipedia/commons/f/fa/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_xii._child_falling_asleep.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original"
)

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"
git init -q -b music-src
for url in "${URLS[@]}"; do
  name="$(basename "$url")"
  name="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))' "$name")"
  echo "Downloading $name"
  curl -fsSL --retry 3 -A "$UA" -o "$name" "$url"
  sleep 1
done
git add -A
git -c user.name="$(git config --global user.name || echo story-shelf)" -c user.email="$(git config --global user.email || echo story-shelf@users.noreply.github.com)" \
  commit -q -m "Original recordings for scripts/build-music.mjs (temporary branch)"
git -c http.postBuffer=157286400 push -f "$REPO" music-src
echo "Done: pushed ${#URLS[@]} recordings to the music-src branch."
