# SPDX-License-Identifier: Apache-2.0
#
# Alap + Hugo example — serves the demo site.

FROM hugomods/hugo:latest

WORKDIR /src

COPY hugo.toml .
COPY content/ content/
COPY layouts/ layouts/
COPY static/ static/

EXPOSE 1313

CMD ["hugo", "server", "--bind", "0.0.0.0", "--port", "1313", "--baseURL", "http://localhost:1313/", "--appendPort=false"]
