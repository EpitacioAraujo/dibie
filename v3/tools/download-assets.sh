#!/usr/bin/env bash
# Baixa as imagens geradas no Replicate para v3/src/assets/img/.
# ATENÇÃO: URLs do replicate.delivery expiram (~1h após a geração) — rode logo.
# Uso: bash v3/tools/download-assets.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)/src/assets/img"
mkdir -p "$DIR"
cd "$DIR"

dl() { echo "→ $1"; curl -fsSL -o "$1" "$2"; }

# tiles do mosaico (1:1)
dl tile-01.webp "https://replicate.delivery/yhqm/WV0Emw19lPrZK9oZac7YA6oCYPfQk8BzJj8qVJhFfjhYe89tA/out-0.webp"
dl tile-02.webp "https://replicate.delivery/yhqm/w7dImKD1AgZrAJCpxizcFjkfYGLcGYzM97X0LKCOiXWTQfetA/out-0.webp"
dl tile-03.webp "https://replicate.delivery/xezq/uQ769DHITyrpCRHeQgu7AV4xfedQtYH1YCW65zHDf6o3557bB/out-0.webp"
dl tile-04.webp "https://replicate.delivery/yhqm/u1JriWcudWK9KRlqwZmTapVM8qzLr7x6HFPhf1XroAfpe89tA/out-0.webp"
dl tile-05.webp "https://replicate.delivery/yhqm/4jsycWqFhJ6mFJWhZlf44JWQ6tiWGcYYPg8BT5PtqEGaPfetA/out-0.webp"
dl tile-06.webp "https://replicate.delivery/xezq/oez3iwWrK33DH6QJhrFzKD7GXDHee4bsgKTyqNkhzgvf757bB/out-0.webp"
dl tile-07.webp "https://replicate.delivery/yhqm/Yeo7VFZvtL1Ubq1zo0VUUfTwqpEfTEnCZ4Cf5qvXZHeFG033C/out-0.webp"
dl tile-08.webp "https://replicate.delivery/xezq/YfdbSCfRROplPkfBcouRhoInPgT8jJZTemq96L5eu5Hc5z33C/out-0.webp"
dl tile-09.webp "https://replicate.delivery/yhqm/4KwDbv31riowLFu0ozQO58pFeAgBKHdTBGHAtfTyiXKOf89tA/out-0.webp"
dl tile-10.webp "https://replicate.delivery/yhqm/Hh4FySaZytJEDxVzTpDNvQVOSsNHB4DlhL4jgq4vSgIPovvF/out-0.webp"

# slides do carrossel (16:9)
dl slide-01.webp "https://replicate.delivery/xezq/EklX7saKlV73Fh2LRUtG635PlmueEoNIHN4BJAQduVjLQfetA/out-0.webp"
dl slide-02.webp "https://replicate.delivery/yhqm/Vx92Lf8goSRMBauCVEh4lQrj2UmfLhtPo22J6caWlJL9he9tA/out-0.webp"
dl slide-03.webp "https://replicate.delivery/yhqm/M9sPWrfelBv9u0CqyYnrOfi0aIxBgLfD8oDBt72uYzQwB67bB/out-0.webp"

echo "✔ 13 imagens salvas em $DIR"
