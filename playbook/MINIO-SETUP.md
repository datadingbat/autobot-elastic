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
# Using the toolkit menu (recommended)
ansible-playbook es-toolkit.yml
# Select option 10 (Setup MinIO Server)
```

- You can provide custom credentials (access key and secret key) during installation
- Default credentials if not specified: minioadmin / minioadmin

### 2. Setup MinIO Client
This will install the MinIO client on target nodes and configure it to connect to the server.

```bash
# Using the toolkit menu
ansible-playbook es-toolkit.yml
# Select option 11 (Setup MinIO Client)
```

## Configuration Details

### MinIO Server
- Default port: 9000 (API), 9001 (Console)
- Default credentials: minioadmin / minioadmin (customizable during installation)
- Default data directory: /minio/data

### MinIO Client
- Command-line tool: `mc`
- Default server alias: `minio`
- Default bucket: `elasticsearch-snapshots`

## Endpoints
- MinIO API: http://SERVER_HOST:9000
- MinIO Console: http://SERVER_HOST:9001

## Post-Installation Steps

After MinIO is installed, follow these steps to integrate with Elasticsearch:

### 1. Add Credentials to Elasticsearch Keystore
Use the toolkit to add MinIO credentials to all Elasticsearch nodes:

```bash
# Using the toolkit menu
ansible-playbook es-toolkit.yml
# Select option for "Add Keystore Values" (or similar)
```

This will add the configured access key and secret key to the Elasticsearch keystore on all nodes.

### 2. Restart Elasticsearch Nodes
After adding credentials to the keystore, restart Elasticsearch nodes in the correct order:

```bash
# Using the toolkit menu
ansible-playbook es-toolkit.yml
# Select option for "Restart Services" (or similar)
```

### 3. Register S3 Repository
Register the S3 repository with this command in Kibana Dev Tools:

```
PUT _snapshot/minio_repository
{
  "type": "s3",
  "settings": {
    "bucket": "elasticsearch-snapshots",
    "endpoint": "SERVER_HOST:9000",
    "protocol": "http",
    "path_style_access": true
  }
}
```

**Important Notes:**
- Replace `SERVER_HOST` with the actual hostname or IP of your MinIO server
- The `path_style_access: true` parameter is required
- Do not include spaces in the endpoint URL
- Use port 9000 (API port) not 9001 (Console port)
- You may need to run the repository creation command twice for it to take effect

## Troubleshooting
- Installation details are saved to `~/.elasticsearch/minio_installation.txt` for reference
- Verify server is running with: `curl http://SERVER_HOST:9000 -v`
- Check server logs with: `journalctl -u minio`
- If repository creation fails, verify credentials in keystore and try again
- If using custom credentials, ensure they match what was configured during installation