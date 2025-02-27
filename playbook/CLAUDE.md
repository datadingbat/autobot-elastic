# CLAUDE.md - AutoBot Elastic Ansible Playbook Guide

## Commands
- Bootstrap cluster (one-time): `ansible-playbook -i inventory.ini deploy_cluster.yml`
- Management interface: `ansible-playbook -i inventory.ini es-toolkit.yml`
- Add node: `ansible-playbook -i inventory.ini tools/add_es.yml`
- Generate cluster summary: `ansible-playbook -i inventory.ini tools/cluster_summary_new.yml`
- Change node role: Select option 2 (Change Service State) > 4 (Change node role) in es-toolkit.yml
- Check inventory: `cat inventory.ini`
- Validate playbook: `ansible-playbook --syntax-check playbook.yml`

## Code Style
- YAML: 2-space indentation, consistent quoting style
- Variables: snake_case with descriptive prefixes (es_*, kibana_*)
- Tasks: Present tense verbs, clear descriptions
- Error handling: Use proper retries and handle_error.yml for failures
- Configuration: Store secrets securely, use defaults/main.yml
- Validation: Always perform checks before destructive operations
- Documentation: Comment complex operations, include example usage

## Project Structure
- roles/: Core functionality components
- tools/: Single-purpose operational scripts
- cluster/: Deployment phases and node configurations

## State Tracking
- Configuration and state stored in ~/.elasticsearch/
- Track deployments with tools/view_tracking.yml
- Set/get state with tools/set_state.yml and tools/get_state.yml
- State files follow tracking_template.yml format
- Cluster summary reports stored in ~/.elasticsearch/cluster_summary_latest.txt
- Previous summaries backed up to ~/.elasticsearch/backups/ with timestamps

## Custom Configuration Tracking
- All custom user configurations stored in ~/.elasticsearch/custom_configurations.yml
- The file captures:
  - Initial deployment settings (paths, versions, etc.)
  - Node-specific configurations (added by add_es.yml)
  - MinIO S3 storage settings (added by minio_setup.yml)
  - All tool operations maintain and update this file
- When adding new nodes with add_es.yml, previously set custom values are displayed
- When tools need information about custom paths, JVM heap sizes, etc., they check this file
- Custom configuration file is backed up before each modification
- Format follows structured YAML with clearly defined sections
- When enhancing tools, always update this file with new custom configurations