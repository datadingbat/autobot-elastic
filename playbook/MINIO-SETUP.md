# MinIO S3 Storage Setup for Elasticsearch Snapshots

## Overview
This document explains how to set up MinIO S3 storage for Elasticsearch snapshots using the toolkit scripts.

## Components
- **MinIO Server**: Provides S3-compatible object storage
- **MinIO Client**: Command-line tool to interact with the MinIO server

## Installation Methods
1. **Online Installation**: Downloads binaries from the internet
2. **Offline Installation**: Uses pre-downloaded binaries from the controller machine

## Installation Steps

### 1. Setup MinIO Server
This will install the MinIO server on a specified host.

```bash
# Using the dedicated fix script (recommended for offline installation)
ansible-playbook -i inventory.ini tools/fix_minio_server.yml

# Using the toolkit menu
ansible-playbook es-toolkit.yml
# Select option 10 (Setup MinIO Server)
```

### 2. Setup MinIO Client
This will install the MinIO client on target nodes and configure it to connect to the server.

```bash
# Using the dedicated fix script (recommended)
ansible-playbook -i inventory.ini tools/fix_minio_client.yml

# Using the toolkit menu
ansible-playbook es-toolkit.yml
# Select option 11 (Setup MinIO Client)
```

## Configuration Details

### MinIO Server
- Default port: 9000 (API), 9001 (Console)
- Default credentials: minioadmin / minioadmin
- Default data directory: /minio/data

### MinIO Client
- Command-line tool: `mc`
- Default server alias: `minio`
- Default bucket: `elasticsearch-snapshots`

## Endpoints
- MinIO API: http://SERVER_HOST:9000
- MinIO Console: http://SERVER_HOST:9001

## Using with Elasticsearch
To use MinIO for Elasticsearch snapshots, follow these steps:

### 1. Add Credentials to Elasticsearch Keystore
First, add MinIO credentials to the Elasticsearch keystore on all nodes:

```bash
# Add access key to keystore
/usr/share/elasticsearch/bin/elasticsearch-keystore add s3.client.default.access_key

# Add secret key to keystore
/usr/share/elasticsearch/bin/elasticsearch-keystore add s3.client.default.secret_key
```

### 2. Register S3 Repository
Then register the S3 repository with this command in Kibana Dev Tools:

```
PUT _snapshot/minio_repository
{
  "type": "s3",
  "settings": {
    "bucket": "elasticsearch-snapshots",
    "endpoint": "SERVER_HOST.internal:9001",
    "protocol": "http"
  }
}
```

Notes:
- Replace `SERVER_HOST` with the actual hostname of your MinIO server
- The `endpoint` should use the FQDN of your MinIO server if hostname resolution is available
- Omit the `region` setting if you're not using a specific region configuration
- The default port is now 9001

## Troubleshooting
- If the offline installation fails, check if the binary exists on the controller and is accessible
- Use the IP address of the server host for MinIO client configuration if hostname resolution fails
- Verify server is running with: `curl http://SERVER_HOST:9000 -v`
- Check server logs with: `journalctl -u minio`