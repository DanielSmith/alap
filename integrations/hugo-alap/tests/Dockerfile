# SPDX-License-Identifier: Apache-2.0
#
# Build the test site and leave output in /src/public/

FROM hugomods/hugo:latest

WORKDIR /src

COPY site/ .

RUN hugo
