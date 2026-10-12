#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
script_path="$root/deploy/vps-production/prune-old-hrp-images.sh"
workflow_path="$root/.github/workflows/deploy-vps.yml"
current_ref=ghcr.io/nobita6986/hrpartner:0123456789012345678901234567890123456789
rollback_ref=ghcr.io/nobita6986/hrpartner:rollback-0123456789012345678901234567890123456789
previous_id="$(printf 'sha256:%064d' 2)"

(
  removed_refs=()
  rollback_mismatch=false
  docker() {
    case "$1 $2" in
      'image inspect')
        case "$5" in
          "$current_ref") printf 'sha256:%064d\n' 1 ;;
          "$rollback_ref")
            if $rollback_mismatch; then printf 'sha256:%064d\n' 9; else printf '%s\n' "$previous_id"; fi
            ;;
          old-a) printf 'sha256:%064d\n' 3 ;;
          old-b) printf 'sha256:%064d\n' 4 ;;
          *) return 1 ;;
        esac
        ;;
      'image ls')
        [[ $5 == 'ghcr.io/nobita6986/hrpartner' ]] || { echo 'image listing escaped HRP repository scope' >&2; return 1; }
        printf '%s\n' "$current_ref" "$rollback_ref" old-a old-b
        ;;
      'image rm') removed_refs+=("$3") ;;
      'image prune') echo 'global image prune must not be used' >&2; return 1 ;;
      *) echo "unexpected docker command: $*" >&2; return 1 ;;
    esac
  }

  source "$script_path" "$current_ref" "$previous_id" "$rollback_ref"
  [[ ${removed_refs[*]} == 'old-a old-b' ]] || { echo "unexpected removals: ${removed_refs[*]}" >&2; exit 1; }

  removed_refs=()
  rollback_mismatch=true
  prune_old_hrp_images "$current_ref" "$previous_id" "$rollback_ref" 2>/dev/null
  [[ ${#removed_refs[@]} -eq 0 ]] || { echo 'cleanup proceeded with a mismatched rollback tag' >&2; exit 1; }
)

bash "$script_path" ghcr.io/other/image:0123456789012345678901234567890123456789 "$previous_id" ghcr.io/other/image:rollback-0123456789012345678901234567890123456789 2>/dev/null && {
  echo 'non-HRP image repository should be rejected' >&2
  exit 1
}

grep -Fq "docker inspect --format '{{.Image}}' hrp-app" "$workflow_path"
grep -Fq 'docker image tag' "$workflow_path"
grep -Fq 'bash -s --' "$workflow_path"
capture_line=$(grep -nF "docker inspect --format '{{.Image}}' hrp-app" "$workflow_path" | cut -d: -f1)
tag_line=$(grep -nF 'docker image tag' "$workflow_path" | cut -d: -f1)
deploy_line=$(grep -nF 'sudo -n /opt/hrp/deploy-production.sh' "$workflow_path" | cut -d: -f1)
cleanup_line=$(grep -nF 'bash -s --' "$workflow_path" | cut -d: -f1)
[[ $capture_line -lt $tag_line && $tag_line -lt $deploy_line && $deploy_line -lt $cleanup_line ]] || {
  echo 'workflow must capture and tag rollback image, deploy, then clean old images' >&2
  exit 1
}

echo 'prune-old-hrp-images: PASS'
