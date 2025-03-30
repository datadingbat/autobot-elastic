# Elasticsearch Cluster Deployment Guide

## Overview

`deploy_cluster.yml` is the primary playbook for bootstrapping a new Elasticsearch cluster. It performs a series of structured deployment phases to ensure a properly configured and operational cluster.

## Prerequisites

- Ubuntu-based hosts (recommended Ubuntu 20.04 LTS or newer)
- SSH access to all nodes
- Properly configured `inventory.ini` file with node groups
- Sudo privileges on all target hosts

## Inventory Structure

Your `inventory.ini` must define the following host groups:

```ini
[master_nodes]
master1 ansible_host=10.0.0.1
master2 ansible_host=10.0.0.2
master3 ansible_host=10.0.0.3

[hot_nodes]
hot1 ansible_host=10.0.0.4
hot2 ansible_host=10.0.0.5

# Optional node types
[frozen_nodes]
frozen1 ansible_host=10.0.0.6

[ml_nodes]
ml1 ansible_host=10.0.0.7

[kibana]
kibana1 ansible_host=10.0.0.8
```

- **master_nodes**: Must have 1 or 3 nodes for proper quorum
- **hot_nodes**: At least 1 hot node is required
- **frozen_nodes**: Optional for cold/frozen tier storage
- **ml_nodes**: Optional for machine learning workloads
- **kibana**: Optional for Kibana dashboard

## Deployment Process

The playbook follows this sequence:

1. **Pre-deployment Validation**
   - Verifies inventory structure
   - Checks node counts (must have 1 or 3 master nodes)
   - Gathers user input for customizations

2. **Common Setup**
   - Configures APT repositories
   - Installs basic prerequisites

3. **Master Node Deployment**
   - Installs Elasticsearch
   - Generates security certificates
   - Configures cluster settings
   - Applies system tuning

4. **Hot Node Deployment**
   - Installs and configures data nodes
   - Joins them to the cluster

5. **Additional Node Types**
   - Deploys frozen nodes (if defined)
   - Deploys ML nodes (if defined)

6. **Kibana Deployment**
   - Installs Kibana (if defined)
   - Configures security settings

7. **Post-Deployment Verification**
   - Validates cluster health
   - Stores deployment information

## Custom Configuration Options

During deployment, you can customize:

- **Installation Method**: APT repository or local package files
- **Version**: Specific version or latest
- **Cluster Name**: Custom name for your cluster
- **Data/Log Paths**: Custom filesystem paths
- **JVM Heap Size**: Customized per node type
- **Security Settings**: Passwords and certificates

All custom configurations are stored in `~/.elasticsearch/custom_configurations.yml` for reference by other tools.

## Usage

```bash
ansible-playbook -i inventory.ini deploy_cluster.yml
```

The playbook is interactive and will prompt for necessary configuration values.

## Configuration Storage

After deployment, the following files are created in the `~/.elasticsearch/` directory:

- `deployment_vars.yml`: Basic deployment variables
- `custom_configurations.yml`: Comprehensive configuration tracking
- `elastic_password.txt`: Generated elastic user password
- `certs/`: Directory containing all security certificates
- Various operation logs and tracking files

## Advanced Configuration

For advanced configurations like security settings, network configurations, and plugin installations, refer to the Elasticsearch documentation and create appropriate customizations during the interactive prompts.

## Troubleshooting

- Check the Elasticsearch logs at `/var/log/elasticsearch/`
- Verify certificate permissions if security issues arise
- Examine systemd logs with `journalctl -u elasticsearch`
- Review `~/.elasticsearch/pre_deploy_summary.txt` for configuration summary