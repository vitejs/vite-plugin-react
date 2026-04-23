
#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <react-version>" >&2
  exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
  echo "yq is required to update pnpm-workspace.yaml" >&2
  exit 1
fi

react_version=$1
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "$script_dir/.." && pwd)

yq -i "
  .overrides.react = \"$react_version\" |
  .overrides[\"react-dom\"] = \"$react_version\" |
  .overrides[\"react-server-dom-webpack\"] = \"$react_version\"
" "$repo_root/pnpm-workspace.yaml"
