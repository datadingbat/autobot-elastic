#!/bin/bash

# Check if the file is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 inventory.ini"
    exit 1
fi

# Input file
INPUT_FILE="$1"

# Read the file, extract [hot_nodes], and process the ansible_host values
output=$(awk '
    BEGIN { in_hot_nodes = 0 }
    /^\[hot_nodes\]/ { in_hot_nodes = 1; next }
    /^\[/ { in_hot_nodes = 0 } 
    in_hot_nodes && /ansible_host=/ {
        match($0, /ansible_host=([^ ]+)/, arr)
        hosts[NR] = arr[1]
    }
    END {
        for (i in hosts) {
            result = result (result ? ", " : "") "\"" hosts[i] ":9220\""
        }
        print "[" result "]"
    }
' "$INPUT_FILE")

# Print the result
echo "$output"

