# SPDX-License-Identifier: Apache-2.0
#
# Alap + Hugo example — serves the demo site.

# hugomods/hugo:std-0.159.1
FROM hugomods/hugo:std-0.159.1@sha256:eb4625b5f980dee278dab7a3b63041135489800db42b8b0c26e04e52ae9fbc4c

WORKDIR /src

COPY hugo.toml .
COPY content/ content/
COPY layouts/ layouts/
COPY static/ static/

EXPOSE 1313

CMD ["hugo", "server", "--bind", "0.0.0.0", "--port", "1313", "--baseURL", "http://localhost:1313/", "--appendPort=false"]
