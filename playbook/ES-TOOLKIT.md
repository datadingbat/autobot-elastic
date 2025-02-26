# Elasticsearch Management Toolkit

## Overview

`es-toolkit.yml` is a comprehensive interactive management interface for Elasticsearch clusters. It provides a menu-driven approach to common operations, configuration tasks, and maintenance actions for your Elasticsearch deployment.

## Prerequisites

- An existing Elasticsearch cluster deployed with `deploy_cluster.yml`
- SSH access to cluster nodes
- Properly configured `inventory.ini` file
- Sudo privileges on target hosts

## Features

The toolkit provides the following capabilities:

- **Node Management**: Add, remove, and update Elasticsearch nodes
- **Component Management**: Manage Filebeat, Metricbeat, and Kibana components 
- **Monitoring**: Set up monitoring and view cluster status
- **Backup & Snapshots**: Configure MinIO S3 storage for snapshots
- **Maintenance**: Run commands, update keystores, and perform tuning
- **System Status**: Check component status and view logs

## Usage

```bash
ansible-playbook -i inventory.ini es-toolkit.yml
```

This launches an interactive menu-driven interface.

## Main Menu Options

1. **Add Components**: Install new components to your Elasticsearch deployment
   - Add Elasticsearch nodes
   - Add Kibana
   - Add Filebeat
   - Add Metricbeat
   - Add monitoring

2. **Remove Components**: Remove components from your deployment
   - Remove Elasticsearch nodes
   - Remove Kibana
   - Remove Filebeat
   - Remove Metricbeat

3. **Upgrade Components**: Perform version upgrades
   - Upgrade Elasticsearch
   - Upgrade Kibana
   - Upgrade Beats

4. **Backup & Snapshots**: Configure backup solutions
   - Set up MinIO S3 storage
   - Configure snapshot repositories
   - Test backup & restore

5. **Maintenance Operations**: Perform maintenance tasks
   - Run commands on nodes
   - Manage service state (start/stop/restart)
   - Update Elasticsearch keystore
   - Tune performance settings

6. **System Status**: View system status information
   - Check component status
   - View logs
   - Generate cluster summary report
   - Check cluster health

7. **Help**: Display help information about the toolkit

## Configuration Tracking

The toolkit reads from and updates the following configuration files:

- `~/.elasticsearch/custom_configurations.yml`: Central configuration tracking
- `~/.elasticsearch/operations_log.yml`: History of operations
- `~/.elasticsearch/cluster_topology.yml`: Current cluster structure
- `~/.elasticsearch/cluster_summary_latest.txt`: Latest cluster status report

All operations performed through the toolkit update the appropriate tracking files to ensure a consistent record of cluster state and configurations. Previous summary reports are backed up to `~/.elasticsearch/backups/` with timestamps.

## Component-Specific Documentation

### MinIO S3 Snapshot Setup

The toolkit can configure MinIO S3 storage for Elasticsearch snapshots:

1. Installs MinIO server and client components
2. Creates necessary buckets
3. Sets up keystore credentials
4. Configures snapshot repositories

Custom MinIO settings are stored in `~/.elasticsearch/custom_configurations.yml` for future reference.

### Adding Elasticsearch Nodes

When adding new nodes, the toolkit provides:

1. Reference to original deployment configurations
2. Path recommendations based on existing nodes
3. JVM heap size suggestions based on available memory
4. Automatic certificate distribution
5. Node configuration tracking

## Advanced Usage

### Custom Command Execution

The toolkit allows running custom commands across node groups:

```
[Main Menu] > 5. Maintenance Operations > 1. Run Commands
```

This allows executing commands like:

- Adding keystore values
- Running shell commands
- Viewing configuration files

### Performance Tuning

The tuning module provides:

```
[Main Menu] > 5. Maintenance Operations > 4. Tune Performance Settings
```

This allows adjusting:

- JVM heap size
- Thread pool settings
- Cache sizes
- Indexing settings

## Troubleshooting

- If configuration files are missing, the toolkit will regenerate defaults
- Operations are recorded in detail in `~/.elasticsearch/operations_log.yml`
- Use the "View Logs" option to check component logs for issues
- Check `~/.elasticsearch/custom_configurations.yml` for current settings
- Review the latest cluster summary report at `~/.elasticsearch/cluster_summary_latest.txt`

## Cluster Summary Report

The cluster summary report provides a comprehensive overview of your Elasticsearch deployment:

- Service status across all nodes (running, stopped, not installed)
- Hardware resources for each node (CPU, memory, disk)
- Elasticsearch cluster details (when available)
- Node-by-node component status

The report is saved to `~/.elasticsearch/cluster_summary_latest.txt` after each run, and previous reports are automatically backed up with timestamps. You can generate this report from:

```
[Main Menu] > 1/2/5. Service Status > 5. Cluster Summary
```

Or by running the tool directly:

```bash
ansible-playbook -i inventory.ini tools/cluster_summary_new.yml
```