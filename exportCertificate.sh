#!/bin/bash
#
# .SYNOPSIS
# 	pfx exporter for Mac OS X
# .DESCRIPTION
# 	search for a certificate called by your username and export it with passphrase 1234
#

# Params
certificateName=$1 #$USERNAME,
passphrase=$2 #"1234",
exportPath=$3 #"mycert.pfx"

echo "search certificate $certificateName"
KEYCHAIN="$(security find-certificate -c $certificateName | head -1 | cut -d \" -f2)"

echo "found in $KEYCHAIN"
echo "export from certificate to $exportPath"
security export -k $KEYCHAIN -t certs -f pkcs12 -P $passphrase -o $exportPath