#!/usr/bin/env bash
# Run once, immediately after applying the add_profiles migration (see prisma/migrations/*_add_profiles),
# and before restarting the backend. The migration already rewrote progress_photos.file_path to point at
# {new_profile_id}/{uuid}.ext; this script physically renames the on-disk folders to match, since Postgres
# migrations can't touch the filesystem.
#
# Usage: PGPASSWORD=... move-photo-folders.sh <photos_storage_path> <db_name> [db_user] [db_host]
set -euo pipefail

STORAGE_ROOT="${1:?usage: move-photo-folders.sh <photos_storage_path> <db_name> [db_user] [db_host]}"
DB_NAME="${2:?missing db_name}"
DB_USER="${3:-bodytrack}"
DB_HOST="${4:-localhost}"

if [ ! -d "$STORAGE_ROOT" ]; then
  echo "Storage root $STORAGE_ROOT does not exist, nothing to move." >&2
  exit 1
fi

moved=0
skipped=0

# One "old_account_id new_profile_id" pair per line, for every account that has a primary profile.
while read -r old_id new_id; do
  src="$STORAGE_ROOT/$old_id"
  dst="$STORAGE_ROOT/$new_id"

  if [ ! -d "$src" ]; then
    continue # this account never uploaded a photo
  fi
  if [ "$old_id" = "$new_id" ]; then
    continue # primary profile happened to get the same id as the old account, nothing to move
  fi
  if [ -e "$dst" ]; then
    echo "SKIP: destination $dst already exists (unexpected), leaving $src untouched" >&2
    skipped=$((skipped + 1))
    continue
  fi

  mv "$src" "$dst"
  moved=$((moved + 1))
  echo "moved $src -> $dst"
done < <(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -At -F ' ' -c \
  "SELECT account_id, id FROM profiles WHERE is_primary = true;")

echo "Done: $moved folder(s) moved, $skipped skipped."

if [ "$skipped" -gt 0 ]; then
  echo "WARNING: $skipped folder(s) were skipped, investigate before trusting photo access." >&2
  exit 2
fi
