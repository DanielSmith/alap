# SPDX-License-Identifier: Apache-2.0
#
# Build the test site and leave output in /src/public/

# hugomods/hugo:std-0.159.1
FROM hugomods/hugo:std-0.159.1@sha256:eb4625b5f980dee278dab7a3b63041135489800db42b8b0c26e04e52ae9fbc4c

WORKDIR /src

COPY site/ .

RUN hugo
