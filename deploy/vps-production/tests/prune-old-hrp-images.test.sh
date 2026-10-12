#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
script_path="$root/deploy/vps-production/prune-old-hrp-images.sh"
workflow_path="$root/.github/workflows/deploy-vps.yml"

(
  removed_refs=()
  docker() {
    case "$1 $2" in
      'image inspect')
        case "$5" in
          ghcr.io/nobita6986/hrpartner:*) printf 'sha256:%064d\n' 1 ;;
          current-tag) printf 'sha256:%064d\n' 1 ;;
          previous-tag) printf 'sha256:%064d\n' 2 ;;
          old-a) printf 'sha256:%064d\n' 3 ;;
          old-b) printf 'sha256:%064d\n' 4 ;;
          *) return 1 ;;
        esac
        ;;
      'image ls')
        [[ $5 == 'ghcr.io/nobita6986/hrpartner' ]] || { echo 'image listing escaped HRP repository scope' >&2; return 1; }
        printf '%s\n' current-tag previous-tag old-a old-b
        ;;
      'image rm') removed_refs+=("$3") ;;
      'image prune') echo 'global image prune must not be used' >&2; return 1 ;;
      *) echo "unexpected docker command: $*" >&2; return 1 ;;
    esac
  }

  source "$script_path" ghcr.io/nobita6986/hrpartner:0123456789012345678901234567890123456789 "$(printf 'sha256:%064d' 2)"
  [[ ${removed_refs[*]} == 'old-a old-b' ]] || { echo "unexpected removals: ${removed_refs[*]}" >&2; exit 1; }
)

bash "$script_path" ghcr.io/other/image:0123456789012345678901234567890123456789 "$(printf 'sha256:%064d' 2)" 2>/dev/null && {
  echo 'non-HRP image repository should be rejected' >&2
  exit 1
}

grep -Fq "docker inspect --format '{{.Image}}' hrp-app" "$workflow_path"
grep -Fq 'bash -s --' "$workflow_path"
capture_line=$(grep -nF "docker inspect --format '{{.Image}}' hrp-app" "$workflow_path" | cut -d: -f1)
deploy_line=$(grep -nF 'sudo -n /opt/hrp/deploy-production.sh' "$workflow_path" | cut -d: -f1)
cleanup_line=$(grep -nF 'bash -s --' "$workflow_path" | cut -d: -f1)
[[ $capture_line -lt $deploy_line && $deploy_line -lt $cleanup_line ]] || {
  echo 'workflow must capture rollback image, deploy, then clean old images' >&2
  exit 1
}

echo 'prune-old-hrp-images: PASS'
